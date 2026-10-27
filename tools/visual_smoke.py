"""Exercise real NFT detection and visible WebGL output using synthetic posters.

Requires ffmpeg, Pillow and Python Playwright with /usr/bin/chromium.
This tests rendering and computer vision against reference images, not physical
posters, phone camera drivers or device temperature.
"""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from io import BytesIO
import json
from pathlib import Path
import subprocess
import time
from tempfile import TemporaryDirectory
from threading import Thread
from PIL import Image
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--artifacts', type=Path)
args = parser.parse_args()
repo = Path(__file__).resolve().parents[1]

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(repo.parent)))
Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}/{repo.name}/'

def check_rendered_model(page, name, artifacts):
    # Verify the actual model is in the camera frustum, not just a marker event.
    page.wait_for_function("(()=>{const s=document.querySelector('a-scene'),m=document.querySelector('a-nft');return m?.object3D.visible && s.renderer.info.render.triangles>0})()", timeout=15000)
    position = page.evaluate("(()=>{const t=AFRAME.THREE,s=document.querySelector('a-scene'),m=document.querySelector('.item-model');return new t.Box3().setFromObject(m.object3D).getCenter(new t.Vector3()).project(s.camera).toArray()})()")
    assert all(-1 < component < 1 for component in position), (name, position)
    page.screenshot(path=str(artifacts / (name + '-game.png')))
    # Isolate WebGL from the video and HTML illustrations, then count real
    # painted model pixels. State flags alone missed the original regression.
    style = page.add_style_tag(content='#hud,#arjs-video{visibility:hidden!important}body{background:#000!important}')
    try:
        screenshot = page.screenshot()
        image = Image.open(BytesIO(screenshot)).convert('RGB')
        pixels = image.tobytes()
        painted = sum(1 for r, g, b in zip(pixels[0::3], pixels[1::3], pixels[2::3]) if max(r, g, b) > 20)
        assert painted > 100, (name, 'no visible model pixels', painted)
        (artifacts / (name + '-webgl.png')).write_bytes(screenshot)
    finally:
        style.evaluate('(s)=>s.remove()')
    print(f'PASS: {name} has {painted} visible WebGL pixels inside the camera frustum', flush=True)

try:
    with TemporaryDirectory(prefix='sacre-visual-') as temp, sync_playwright() as p:
        temp = Path(temp)
        artifacts = args.artifacts or temp / 'screenshots'
        artifacts.mkdir(parents=True, exist_ok=True)
        for stage, (target, item) in enumerate([('ludus', 'compass'), ('pastoral', 'key'), ('bienestar', 'crystal')]):
            camera = temp / (target + '.y4m')
            subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-loop', '1', '-i', str(repo / 'assets/targets' / (target + '.png')),
                            '-vf', 'scale=-2:420,pad=640:480:(ow-iw)/2:(oh-ih)/2:color=gray,fps=15',
                            '-t', '1', '-pix_fmt', 'yuv420p', str(camera)], check=True)
            browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
                args=['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
                      '--use-file-for-fake-video-capture=' + str(camera), '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
            page = browser.new_page(permissions=['camera'], viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            initial = {'found': list(range(stage)), 'started': int(time.time() * 1000) - 1000, 'finished': 0}
            page.add_init_script("if(!localStorage.getItem('sacre-coeur-posters-v2'))localStorage.setItem('sacre-coeur-posters-v2'," + json.dumps(json.dumps(initial)) + ")")
            page.goto(origin, wait_until='networkidle')
            page.locator('#start').click()
            page.wait_for_function('(count)=>document.querySelector("#progress").textContent.startsWith(count+" / 3")', arg=stage + 1, timeout=30000)
            assert page.locator('#discovery-image').get_attribute('src').endswith('/' + item + '.svg')
            assert page.locator('#discovery-image').evaluate('(i)=>i.complete && i.naturalWidth>0')
            assert page.locator('a-scene').is_visible()
            assert page.locator('video').evaluate('(v)=>v.srcObject.getVideoTracks()[0].readyState==="live"')
            check_rendered_model(page, item, artifacts)
            if stage == 2:
                assert not page.locator('#win').evaluate('(d)=>d.open')
                page.locator('#open-treasure').click()
                assert page.locator('#win').evaluate('(d)=>d.open')
                assert page.locator('#treasure-image').evaluate('(i)=>i.complete && i.naturalWidth>0')
                page.screenshot(path=str(artifacts / 'treasure-card.png'))
                page.locator('#continue').click()
                page.wait_for_function("document.querySelector('.treasure').object3D.visible && !document.querySelector('.crystal').object3D.visible")
                check_rendered_model(page, 'treasure', artifacts)
            assert not errors, errors
            browser.close()
        print('PASS: all three posters were recognized by the real NFT worker, and all four 3D objects rendered visibly', flush=True)
finally:
    server.shutdown()
    server.server_close()
