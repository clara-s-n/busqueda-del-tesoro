// Local integration with the bundled AR.js 3.4.8 NFT worker. See README.md.
export function createNFTTracker({controls, controller, worker, markerUrl, onMarker, markerType}) {
  const canvas = controller.canvas;
  const width = 320, height = 240, interval = 1000 / 12;
  let video, context, timer, initialized = false, ready = false, disposed = false;
  let paused = false, inFlight = false, lastSent = -Infinity, lastVideoTime = -1;
  const stats = {sent: 0, completed: 0, inFlight: 0};

  function schedule() {
    if (!ready || disposed || paused || document.hidden || inFlight || timer !== undefined) return;
    timer = setTimeout(sendFrame, Math.max(0, interval - (performance.now() - lastSent)));
  }

  function sendFrame() {
    timer = undefined;
    if (disposed || paused || document.hidden || inFlight) return;
    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight || video.currentTime === lastVideoTime) {
      // No new camera frame yet. Do not spin on a frozen or background video.
      timer = setTimeout(sendFrame, interval);
      return;
    }
    // Use intrinsic camera pixels, never CSS clientWidth/clientHeight. Recompute
    // after every orientation change without reallocating the worker's buffer.
    const scale = Math.min(width / video.videoWidth, height / video.videoHeight);
    const w = video.videoWidth * scale, h = video.videoHeight * scale;
    context.fillStyle = 'black';
    context.fillRect(0, 0, width, height);
    context.drawImage(video, (width - w) / 2, (height - h) / 2, w, h);
    const image = context.getImageData(0, 0, width, height);
    lastSent = performance.now();
    lastVideoTime = video.currentTime;
    inFlight = true;
    stats.inFlight = 1;
    stats.sent++;
    worker.postMessage({type: 'process', imagedata: image}, [image.data.buffer]);
  }

  worker.onmessage = ({data}) => {
    if (disposed) return;
    if (data.type === 'loaded') {
      // Preserve AR.js's initial projection handling.
      const projection = JSON.parse(data.proj);
      const scale = Math.min(width / video.videoWidth, height / video.videoHeight);
      const x = width / (video.videoWidth * scale), y = height / (video.videoHeight * scale);
      for (const index of [0, 4, 8, 12]) projection[index] *= x;
      for (const index of [1, 5, 9, 13]) projection[index] *= y;
      controls.object3d.matrix.fromArray(projection);
    } else if (data.type === 'markerInfos') {
      const marker = JSON.parse(data.marker);
      window.dispatchEvent(new CustomEvent('arjs-nft-init-data', {detail: marker}));
    } else if (data.type === 'endLoading') {
      ready = true;
      document.querySelector('.arjs-loader')?.remove();
      window.dispatchEvent(new Event('arjs-nft-loaded'));
      schedule();
    } else if (data.type === 'found' || data.type === 'not found') {
      // Only frame replies release the slot. Startup messages must never start
      // additional self-sustaining process queues (the original bundle did so).
      if (!inFlight) return;
      inFlight = false;
      stats.inFlight = 0;
      stats.completed++;
      if (!paused && !document.hidden) {
        controller.showObject = data.type === 'found';
        if (controller.showObject) onMarker({data: {type: markerType, matrix: JSON.parse(data.matrix), msg: data.type}});
      }
      schedule();
    }
  };
  worker.onerror = () => {
    tracker.dispose();
    window.dispatchEvent(new Event('arjs-nft-error'));
  };

  function initialize() {
    if (initialized || disposed || !video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
    initialized = true;
    canvas.width = width;
    canvas.height = height;
    context = canvas.getContext('2d', {willReadFrequently: true});
    worker.postMessage({type: 'init', pw: width, ph: height, marker: markerUrl, param: new URL(controller.cameraParam, document.baseURI).href});
  }

  function attachVideo(event) {
    if (video || disposed) return;
    video = event?.detail?.component || document.getElementById('arjs-video');
    if (!video) return;
    window.removeEventListener('arjs-video-loaded', attachVideo);
    video.addEventListener('loadeddata', initialize);
    video.addEventListener('resize', initialize);
    initialize();
  }

  const tracker = {
    stats,
    pause() {
      paused = true;
      clearTimeout(timer);
      timer = undefined;
    },
    resume() {
      paused = false;
      schedule();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clearTimeout(timer);
      window.removeEventListener('arjs-video-loaded', attachVideo);
      video?.removeEventListener('loadeddata', initialize);
      video?.removeEventListener('resize', initialize);
      worker.onmessage = worker.onerror = null;
      worker.terminate();
      stats.inFlight = 0;
    }
  };
  controls._nftTracker = tracker;
  window.addEventListener('arjs-video-loaded', attachVideo);
  attachVideo(); // Camera data may already be ready when the marker is created.
  return tracker;
}

