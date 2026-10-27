import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

class Target {
  listeners = new Map();
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
  }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  dispatchEvent(event) { for (const fn of [...(this.listeners.get(event.type) || [])]) fn(event); }
  emit(type, detail) { this.dispatchEvent({type, detail}); }
}

function fixture() {
  let now = 0, sequence = 0;
  const timers = new Map(), messages = [], draws = [], markers = [];
  const window = new Target(), document = new Target(), video = new Target();
  Object.assign(video, {readyState: 0, videoWidth: 0, videoHeight: 0, clientWidth: 390, clientHeight: 844, currentTime: 0});
  document.hidden = false;
  document.baseURI = 'https://example.github.io/tesoro/';
  document.getElementById = () => video;
  document.querySelector = () => null;
  document.body = {classList: {add() {}}};
  const context = {fillRect() {}, drawImage(...args) { draws.push(args); }, getImageData() { return {data: new Uint8ClampedArray(4)}; }};
  const controller = {canvas: {getContext: () => context}, cameraParam: 'assets/camera_para.dat'};
  const controls = {object3d: {matrix: {fromArray() {}}}};
  const worker = {postMessage: msg => messages.push(msg), terminate() { this.terminated = true; }};
  const sandbox = {
    window, document, URL, performance: {now: () => now},
    setTimeout(fn, delay) { const id = ++sequence; timers.set(id, {fn, at: now + delay}); return id; },
    clearTimeout(id) { timers.delete(id); },
    Event: class { constructor(type) { this.type = type; } },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }
  };
  const source = fs.readFileSync(new URL('ar-runtime.mjs', import.meta.url), 'utf8').replaceAll('export function', 'function');
  const api = vm.runInNewContext(source + '\n({createNFTTracker, configureARScene})', sandbox);
  const tracker = api.createNFTTracker({controls, controller, worker, markerUrl: 'https://example.github.io/tesoro/assets/targets/ludus', onMarker: event => markers.push(event), markerType: 2});
  function advance(ms) {
    const end = now + ms;
    let count = 0;
    while (true) {
      const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      assert.ok(++count < 1000, 'the frame pump must not busy-loop');
      now = next[1].at;
      timers.delete(next[0]);
      next[1].fn();
    }
    now = end;
  }
  function cameraReady() {
    Object.assign(video, {readyState: 2, videoWidth: 640, videoHeight: 480});
    video.emit('loadeddata');
  }
  const reply = data => worker.onmessage({data});
  return {api, document, window, video, controller, controls, worker, tracker, messages, draws, markers, advance, cameraReady, reply};
}

test('waits for camera pixels and starts one queue only after the dataset is loaded', () => {
  const f = fixture();
  assert.equal(f.messages.length, 0);
  f.cameraReady();
  assert.equal(f.messages.length, 1);
  assert.equal(f.messages[0].type, 'init');
  assert.equal(f.messages[0].param, 'https://example.github.io/tesoro/assets/camera_para.dat');
  f.reply({type: 'loaded', proj: JSON.stringify(Array(16).fill(1))});
  f.reply({type: 'markerInfos', marker: JSON.stringify({dpi: 72, width: 600, height: 850})});
  f.advance(100);
  assert.equal(f.tracker.stats.sent, 0, 'startup messages must not enqueue camera frames');
  f.reply({type: 'endLoading'});
  f.advance(0);
  assert.equal(f.tracker.stats.sent, 1);
  f.video.currentTime = 1;
  f.advance(1000);
  assert.equal(f.tracker.stats.sent, 1, 'a slow worker must never accumulate queued frames');
  assert.equal(f.tracker.stats.inFlight, 1);
});

test('uses intrinsic video dimensions, preserving portrait frames after rotation', () => {
  const f = fixture();
  f.cameraReady(); f.reply({type: 'endLoading'}); f.advance(0);
  assert.deepEqual(f.draws[0].slice(1), [0, 0, 320, 240]);
  f.reply({type: 'not found'});
  Object.assign(f.video, {videoWidth: 480, videoHeight: 640, currentTime: 1});
  f.advance(84);
  assert.deepEqual(f.draws[1].slice(1), [70, 0, 180, 240]);
  assert.equal(f.controller.canvas.width, 320);
  assert.equal(f.controller.canvas.height, 240);
});

test('caps detection at 12 fps, skips repeated camera frames, and forwards detections', () => {
  const f = fixture();
  f.cameraReady(); f.reply({type: 'endLoading'}); f.advance(0);
  for (let n = 0; n < 12; n++) {
    f.reply({type: 'not found'});
    f.video.currentTime += 1 / 24;
    f.advance(84);
  }
  assert.equal(f.tracker.stats.sent, 13); // First frame plus twelve intervals.
  f.reply({type: 'found', matrix: JSON.stringify(Array(16).fill(1))});
  assert.equal(f.markers.length, 1);
  f.advance(1000);
  assert.equal(f.tracker.stats.sent, 13, 'the same camera frame must not be processed twice');
});

