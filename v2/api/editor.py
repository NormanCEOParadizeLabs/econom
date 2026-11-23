"""YAPR first-party deterministic editor: safe, bounded, offline, no paid AI dependency.
Not a substitute for a semantic AI director or professionally edited examples.
"""
from __future__ import annotations
import dataclasses
import json
import math
import os
import re
import subprocess
from pathlib import Path

@dataclasses.dataclass
class EditOptions:
    style: str = 'impact'
    pacing: float = 0.65
    captions: bool = True
    transcript: str = ''
    remove_silences: bool = True
    quality: str = 'preview'
    max_seconds: float = 90.0

STYLE_LOOK = {
 'impact': {'sat':1.14, 'con':1.09, 'bright':.012, 'font':34, 'color':'&H00FFEF&', 'box':'&H9A110B20&'},
 'pop': {'sat':1.30, 'con':1.08, 'bright':.013, 'font':36, 'color':'&H70E8FF&', 'box':'&H9A23102C&'},
 'motion': {'sat':1.18, 'con':1.13, 'bright':.01, 'font':35, 'color':'&HFFE6E7&', 'box':'&H9A120522&'},
 'podcast': {'sat':1.05, 'con':1.04, 'bright':.0, 'font':32, 'color':'&HFFFFFF&', 'box':'&H9A101010&'},
 'business': {'sat':.99, 'con':1.04, 'bright':.0, 'font':29, 'color':'&HFFFFFF&', 'box':'&H930F1019&'},
 'edu': {'sat':1.04, 'con':1.04, 'bright':.0, 'font':31, 'color':'&HFFFFFF&', 'box':'&H9A151010&'},
 'editorial': {'sat':.97, 'con':1.07, 'bright':.0, 'font':28, 'color':'&HFFFFFF&', 'box':'&H9315101C&'},
 'cinematic': {'sat':.86, 'con':1.14, 'bright':-.015, 'font':27, 'color':'&HFFFFFF&', 'box':'&H9A171016&'},
 'documentary': {'sat':.82, 'con':1.12, 'bright':-.01, 'font':29, 'color':'&HFFFFFF&', 'box':'&H9A1A1419&'},
 'minimal': {'sat':.92, 'con':1.02, 'bright':.012, 'font':26, 'color':'&HFFFFFF&', 'box':'&H900D0D0D&'},
 'raw': {'sat':1.0, 'con':1.0, 'bright':.0, 'font':26, 'color':'&HFFFFFF&', 'box':'&H900D0D0D&'},
 'lux': {'sat':.92, 'con':1.06, 'bright':.006, 'font':27, 'color':'&HFFFFFF&', 'box':'&H90100E14&'},
}

class MediaError(ValueError):
    pass

def run(cmd: list[str], *, timeout: int = 120) -> subprocess.CompletedProcess:
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout, check=True)
    except subprocess.TimeoutExpired as e:
        raise MediaError('Le traitement vidéo a dépassé la durée autorisée.') from e
    except subprocess.CalledProcessError as e:
        raise MediaError((e.stderr or 'Erreur FFmpeg')[-1500:]) from e

def probe(path: Path) -> dict:
    o=run(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(path)],timeout=25)
    data=json.loads(o.stdout)
    streams=data.get('streams',[])
    video=next((s for s in streams if s.get('codec_type')=='video'),None)
    if not video: raise MediaError('Aucune piste vidéo détectée.')
    duration=float(data.get('format',{}).get('duration') or video.get('duration') or 0)
    if not (0.6 <= duration <= 180): raise MediaError('Vidéo prise en charge : entre 1 seconde et 3 minutes.')
    if int(video.get('width',0))*int(video.get('height',0)) > 4096*2160: raise MediaError('Résolution source trop élevée pour la bêta.')
    return {'duration':duration,'width':int(video.get('width',0)),'height':int(video.get('height',0)),
            'has_audio':any(s.get('codec_type')=='audio' for s in streams)}

def detect_keep_spans(path: Path, duration: float, pacing: float) -> list[tuple[float,float]]:
    """Cut long clear silences, preserve at least 45% to avoid ruining speech."""
    min_silence=max(.38, .85-.35*pacing)
    try:
        r=subprocess.run(['ffmpeg','-hide_banner','-nostats','-i',str(path),'-af',f'silencedetect=noise=-34dB:d={min_silence:.2f}',
                          '-f','null','-'],capture_output=True,text=True,timeout=30)
    except Exception:
        return [(0.0,duration)]
    starts=[float(x) for x in re.findall(r'silence_start:\s*([\d.]+)',r.stderr)]
    ends=[float(x) for x in re.findall(r'silence_end:\s*([\d.]+)',r.stderr)]
    periods=[]
    for i,start in enumerate(starts):
        end=ends[i] if i<len(ends) else duration
        if end-start>=min_silence: periods.append((max(0,start),min(duration,end)))
    if not periods: return [(0.0,duration)]
    # Keep natural pauses: max 0.1 sec at each boundary.
    kept=[];cursor=0.0
    for a,b in periods:
        keep_until=min(duration,a+.07)
        if keep_until-cursor>=.18: kept.append((cursor,keep_until))
        cursor=max(cursor,b-.07)
    if duration-cursor>.18: kept.append((cursor,duration))
    if not kept or len(kept)>24 or sum(b-a for a,b in kept) < duration*.45:
        return [(0.0,duration)]
    return kept

