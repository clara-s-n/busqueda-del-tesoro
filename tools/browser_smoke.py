"""Optional Chromium integration check (Python Playwright + system Chromium).

Serves under a project subpath like GitHub Pages. Uses a simulated camera and
synthetic marker events; it does not establish physical poster recognition.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
import json
from playwright.sync_api import sync_playwright

repo = Path(__file__).resolve().parents[1]

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(repo.parent)))
Thread(target=server.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{server.server_port}/{repo.name}/'
args = ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream',
        '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
stats_js = "document.querySelector('a-scene').systems.arjs._arSession.arContext._arMarkersControls[0]._nftTracker.stats"

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=args)
        page = browser.new_page(permissions=['camera'], viewport={'width': 390, 'height': 844},
                                device_scale_factor=3, is_mobile=True, has_touch=True)
        errors, failed_assets = [], []
        page.on('pageerror', lambda err: errors.append(str(err)))
        page.on('response', lambda r: failed_assets.append(r.url) if r.status >= 400 and '/assets/' in r.url else None)
        page.goto(origin, wait_until='networkidle')
        page.locator('#start').click()
        for stage, target in enumerate(['ludus', 'pastoral', 'bienestar']):
            page.wait_for_function("document.querySelector('#status').textContent.startsWith('Listo')", timeout=55000)
            assert page.locator('a-nft').count() == 1
            assert page.locator('a-nft').get_attribute('url') == origin + 'assets/targets/' + target
            assert page.evaluate("document.querySelector('a-scene').renderer.getPixelRatio()") == 1
            settings = page.locator('video').evaluate('(v)=>v.srcObject.getVideoTracks()[0].getSettings()')
            assert settings['frameRate'] <= 30
            assert settings['width'] <= 640 and settings['height'] <= 480
            page.wait_for_function(stats_js + '.completed >= 3')
            print(f'PASS: {target} camera + NFT worker initialized under project subpath', flush=True)

            if stage == 0:
                start = page.evaluate(f'({{time: performance.now(), sent: {stats_js}.sent}})')
                page.wait_for_function(stats_js + f'.sent >= {start["sent"] + 12}')
                end = page.evaluate(f'({{time: performance.now(), sent: {stats_js}.sent, inFlight: {stats_js}.inFlight}})')
                fps = (end['sent'] - start['sent']) * 1000 / (end['time'] - start['time'])
                assert fps <= 13, fps
                assert end['inFlight'] <= 1
                for size in [{'width': 844, 'height': 390}, {'width': 390, 'height': 844}]:
                    page.set_viewport_size(size)
                    page.wait_for_function("(()=>{const v=document.querySelector('video'), c=document.querySelector('a-scene').canvas;return v.videoWidth>0 && Math.abs(parseFloat(c.style.width)/parseFloat(c.style.height)-v.videoWidth/v.videoHeight)<0.01})()")
                    assert page.evaluate('innerWidth') == size['width'], 'camera crop must not expand the mobile layout viewport'
                page.evaluate("Object.defineProperty(document, 'hidden', {configurable:true,value:true}); document.dispatchEvent(new Event('visibilitychange'))")
                paused_count = page.evaluate(stats_js + '.sent')
                page.wait_for_timeout(300)
                assert page.evaluate(stats_js + '.sent') == paused_count
                assert not page.locator('video').evaluate('(v)=>v.srcObject.getVideoTracks()[0].enabled')
                page.evaluate("Object.defineProperty(document, 'hidden', {configurable:true,value:false}); document.dispatchEvent(new Event('visibilitychange'))")
                page.wait_for_function(stats_js + f'.sent > {paused_count}')
                print(f'PASS: high-DPR budget ({fps:.1f} NFT fps), portrait/landscape, background pause/resume', flush=True)

            page.locator('a-nft').dispatch_event('markerFound')
            page.wait_for_function('(count)=>document.querySelector("#progress").textContent.startsWith(count+" / 3")', arg=stage + 1)
            assert page.locator('#discovery-image').evaluate('(i)=>i.complete && i.naturalWidth>0')
            if stage < 2:
                assert page.locator('video').evaluate('(v)=>v.srcObject.getVideoTracks().every(t=>t.readyState==="live")')
                assert not page.locator('a-scene').evaluate('(s)=>s.hidden')
                page.locator('#next').click()
                page.wait_for_load_state('domcontentloaded')

        assert not page.locator('#win').evaluate('(d)=>d.open')
        page.locator('#open-treasure').click()
        assert page.locator('#win').evaluate('(d)=>d.open')
        assert page.locator('#treasure-image').evaluate('(i)=>i.complete && i.naturalWidth>0')
        assert not page.locator('video').evaluate('(v)=>v.srcObject.getVideoTracks()[0].enabled')
        page.keyboard.press('Escape')
        page.wait_for_function("!document.querySelector('#win').open && document.querySelector('video').srcObject.getVideoTracks()[0].enabled")
        page.locator('#open-treasure').click()
        page.locator('#continue').click()
        page.wait_for_function("document.querySelector('video').srcObject.getVideoTracks()[0].enabled")
        page.on('dialog', lambda dialog: dialog.accept())
        page.locator('#reset').click()
        page.wait_for_load_state('domcontentloaded')
        assert page.evaluate("JSON.parse(localStorage.getItem('sacre-coeur-posters-v2')).found.length") == 0
        assert not errors, errors
        assert not failed_assets, failed_assets
        print('PASS: completion, treasure resume, reset, camera release between stages; no JavaScript errors or asset failures', flush=True)
        browser.close()
finally:
    server.shutdown()
    server.server_close()
