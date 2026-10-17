// Android development curl preview only. Same model and controller; inference
// runs in a worker so synchronous detectForVideo cannot block the game loop.
export const SCRIPT_CURL_WORKER_TRACKING = `
var curlTrackingThread = 'main';
var curlFrameAgeMs = null;

function curlPoseWorkerMain() {
  var detector = null;
  self.onmessage = async function(event) {
    var data = event.data;
    if (data.type === 'init') {
      try {
        var vision = await import(data.moduleUrl);
        var files = await vision.FilesetResolver.forVisionTasks(data.wasmUrl);
        detector = await vision.PoseLandmarker.createFromOptions(files, {
          baseOptions: {delegate:'GPU', modelAssetPath:data.modelUrl},
          canvas:new OffscreenCanvas(1,1), runningMode:'VIDEO', numPoses:1
        });
        self.postMessage({type:'ready'});
      } catch (error) { self.postMessage({type:'init-error',message:String(error.message || error)}); }
    } else if (data.type === 'frame') {
      var start = performance.now();
      try {
        var result = detector.detectForVideo(data.image, data.capturedAt);
        self.postMessage({type:'result',id:data.id,capturedAt:data.capturedAt,
          inferenceMs:performance.now()-start,
          result:{landmarks:result.landmarks,worldLandmarks:result.worldLandmarks}});
      } catch (error) {
        self.postMessage({type:'frame-error',id:data.id,capturedAt:data.capturedAt,
          message:String(error.message || error)});
      } finally { data.image.close(); }
    }
  };
}

function createCurlWorkerTracker() {
  return new Promise(function(resolve,reject) {
    if (typeof Worker !== 'function' || typeof OffscreenCanvas !== 'function' ||
        typeof createImageBitmap !== 'function') {
      reject(new Error('Worker camera APIs unavailable')); return;
    }
    var url = URL.createObjectURL(new Blob(['('+curlPoseWorkerMain.toString()+')();'],{type:'text/javascript'}));
    var worker;
    try { worker = new Worker(url); }
    catch (error) { URL.revokeObjectURL(url); reject(error); return; }
    var ready = false, sequence = 0, timer = null;
    var tracker = {
      curlWorker:true, busy:false, closed:false,
      close:function() {
        if (tracker.closed) { return; }
        tracker.closed=true; tracker.busy=false;
        clearTimeout(timer); worker.terminate(); URL.revokeObjectURL(url);
      },
      submitFrame:function(source,capturedAt) {
        if (tracker.closed || tracker.busy) { return false; }
        tracker.busy=true;
        var id=++sequence;
        // One frame in flight. Never queue old frames behind camera inference.
        Promise.resolve().then(function(){return createImageBitmap(source);}).then(function(bitmap) {
          if (tracker.closed || !trackingLoopActive) { bitmap.close(); tracker.busy=false; return; }
          try { worker.postMessage({type:'frame',id:id,capturedAt:capturedAt,image:bitmap},[bitmap]); }
          catch (error) { bitmap.close(); throw error; }
        }).catch(function(error) {
          tracker.busy=false;
          if (!tracker.closed) { console.error('Curl frame capture failed',error); }
        });
        return true;
      }
    };
    function failStartup(error) { tracker.close(); reject(error); }
    worker.onmessage=function(event) {
      var data=event.data;
      if (tracker.closed) { return; }
      if (data.type==='ready') {
        ready=true; clearTimeout(timer);
        curlTrackingThread='worker'; trackerDelegate='GPU'; resolve(tracker);
      } else if (data.type==='init-error') { failStartup(new Error(data.message)); }
      else if ((data.type==='result' || data.type==='frame-error') && tracker.busy && data.id===sequence) {
        tracker.busy=false;
        if (!trackingLoopActive) { return; }
        curlLastInferenceMs=data.type==='result' ? data.inferenceMs : null;
        curlFrameAgeMs=performance.now()-data.capturedAt;
        // Freshness refers to the captured image, not the later worker reply.
        acceptTrackedPose(data.type==='result' ? data.result : null,data.capturedAt);
        if (data.type==='frame-error') { console.error('Curl worker detection failed',data.message); }
        // Begin the newest available frame immediately, without adding a
        // render-frame wait between detections. Still only one in flight.
        if (!tracker.closed && trackingLoopActive && typeof video !== 'undefined' &&
            video.readyState >= 2 && video.currentTime !== lastVideoTime &&
            tracker.submitFrame(video,performance.now())) { lastVideoTime=video.currentTime; }
      }
    };
    worker.onerror=function(event) {
      if (!ready) { failStartup(new Error(event.message || 'Curl worker failed')); }
      else { console.error('Curl worker stopped',event.message); tracker.close(); }
    };
    timer=setTimeout(function(){failStartup(new Error('Curl worker startup timed out'));},30000);
    worker.postMessage({type:'init',moduleUrl:REMOTE_VISION_BASE_URL+'/vision_bundle.mjs',
      wasmUrl:REMOTE_VISION_BASE_URL+'/wasm',modelUrl:REMOTE_MODEL_URL});
  });
}
`;
