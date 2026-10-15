const assert = require('node:assert/strict');
const { loadScripts, createGame, hold } = require('../testUtils/pullupGameplayHarness');
const scripts = loadScripts();

function pose(progress, feet = 'hidden', scale = 1) {
  const points = Array.from({length:33}, () => ({x:0,y:0,visibility:0}));
  for (const [l,r,x,y] of [
    [11,12,.42,.3+.15*progress], [23,24,.43,.52+.16*progress],
    [25,26,.44-.10*progress,.72-.015*progress],
  ]) {
    points[l]={x,y,visibility:1}; points[r]={x:1-x,y,visibility:1};
  }
  if(feet==='visible') for(const i of [27,28,29,30,31,32]) {
    points[i]={x:i%2?.45:.55,y:.94,visibility:1};
  }
  if(feet==='offscreen') for(const i of [27,28,29,30,31,32]) {
    points[i]={x:i%2?-.4:1.4,y:1.5,visibility:1};
  }
  return points.map(p=>({...p,x:.5+(p.x-.5)*scale,y:.5+(p.y-.5)*scale}));
}

function tracker(diagnostics = false) {
  const messages=[];
  const result = new Function('CONFIG', 'performance', 'postRN', scripts.form +
    ';return {update:updateExperimentalFormPose,calibrate:validateExperimentalCalibration,'+
    'save:saveExperimentalCalibration,check:validateExperimentalGameplay,'+
    'metrics:function(){return formCurrentMetrics;},smooth:getExperimentalTrackYSmooth,reset:resetExperimentalFormTracking};'
  )({exercise:'squats',trackingMode:'form-test',squatDiagnostics:diagnostics}, {now:()=>2000},message=>messages.push(message));
  return {...result,messages};
}

function calibratedTracker(feet='hidden', scale=1) {
  const t=tracker();
  t.update(pose(0,feet,scale),100);
  assert.equal(t.calibrate('top').valid,true);
  t.save('top');
  t.update(pose(1,feet,scale),1500);
  assert.equal(t.calibrate('bottom').valid,true);
  t.save('bottom');
  return t;
}

function gameWithSquats() {
  // Reuse the real calibration/physics harness, changing only its exercise config.
  return createGame({...scripts,form:"CONFIG.exercise='squats';\n"+scripts.form});
}
function enterPlay(game, feet, scale) {
  let t=hold(game,pose(0,feet,scale),100,3600);
  assert.equal(game.summary().state,'waitBottom');
  t=hold(game,pose(1,feet,scale),t,2000);
  assert.equal(game.summary().state,'countdown');
  while(game.summary().state==='countdown' && t<15000) {
    game.step(t,pose(1,feet,scale)); t+=25;
  }
  assert.equal(game.summary().state,'play');
  return t;
}

test.each(['hidden','visible','offscreen'])('calibrates and plays squats with feet %s', feet=>{
  const t=calibratedTracker(feet);
  for(let i=0;i<=100;i++) {
    const p=(1-Math.cos(i/100*Math.PI*4))/2;
    t.update(pose(p,feet),2000+i*25);
    assert.equal(t.check(1-p).valid,true);
  }
});

test.each([.65,1,1.15])('actual bird flight is identical when feet disappear/reappear at camera scale %s', scale=>{
  const visible=gameWithSquats(), cropped=gameWithSquats();
  const t=enterPlay(visible,'visible',scale);
  assert.equal(enterPlay(cropped,'hidden',scale),t);
  const birdHeights=[];
  for(let i=0;i<=240;i++) {
    const p=(1+Math.cos(i/240*Math.PI*6))/2;
    const now=t+i*25;
    visible.step(now,pose(p,'visible',scale));
    const points=pose(p,['hidden','visible','offscreen'][i%3],scale);
    // Include one visible ankle with an arbitrary angle; it must have no effect.
    if(i%4===0) points[27]={x:.1,y:.1,visibility:1};
    cropped.step(now,points);
    const a=visible.summary(), b=cropped.summary();
    assert.equal(a.state,'play'); assert.equal(b.state,'play');
    assert.equal(a.crashReason,''); assert.equal(b.crashReason,'');
    assert.equal(a.birdNorm,b.birdNorm);
    assert.equal(a.norm,b.norm);
    birdHeights.push(b.birdNorm);
  }
  assert.ok(Math.max(...birdHeights)-Math.min(...birdHeights)>.9,'full flight range retained');
  assert.ok(birdHeights.slice(1).every((h,i)=>Math.abs(h-birdHeights[i])<.06),'no jumps in smooth squat sequence');
});

test('does not even read ankle, heel, or toe landmarks for squats',()=>{
  const t=calibratedTracker();
  const points=pose(.5);
  for(let i=27;i<33;i++) Object.defineProperty(points,i,{get(){throw Error('lower leg accessed');}});
  t.update(points,2000);
  assert.equal(t.check(.5).valid,true);
});

test('head and hand movements cannot change squat control',()=>{
  const t=calibratedTracker();const points=pose(.5);t.update(points,2000);
  const before=t.metrics().controllerY;
  for(const i of [0,1,2,3,4,5,6,7,8,9,10,13,14,15,16,17,18,19,20,21,22]) points[i]={x:.5,y:.8,visibility:1};
  t.update(points,2025);
  assert.equal(t.metrics().controllerY,before);assert.equal(t.check(.5).valid,true);
});

test('rejects folding at the waist, an unchanged standing pose, and whole-body translation at bottom',()=>{
  for(const kind of ['waist','still','translation']) {
    const t=tracker();t.update(pose(0),100);t.save('top');
    const points=pose(0);
    if(kind==='waist') for(const i of [11,12]) points[i].y=.5;
    if(kind==='translation') for(const i of [11,12,23,24,25,26]) points[i].y+=.12;
    t.update(points,2000);assert.equal(t.calibrate('bottom').valid,false,kind);
  }
});

