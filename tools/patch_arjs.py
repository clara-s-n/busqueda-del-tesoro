"""Reproduce the local mobile fixes from the original, checksum-pinned bundle.

Usage: python tools/patch_arjs.py /path/to/original/aframe-ar-nft.js
The original is available in Git at 0e414eb:assets/aframe-ar-nft.js.
Only run this when intentionally regenerating the bundled artifact.
"""
import hashlib
from pathlib import Path
import sys

source = Path(sys.argv[1]).read_bytes()
expected = 'a5536018932307a7b8e4fd21e774c48f8d1f3ca3371b12cc07f12b7e7f0acb18'
if hashlib.sha256(source).hexdigest() != expected:
    raise SystemExit('Unexpected AR.js input; review the upstream changes before patching.')
code = source.decode()

def replace_once(old, new):
    global code
    if code.count(old) != 1:
        raise SystemExit(f'Expected exactly one patch target: {old[:80]}')
    code = code.replace(old, new)

# Delegate the worker pump to a readable, tested implementation. The original
# starts a process chain for EACH startup message and uses CSS camera dimensions.
begin = code.index('function(I,g){var B=new i;window.addEventListener("arjs-video-loaded"')
end = code.index('}(A.parameters.descriptorsUrl,I)', begin) + 1
code = code[:begin] + 'function(I,g){window.SacreAR.createNFTTracker({controls:A,controller:g,worker:new i,markerUrl:I,onMarker:C,markerType:a.NFT_MARKER})}' + code[end:]

# In an NFT-only scene, recognition already runs in the worker. Do not also run
# square-marker detection/readback on the main thread every animation frame.
replace_once('y.prototype._updateArtoolkit=function(A){this.arController.process(A)}',
             'y.prototype._updateArtoolkit=function(A){if(this._arMarkersControls.some(function(marker){return marker.parameters.type!=="nft"}))this.arController.process(A)}')

# A portrait camera can report a portrait native stream on Android. Preserve
# its real display aspect ratio instead of forcing the overlay to 4:3.
begin = code.index('m.prototype.copyElementSizeTo=function(A){')
end = code.index('},m.prototype.copySizeTo=', begin) + 1
code = code[:begin] + 'm.prototype.copyElementSizeTo=function(A){A.style.width=this.domElement.style.width,A.style.height=this.domElement.style.height,A.style.marginLeft=this.domElement.style.marginLeft,A.style.marginTop=this.domElement.style.marginTop}' + code[end:]

replace_once('width:{ideal:g.parameters.sourceWidth},height:{ideal:g.parameters.sourceHeight}',
             'width:{ideal:g.parameters.sourceWidth},height:{ideal:g.parameters.sourceHeight},frameRate:{ideal:24,max:30}')
replace_once('D.prototype.dispose=function(){this.context',
             'D.prototype.dispose=function(){this._nftTracker&&this._nftTracker.dispose();this.context')

# Resize on camera metadata, video resize, viewport resize and orientation
# changes (ar-runtime.mjs), rather than mutating layout every frame.
replace_once('this._arSession.update(),this._arSession.onResize()', 'this._arSession.update()')

# Camera crops must not resize the page itself. On mobile this can grow the
# layout viewport repeatedly, move the HUD off screen, and enlarge GPU buffers.
replace_once('var I=A._arSession.arSource;"tango"!==g.contextParameters.trackingBackend&&I.copyElementSizeTo(document.body);', '')

# URL() also supports localhost/IP origins and GitHub Pages project paths.
begin = code.index('var i=/https?:', code.index('onmessage=function(A){var I=A.data;switch(I.type){case"init"'))
end = code.index(';B.initWithDimensions', begin)
code = code[:begin] + 'I=new URL(A.param,C+"/").href' + code[end:]
begin = code.index('var B=(Q=I).getCameraMatrix(),i=')
end = code.index('Q.loadNFTMarker(g)', begin)
code = code[:begin] + 'var B=(Q=I).getCameraMatrix();g=new URL(A.marker,C+"/").href;' + code[end:]

target = Path(__file__).resolve().parents[1] / 'assets/aframe-ar-nft.js'
target.write_text('/* AR.js 3.4.8: local mobile fixes; see tools/patch_arjs.py and ar-runtime.mjs. */\n' + code)
print(f'Patched {target.name}')