export function configureARScene(scene) {
  let video, resizeTimer, stopped = false, paused = false, userPaused = false, lastFrame = -Infinity;
  const trackers = () => scene.systems?.arjs?._arSession?.arContext?._arMarkersControls || [];
  function frame(time, xrFrame) {
    if (stopped || paused || document.hidden || time - lastFrame < 1000 / 30 - 0.5) return;
    lastFrame = time;
    scene.render(time, xrFrame);
  }
  function resize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (stopped || !video?.videoWidth || !video.videoHeight) return;
      scene.resize();
      const session = scene.systems?.arjs?._arSession;
      session?.onResize();
      // A-Frame marks its canvas as managed, so AR.js otherwise skips this
      // alignment. Keep the overlay and the camera crop identical in portrait.
      if (scene.canvas) session?.arSource.copyElementSizeTo(scene.canvas);
    }, 100);
  }
  function onVideo(event) {
    video = event.detail.component;
    if (stopped) {
      video.srcObject?.getTracks().forEach(track => track.stop());
      video.hidden = true;
      window.removeEventListener('arjs-video-loaded', onVideo);
      return;
    }
    video.addEventListener('resize', resize);
    video.addEventListener('loadeddata', resize);
    if (paused || document.hidden) setPaused(true);
    resize();
  }
  function onRenderStart() {
    // A DPR of 3 draws nine times as many pixels as 1 on Android flagships.
    scene.renderer.setPixelRatio(1);
    scene.renderer.setAnimationLoop(frame);
    if (document.hidden) setPaused(true);
    resize();
  }
  function setPaused(value) {
    if (stopped) return;
    paused = value;
    trackers().forEach(control => control._nftTracker?.[value ? 'pause' : 'resume']());
    video?.srcObject?.getTracks().forEach(track => { track.enabled = !value; });
    if (value) {
      video?.pause();
      scene.pause();
      scene.renderer?.setAnimationLoop(null);
    } else {
      video?.play().catch(() => window.dispatchEvent(new Event('camera-error')));
      scene.play();
      lastFrame = -Infinity;
      scene.renderer?.setAnimationLoop(frame);
      resize();
    }
  }
  function onVisibility() { setPaused(userPaused || document.hidden); }
  function dispose() {
    if (stopped) return;
    setPaused(true);
    stopped = true;
    clearTimeout(resizeTimer);
    trackers().forEach(control => control._nftTracker?.dispose());
    const source = video || document.getElementById('arjs-video');
    source?.srcObject?.getTracks().forEach(track => track.stop());
    if (source) source.hidden = true;
    scene.hidden = true;
    document.body.classList.add('ar-paused');
    video?.removeEventListener('resize', resize);
    video?.removeEventListener('loadeddata', resize);
    // A permission prompt may resolve after an initialization error or exit.
    // Keep the listener until that late stream arrives so it is released too.
    if (video) window.removeEventListener('arjs-video-loaded', onVideo);
    window.removeEventListener('resize', resize);
    window.removeEventListener('orientationchange', resize);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', dispose);
  }
  scene.addEventListener('renderstart', onRenderStart, {once: true});
  window.addEventListener('arjs-video-loaded', onVideo);
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', dispose);
  window.addEventListener('pageshow', event => {
    // A page restored from bfcache has stopped tracks and a terminated worker.
    if (event.persisted) window.location.reload();
  });
  return {
    pause() { userPaused = true; setPaused(true); },
    resume() { userPaused = false; setPaused(document.hidden); },
    dispose
  };
}
