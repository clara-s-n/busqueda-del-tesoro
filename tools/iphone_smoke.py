"""iPhone 12 layout and motion-permission regression checks in Chromium/WebKit.

Uses desktop browser engines with iPhone viewport/user agent and synthetic marker
events. It does not replace testing Safari's camera on a physical iPhone.
"""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
from threading import Thread
from playwright.sync_api import sync_playwright

parser=argparse.ArgumentParser()
parser.add_argument('--browser',choices=['chromium','webkit'],default='chromium')
parser.add_argument('--artifacts',type=Path,default=Path('/tmp/sacre-iphone-layout'))
parser.add_argument('--webkit-executable',type=Path,help='Optional custom WebKit launcher with its runtime dependencies prepared')
args=parser.parse_args()
args.artifacts.mkdir(parents=True,exist_ok=True)
repo=Path(__file__).resolve().parents[1]

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*_args): pass

server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(repo.parent)))
Thread(target=server.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{server.server_port}/{repo.name}/'

def check_layout(page,label):
    result=page.evaluate("""()=>{
      const box=id=>document.querySelector(id).getBoundingClientRect();
      const content=document.querySelector('.clue-content'),view=visualViewport;
      const status=box('#status'),card=box('.clue'),actions=box('.clue-actions');
      const visible=id=>{const r=box(id),c=content.getBoundingClientRect();return r.top>=c.top-1&&r.bottom<=c.bottom+1};
      return {height:view.height,width:view.width,hud:box('#hud').height,
        unclipped:content.scrollHeight<=content.clientHeight+1,
        hint:visible('#clue-text'),caption:status.bottom<=card.top-1,
        actions:actions.top>=card.top&&actions.bottom<=view.height-1,
        inViewport:card.left>=0&&card.right<=view.width+1&&card.bottom<=view.height-1,
        sensorRequests:window.sensorRequests,dialogs:document.querySelectorAll('.a-dialog').length};
    }""")
    assert result['unclipped'] and result['hint'],(label,result)
    assert result['caption'] and result['actions'] and result['inViewport'],(label,result)
    assert abs(result['height']-result['hud'])<1,(label,result)
    assert result['sensorRequests']==0 and result['dialogs']==0,(label,result)
    page.screenshot(path=str(args.artifacts/f'{args.browser}-{label}.png'))
    print('PASS:',args.browser,label,json.dumps(result),flush=True)

try:
    with sync_playwright() as p:
        if args.browser=='chromium':
            browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,
                args=['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',
                      '--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        else:
            browser=p.webkit.launch(headless=True,**({'executable_path':str(args.webkit_executable)} if args.webkit_executable else {}))
        device=p.devices['iPhone 12'].copy()
        device['device_scale_factor']=1 # CSS geometry is identical; keep test screenshots small.
        device['viewport']={'width':390,'height':700} # Safari toolbars occupy part of the 844px screen.
        context=browser.new_context(**device,permissions=['camera'])
        page=context.new_page()
        page.add_init_script("""
          window.sensorRequests=0;
          window.DeviceOrientationEvent=class extends Event {
            static requestPermission(){window.sensorRequests++;return Promise.reject(new Error('requires a gesture'))}
          };
          if(!localStorage.getItem('sacre-coeur-spots-v3'))localStorage.setItem('sacre-coeur-spots-v3',JSON.stringify({found:[],started:Date.now()-886*60000,finished:0}));
        """)
        page.goto(origin,wait_until='networkidle')
        page.locator('#start').click()
        page.wait_for_function("document.querySelector('a-scene')?.hasLoaded",timeout=30000)
        page.wait_for_function("document.querySelector('a-scene').components['device-orientation-permission-ui']?.data.enabled===false")
        assert page.locator('#timer').inner_text() in ['00:00','00:01','00:02','00:03','00:04','00:05']
        for stage in range(3):
            if stage:
                page.wait_for_function("document.querySelector('a-scene')?.hasLoaded",timeout=30000)
            for height in [700,635,844]:
                page.set_viewport_size({'width':390,'height':height})
                check_layout(page,f'scan-{stage}-{height}')
            page.set_viewport_size({'width':390,'height':700})
            page.locator('a-nft').dispatch_event('markerFound')
            page.wait_for_function('(n)=>document.querySelector("#progress").textContent.startsWith(n+" / 3")',arg=stage+1)
            for height in [700,635,844]:
                page.set_viewport_size({'width':390,'height':height})
                check_layout(page,f'found-{stage}-{height}')
            if stage<2:
                with page.expect_navigation(wait_until='domcontentloaded'):
                    page.locator('#next').click()
        page.set_viewport_size({'width':390,'height':635})
        page.locator('#open-treasure').click()
        assert page.locator('#treasure-image').is_visible()
        assert page.locator('#continue').is_visible()
        page.screenshot(path=str(args.artifacts/f'{args.browser}-treasure.png'))
        assert page.evaluate('window.sensorRequests')==0
        browser.close()
finally:
    server.shutdown();server.server_close()