test('pause stops processing, resume restarts it, and disposal terminates the worker', () => {
  const f = fixture();
  f.cameraReady(); f.reply({type: 'endLoading'}); f.advance(0);
  f.tracker.pause();
  f.reply({type: 'found', matrix: '[]'});
  f.video.currentTime = 1;
  f.advance(1000);
  assert.equal(f.markers.length, 0);
  assert.equal(f.tracker.stats.sent, 1);
  f.tracker.resume(); f.advance(0);
  assert.equal(f.tracker.stats.sent, 2);
  f.tracker.dispose(); f.tracker.dispose();
  f.advance(1000);
  assert.equal(f.worker.terminated, true);
  assert.equal(f.worker.onmessage, null);
  assert.equal(f.video.listeners.get('loadeddata').size, 0);
});

test('scene budgets, visibility, modal pause, and camera release', () => {
  const f = fixture();
  const track = {enabled: true, stop() { this.stopped = true; }};
  Object.assign(f.video, {srcObject: {getTracks: () => [track]}, play: () => Promise.resolve(), pause() {}});
  let ratio, loop, rendered = 0;
  const scene = new Target();
  Object.assign(scene, {
    renderer: {setPixelRatio(v) { ratio = v; }, setAnimationLoop(v) { loop = v; }},
    systems: {arjs: {_arSession: {arContext: {_arMarkersControls: [f.controls]}, onResize() {}}}},
    render() { rendered++; }, resize() {}, play() {}, pause() {}
  });
  const runtime = f.api.configureARScene(scene);
  scene.emit('renderstart');
  f.window.emit('arjs-video-loaded', {component: f.video});
  assert.equal(ratio, 1);
  for (let n = 0; n < 120; n++) loop(n * 1000 / 120);
  assert.equal(rendered, 30);
  f.document.hidden = true; f.document.emit('visibilitychange');
  assert.equal(loop, null);
  assert.equal(track.enabled, false);
  f.document.hidden = false; f.document.emit('visibilitychange');
  assert.equal(typeof loop, 'function');
  assert.equal(track.enabled, true);
  runtime.pause();
  f.document.emit('visibilitychange');
  assert.equal(loop, null, 'returning to a tab must not override a modal pause');
  runtime.resume();
  assert.equal(typeof loop, 'function');
  f.window.emit('pagehide');
  assert.equal(track.stopped, true);
  assert.equal(f.worker.terminated, true);
  assert.equal(scene.hidden, true);
});

test('NFT calibration updates the camera projection after rotation, preserving the marker pose', () => {
  const f = fixture();
  f.cameraReady();
  let markerWrites = 0, inverseUpdates = 0;
  f.controls.object3d.matrix.fromArray = () => { markerWrites++; };
  const matrix = {elements: [], fromArray(values) { this.elements = [...values]; }};
  const scene = new Target();
  Object.assign(scene, {
    camera: {projectionMatrix: matrix, projectionMatrixInverse: {copy() { return this; }, invert() { inverseUpdates++; }}},
    systems: {arjs: {_arSession: {arContext: {arController: f.controller}, onResize() {}}}},
    resize() {}
  });
  f.api.configureARScene(scene);
  f.window.emit('arjs-video-loaded', {component: f.video});
  const projection = [2, 0, 0, 0, 0, 3, 0, 0, 0.1, 0.2, -1, -1, 0, 0, -0.2, 0];
  f.reply({type: 'loaded', proj: JSON.stringify(projection)});
  f.advance(100);
  assert.deepEqual(matrix.elements, projection, 'a landscape source needs no padding compensation');
  f.video.videoWidth = 480; f.video.videoHeight = 640;
  f.video.emit('resize');
  f.advance(100);
  assert.equal(matrix.elements[0], 2 * 320 / 180);
  assert.equal(matrix.elements[5], 3);
  assert.equal(markerWrites, 0, 'a camera projection must never overwrite the marker pose');
  assert.equal(inverseUpdates, 2);
});

test('the patched AR.js bundle avoids duplicate main-thread NFT detection', () => {
  const bundle = fs.readFileSync(new URL('assets/aframe-ar-nft.js', import.meta.url), 'utf8');
  const start = bundle.indexOf('y.prototype._updateArtoolkit=') + 'y.prototype._updateArtoolkit='.length;
  const end = bundle.indexOf(',y.prototype.dispose=', start);
  const update = vm.runInNewContext('(' + bundle.slice(start, end) + ')');
  let calls = 0;
  const context = {_arMarkersControls: [{parameters: {type: 'nft'}}], arController: {process() { calls++; }}};
  update.call(context, {});
  assert.equal(calls, 0);
  context._arMarkersControls.push({parameters: {type: 'pattern'}});
  update.call(context, {});
  assert.equal(calls, 1, 'pattern marker support must remain intact');
});