def ass_time(t:float)->str:
    n=max(0,int(round(t*100)))
    return f'{n//360000}:{(n//6000)%60:02d}:{(n//100)%60:02d}.{n%100:02d}'

def split_caption_text(text:str)->list[str]:
    clean=re.sub(r'[\x00-\x1f]+',' ',text).strip()
    words=clean.split()
    if len(words)>750: words=words[:750]
    if not words:return []
    # Line lengths intentionally small for vertical smartphone safety.
    chunks=[];buf=[]
    for w in words:
        if len(buf)>=4 or sum(len(x)+1 for x in buf)+len(w)>28:
            chunks.append(' '.join(buf));buf=[]
        buf.append(w)
        if re.search(r'[.!?…]$',w) and len(buf)>=2:
            chunks.append(' '.join(buf));buf=[]
    if buf:chunks.append(' '.join(buf))
    return chunks[:160]

def ass_escape(s:str)->str:
    return s.replace('\\','').replace('{','(').replace('}',')').replace('\n',' ')

def build_ass(text:str, path:Path, duration:float, options:EditOptions)->bool:
    chunks=split_caption_text(text)
    if not chunks:return False
    look=STYLE_LOOK.get(options.style,STYLE_LOOK['impact'])
    fontsize=look['font']
    # Duration based on word counts, not aligned to actual audio: this is a fallback.
    counts=[max(1,len(x.split())) for x in chunks];total=sum(counts)
    position=0.0;lines=[]
    for i,(chunk,count) in enumerate(zip(chunks,counts)):
        t0=duration*(position/total);position+=count;t1=duration*(position/total)
        if t1-t0<.30:t1=t0+.30
        lines.append(f'Dialogue: 0,{ass_time(t0)},{ass_time(min(duration,t1))},Default,,0,0,0,,{ass_escape(chunk)}')
    doc='''[Script Info]
ScriptType: v4.00+
PlayResX: 540
PlayResY: 960
ScaledBorderAndShadow: yes
WrapStyle: 2
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
'''
    doc+=f"Style: Default,DejaVu Sans,{fontsize},{look['color']},&HFFFFFF&,&H000000&,{look['box']},-1,0,0,0,100,100,0,0,3,3,1,2,36,36,175,1\n"
    doc+='[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n'+'\n'.join(lines)+'\n'
    path.write_text(doc,encoding='utf-8')
    return True

def render(src:Path, dst:Path, *, opt:EditOptions, transcript:str='')->dict:
    info=probe(src)
    if info['duration']>opt.max_seconds:
        raise MediaError(f'Pour cette bêta, limite de {int(opt.max_seconds)} secondes par montage.')
    look=STYLE_LOOK.get(opt.style,STYLE_LOOK['impact'])
    spans=detect_keep_spans(src,info['duration'],opt.pacing) if info['has_audio'] and opt.remove_silences else [(0,info['duration'])]
    trimmed_duration=sum(b-a for a,b in spans)
    filters=[]
    source_vid='[0:v]';source_aud='[0:a]' if info['has_audio'] else None
    use_concat=len(spans)>1
    if use_concat:
        parts=[]
        for i,(a,b) in enumerate(spans):
            filters.append(f'[0:v]trim=start={a:.3f}:end={b:.3f},setpts=PTS-STARTPTS[v{i}]')
            filters.append(f'[0:a]atrim=start={a:.3f}:end={b:.3f},asetpts=PTS-STARTPTS[a{i}]')
            parts.append(f'[v{i}][a{i}]')
        filters.append(''.join(parts)+f'concat=n={len(spans)}:v=1:a=1[vcat][acat]')
        source_vid='[vcat]';source_aud='[acat]'
    # Fit vertical without cutting meaningful content: letterbox rather than crop faces.
    q='540:960' if opt.quality=='preview' else '720:1280'
    bg=f'{source_vid}scale={q}:force_original_aspect_ratio=decrease,pad={q}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,eq=contrast={look["con"]}:saturation={look["sat"]}:brightness={look["bright"]}'
    ass_file=dst.with_suffix('.ass')
    has_captions=opt.captions and bool(transcript.strip()) and build_ass(transcript,ass_file,trimmed_duration,opt)
    if has_captions:
        # No shell interpolation: subprocess argument, path generated internally, no user path.
        bg+=f",subtitles={ass_file.as_posix()}"
    filters.append(bg+'[vout]')
    if source_aud: filters.append(source_aud+'acompressor=threshold=-18dB:ratio=2.2:attack=15:release=180,alimiter=limit=0.95[aout]')
    cmd=['ffmpeg','-y','-hide_banner','-loglevel','error','-i',str(src),'-filter_complex',';'.join(filters),'-map','[vout]']
    if source_aud:cmd+=['-map','[aout]','-c:a','aac','-b:a','128k']
    else:cmd+=['-an']
    cmd+=['-c:v','libx264','-preset','veryfast','-crf','25','-pix_fmt','yuv420p','-movflags','+faststart','-r','25',str(dst)]
    try:run(cmd,timeout=220)
    finally:
        if ass_file.exists(): ass_file.unlink()
    if not dst.exists() or dst.stat().st_size<1000: raise MediaError('Le rendu vidéo est vide.')
    return {'source_duration':round(info['duration'],2),'duration':round(trimmed_duration,2),
            'style':opt.style,'silence_cuts':max(0,len(spans)-1),'captions':bool(has_captions),
            'caption_timing':('approximate' if has_captions else 'none'), 'bytes':dst.stat().st_size,'engine':'FFmpeg deterministic beta'}
