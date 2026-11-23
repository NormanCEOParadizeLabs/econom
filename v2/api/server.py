"""YAPR Studio browser beta: authenticated, bounded short-video rendering.
Tokens validated against Supabase Auth; no admin/service-role secrets in client.
"""
from __future__ import annotations
import asyncio
import time
from collections import defaultdict, deque
import json
import logging
import os
import tempfile
import uuid
from pathlib import Path

import httpx
from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.concurrency import run_in_threadpool
from starlette.background import BackgroundTask

from .editor import EditOptions, render, MediaError, STYLE_LOOK

APP_ROOT=Path(__file__).resolve().parents[1]
WEB=APP_ROOT/'web'
SUPABASE_URL=os.environ.get('SUPABASE_URL','').rstrip('/')
SUPABASE_PUBLISHABLE_KEY=os.environ.get('SUPABASE_PUBLISHABLE_KEY','')
MAX_INPUT_BYTES=40*1024*1024
CONCURRENT_LIMIT=1
LIMITER=asyncio.Semaphore(CONCURRENT_LIMIT)
USER_WINDOW=defaultdict(deque)  # best-effort; use shared rate-limit store before production scaling
app=FastAPI(title='YAPR Studio', version='0.9.0', docs_url=None, redoc_url=None)
logging.basicConfig(level=logging.INFO)

@app.middleware('http')
async def security_headers(request:Request,call_next):
    resp=await call_next(request)
    resp.headers['X-Content-Type-Options']='nosniff'
    resp.headers['Referrer-Policy']='strict-origin-when-cross-origin'
    resp.headers['X-Frame-Options']='DENY'
    resp.headers['Permissions-Policy']='camera=(), microphone=(), geolocation=()'
    # No cross-origin API cookies; all private API calls bearer-authenticated.
    if request.url.path.startswith('/api/'):
        resp.headers['Cache-Control']='no-store'
    return resp

async def check_user(authorization:str|None):
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(401,'Connecte-toi pour effectuer un vrai rendu vidéo.')
    token=authorization[7:]
    if len(token)>6000:
        raise HTTPException(401,'Session invalide.')
    try:
        async with httpx.AsyncClient(timeout=13.0) as client:
            r=await client.get(f'{SUPABASE_URL}/auth/v1/user',headers={'apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':'Bearer '+token})
        if r.status_code!=200:raise ValueError('invalid login')
        user=r.json();uid=user.get('id')
        if not uid:raise ValueError('empty identity')
        return uid
    except Exception:
        raise HTTPException(401,'Session expirée ou invalide. Reconnecte-toi.')

@app.get('/api/health')
async def health():
    return {'ok':True,'service':'YAPR Studio','version':'0.9.0','render':'ffmpeg',
            'transcript_alignment':'approximate','external_llm_required':False,
            'premium_ai_director_enabled':False}

@app.get('/api/capabilities')
async def capabilities():
    return {'video_max_mb':40,'duration_max_s':90,'output':'mp4 h264 aac 9:16',
            'supported_styles':list(STYLE_LOOK),'features':['silence_cut','color_grading','audio_compression','manual_captions_approximate'],
            'unsupported':['AI_broll','transitions_auto','speech_alignment','auto_transcription_without_provider']}

@app.post('/api/render')
async def api_render(file:UploadFile=File(...),style:str=Form('impact'),pace:float=Form(.65),
                     caption_text:str=Form(''),use_captions:bool=Form(True),remove_silences:bool=Form(True),
                     quality:str=Form('preview'),rights_attested:bool=Form(False),authorization:str|None=Header(None)):
    uid=await check_user(authorization)
    if not rights_attested:raise HTTPException(403,'Confirme que tu as les droits sur cette vidéo avant le traitement.')
    now=time.monotonic()
    recent=USER_WINDOW[uid]
    while recent and recent[0]<now-3600:recent.popleft()
    if len(recent)>=5:raise HTTPException(429,'Limite de sécurité : cinq rendus par heure et par compte en bêta.')
    recent.append(now)
    if style not in STYLE_LOOK:raise HTTPException(422,'Style non reconnu.')
    if quality not in ('preview','hd'):raise HTTPException(422,'Qualité non reconnue.')
    if not 0<=pace<=1:raise HTTPException(422,'Rythme hors limites.')
    if len(caption_text)>5000:raise HTTPException(422,'Transcription trop longue.')
    ctype=(file.content_type or '').lower()
    if ctype not in ('video/mp4','video/quicktime','video/webm','application/octet-stream'):
        raise HTTPException(415,'Utilise une vidéo MP4, MOV ou WEBM.')
    if LIMITER.locked():
        raise HTTPException(429,'Le moteur traite déjà une vidéo. Relance après la fin du rendu.')
    await LIMITER.acquire()
    temp=tempfile.TemporaryDirectory(prefix='yapr-')
    root=Path(temp.name)
    src=root/'source.bin';dst=root/'result.mp4'
    try:
        size=0
        with src.open('wb') as f:
            while chunk:=await file.read(1024*1024):
                size+=len(chunk)
                if size>MAX_INPUT_BYTES:
                    raise HTTPException(413,'Fichier trop lourd : 40 Mo maximum pour la bêta.')
                f.write(chunk)
        if size<1024:raise HTTPException(400,'La vidéo semble vide.')
        opt=EditOptions(style=style,pacing=pace,captions=use_captions,transcript=caption_text,
                        remove_silences=remove_silences,quality=quality,max_seconds=90.0)
        meta=await run_in_threadpool(render,src,dst,opt=opt,transcript=caption_text)
        logging.info('YAPR render completed style=%s bytes=%s',style,meta['bytes'])
        return FileResponse(dst,media_type='video/mp4',filename='yapr-'+str(uuid.uuid4())[:8]+'.mp4',
                            headers={'X-YAPR-Edited-Seconds':str(meta['duration']),
                                     'X-YAPR-Removed-Pauses':str(meta['silence_cuts']),
                                     'X-YAPR-Caption-Timing':meta['caption_timing']},
                            background=BackgroundTask(lambda:(temp.cleanup(),LIMITER.release())))
    except HTTPException:
        temp.cleanup();LIMITER.release();raise
    except MediaError as e:
        temp.cleanup();LIMITER.release();raise HTTPException(422,str(e)[:700])
    except Exception:
        logging.exception('Render failed')
        temp.cleanup();LIMITER.release();raise HTTPException(500,'Le rendu a échoué. Réessaie avec un MP4 de moins de 90 secondes.')

@app.get('/privacy')
async def privacy():
    return JSONResponse({'notice':'Bêta : vos vidéos sont traitées temporairement par le serveur lors du rendu. Pour un compte Supabase, vos projets restent privés via règles RLS. Politique complète et contact à publier avant distribution publique.'})

app.mount('/', StaticFiles(directory=WEB,html=True),name='web')
