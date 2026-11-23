from pathlib import Path
from tempfile import TemporaryDirectory
import subprocess
from fastapi.testclient import TestClient
from api.server import app
from api.editor import (EditOptions, probe, render, split_caption_text, MediaError)

client=TestClient(app)

def _make_video(path):
    subprocess.run(['ffmpeg','-y','-loglevel','error','-f','lavfi','-i','color=c=#301538:s=320x568:r=18:d=2',
                    '-f','lavfi','-i','sine=frequency=460:sample_rate=44100:duration=2',
                    '-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-c:a','aac','-shortest',str(path)],check=True)

def test_health():
    a=client.get('/api/health');assert a.status_code==200;assert a.json()['ok']

def test_anonymous_render_denied():
    a=client.post('/api/render',files={'file':('x.mp4',b'not-video','video/mp4')},data={'style':'impact'})
    assert a.status_code==401

def test_malformed_media_rejected():
    with TemporaryDirectory() as d:
        path=Path(d)/'input.mp4';path.write_text('not-a-movie')
        try:probe(path)
        except MediaError:pass
        else:assert False,'bad media was accepted'

def test_caption_tokens():
    chunks=split_caption_text('Bonjour à tous. YAPR va monter votre vidéo avec vos préférences.')
    assert chunks and all(len(c.split())<=4 for c in chunks)

def test_real_video_render():
    with TemporaryDirectory() as d:
        path=Path(d)/'in.mp4';out=Path(d)/'out.mp4'
        _make_video(path)
        meta=render(path,out,opt=EditOptions(style='editorial',captions=True),transcript='Bonjour à tous. Ton style, ton montage.')
        assert out.stat().st_size>2000
        assert probe(out)['height']==960
        assert meta['captions'] is True
        assert meta['duration']>=1.6