test('accepts natural torso lean and deeper/taller movement beyond calibration',()=>{
  const t=calibratedTracker();
  const lean=pose(.8);lean[11].y+=.04;lean[12].y+=.04;
  t.update(lean,2000);assert.equal(t.check(.2).valid,true);
  for(const p of [-.15,1.15]) {t.update(pose(p),2025);assert.equal(t.check(p<0?1:0).valid,true);}
});

test.each([11,12])('brief loss of torso landmark %s holds control instead of switching sides', index=>{
  const t=calibratedTracker();t.update(pose(.5),2000);const before=t.smooth();
  const points=pose(.5);points[index].visibility=0;
  t.update(points,2025);
  assert.equal(t.metrics().controllerY,null);assert.equal(t.smooth(),before);
  assert.equal(t.check(.5).valid,false);
  t.update(pose(.5),2050);assert.equal(t.check(.5).valid,true);
});

test('requires observed upper legs, but tolerates one knee hidden behind the other',()=>{
  const t=calibratedTracker();const points=pose(.5);points[25].visibility=0;
  t.update(points,2000);assert.equal(t.check(.5).valid,true);
  points[26].y=1.2;t.update(points,2025);assert.equal(t.check(.5).valid,false);
});

test('rejects off-frame or malformed torso estimates',()=>{
  const t=tracker();
  for(const value of [1.2,-.2,NaN,Infinity]) {
    const points=pose(0);points[23].y=value;t.update(points,100);
    assert.equal(t.calibrate('top').valid,false);assert.equal(t.metrics().controllerY,.3);
  }
});

test('reset clears squat references and accepts fresh calibration at a different distance',()=>{
  const t=calibratedTracker();t.reset();t.update(pose(0,'hidden',.7),3000);
  assert.equal(t.calibrate('top').valid,true);t.save('top');t.update(pose(1,'hidden',.7),4500);
  assert.equal(t.calibrate('bottom').valid,true);
});


test('squat diagnostics are silent unless explicitly enabled',()=>{
  const t=tracker();for(let now=100;now<=6000;now+=25)t.update(pose(.5),now);
  assert.equal(t.messages.length,0);
});

test('preview diagnostics are bounded and leave control unchanged',()=>{
  const normal=tracker(), diagnostic=tracker(true);
  for(let now=100;now<=6000;now+=25) {
    const points=pose((1-Math.cos(now/1000))/2);
    normal.update(points,now);diagnostic.update(points,now);
    assert.equal(normal.smooth(),diagnostic.smooth());
  }
  assert.equal(diagnostic.messages.length,3);
  for(const message of diagnostic.messages) {
    assert.equal(message.type,'squatdebug');const trace=JSON.parse(message.message);
    assert.equal(trace.version,'2026-10-15.3-shoulder-squats');
    assert.ok(trace.rows.length<=60);
    assert.ok(trace.rows.every(row=>row.points.every(p=>p[0]<27)));
  }
});


test.each([.65,1,1.15])('hip occlusion, drift and hands across the body cannot change actual flight at scale %s',scale=>{
  const clean=gameWithSquats(), occluded=gameWithSquats();
  const t=enterPlay(clean,'hidden',scale);assert.equal(enterPlay(occluded,'hidden',scale),t);
  for(let i=0;i<=400;i++) {
    const progress=(1+Math.cos(i/200*Math.PI*2))/2;
    const points=pose(progress,'hidden',scale);
    const changed=points.map(p=>({...p}));
    for(const index of [23,24]) {
      // Sustained missing hips exceeds the existing 1600 ms form-loss grace.
      changed[index]=i<200?{x:.5,y:.8,visibility:0}:{x:.2,y:i%2?.05:.95,visibility:1};
    }
    for(const index of [13,14,15,16,17,18,19,20,21,22])changed[index]={x:.5,y:.6,visibility:1};
    clean.step(t+i*25,points);occluded.step(t+i*25,changed);
    assert.equal(occluded.summary().state,'play');assert.equal(occluded.summary().crashReason,'');
    assert.equal(occluded.summary().birdNorm,clean.summary().birdNorm);
    assert.equal(occluded.summary().norm,clean.summary().norm);
  }
});

test('hip drift alone cannot move shoulder control and a fresh calibration uses shoulder height',()=>{
  const t=calibratedTracker();const points=pose(.5);t.update(points,2000);
  assert.equal(t.metrics().controllerY,.375);
  for(const value of [0,.25,.9,NaN,Infinity]) {
    points[23].y=value;points[24].y=value;t.update(points,2025);
    assert.equal(t.metrics().controllerY,.375);assert.equal(t.check(.5).valid,true);
  }
});

test('moving shoulders through a squat still controls flight when both hips disappear',()=>{
  const t=calibratedTracker();let previous=null;
  for(let i=0;i<=40;i++) {
    const points=pose(i/40);points[23].visibility=0;points[24].visibility=0;
    t.update(points,2000+i*50);const value=t.metrics().controllerY;
    if(previous!==null)assert.ok(value>previous);
    assert.equal(t.check(1-i/40).valid,true);previous=value;
  }
});

test('calibration still requires an observed squat and sufficient shoulder travel',()=>{
  const t=tracker();t.update(pose(0),100);t.save('top');
  const insufficient=pose(1);insufficient[11].y=.35;insufficient[12].y=.35;
  t.update(insufficient,2000);assert.equal(t.calibrate('bottom').valid,false);
  const covered=pose(1);covered[23].visibility=0;covered[24].visibility=0;
  t.update(covered,2025);assert.equal(t.calibrate('bottom').valid,false);
});
