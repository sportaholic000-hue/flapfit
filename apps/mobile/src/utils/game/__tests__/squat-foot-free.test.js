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


test('iOS squat tracking has no preview trace or bridge reporting',()=>{
  const t=tracker(true);
  for(let now=100;now<=6000;now+=25)t.update(pose(.5),now);
  assert.equal(t.messages.length,0);
  assert.equal(scripts.form.includes('squatdebug'),false);
  assert.equal(scripts.form.includes('sampleSquatTrace'),false);
});

test.each([.65,1,1.15])('brief hip occlusion, measured-scale noise and hands across the body preserve flight at scale %s',scale=>{
  const clean=gameWithSquats(), occluded=gameWithSquats();
  const t=enterPlay(clean,'hidden',scale);assert.equal(enterPlay(occluded,'hidden',scale),t);
  for(let i=0;i<=400;i++) {
    const progress=(1+Math.cos(i/200*Math.PI*2))/2;
    const points=pose(progress,'hidden',scale);
    const changed=points.map(p=>({...p}));
    for(const index of [23,24]) {
      // Brief occlusion and noisy estimates like the recorded close run.
      changed[index]=i%80<8?{...points[index],visibility:0}:
        {...points[index],y:points[index].y+(i%2?.012:-.012)*scale};
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
    assert.equal(t.metrics().controllerY,.375);
  }
});

test('missing hips do not move the shoulder controller but cannot verify a squat',()=>{
  const t=calibratedTracker();let previous=null;
  for(let i=0;i<=40;i++) {
    const points=pose(i/40);points[23].visibility=0;points[24].visibility=0;
    t.update(points,2000+i*50);const value=t.metrics().controllerY;
    if(previous!==null)assert.ok(value>previous);
    assert.equal(t.check(1-i/40).valid,false);previous=value;
  }
});

test('calibration still requires an observed squat and sufficient shoulder travel',()=>{
  const t=tracker();t.update(pose(0),100);t.save('top');
  const insufficient=pose(1);insufficient[11].y=.35;insufficient[12].y=.35;
  t.update(insufficient,2000);assert.equal(t.calibrate('bottom').valid,false);
  const covered=pose(1);covered[23].visibility=0;covered[24].visibility=0;
  t.update(covered,2025);assert.equal(t.calibrate('bottom').valid,false);
});


test.each(['hold','repeated','translation','partial'])('straight-leg %s cannot sustain flight after proper squat calibration',kind=>{
  const g=gameWithSquats();let t=enterPlay(g,'hidden',1);let failed=false;
  for(let i=0;i<260;i++) {
    const progress=kind==='partial'?.4:kind==='repeated'?(1+Math.cos(i/20*Math.PI*2))/2:1;
    const points=pose(0);
    points[11].y+=.15*progress;points[12].y+=.15*progress;
    if(kind==='translation')for(const index of [23,24,25,26])points[index].y+=.15*progress;
    g.step(t+i*25,points);
    if(g.summary().crashReason==='form'){failed=true;break;}
  }
  assert.ok(failed,'must reject straight-leg movement even with brief upright resets');
});

test('validation cannot accumulate evidence from repeatedly rendering one pose',()=>{
  const g=gameWithSquats();const t=enterPlay(g,'hidden',1);
  const p=pose(0);p[11].y=.45;p[12].y=.45;
  g.step(t,p);
  for(let i=1;i<20;i++)g.render(t+i*25);
  assert.equal(g.summary().crashReason,'');
});

test('reset clears confirmed squat-leg failure for the next calibration',()=>{
  const t=calibratedTracker();const p=pose(0);p[11].y=.45;p[12].y=.45;
  for(let now=2000;now<3500;now+=50)t.update(p,now);
  assert.equal(t.check(0).fatal,true);
  t.reset();t.update(pose(0),4000);t.save('top');t.update(pose(1),4500);t.save('bottom');
  t.update(pose(.5),4550);assert.equal(t.check(.5).valid,true);
});


test('a render loop cannot finish squat calibration using the last camera pose',()=>{
  const g=gameWithSquats();hold(g,pose(0),100,2700);
  assert.equal(g.summary().state,'waitTop');
  for(let t=2825;t<=3450;t+=25)g.render(t);
  assert.equal(g.summary().state,'waitTop');
});

test('empty camera results immediately discard squat calibration evidence',()=>{
  const g=gameWithSquats();hold(g,pose(0),100,2700);
  assert.ok(g.summary().progress>0);
  g.cameraFrame(2825,null);
  assert.equal(g.metrics(),null);assert.equal(g.summary().progress,0);
  for(let t=2850;t<=5000;t+=25)g.cameraFrame(t,null);
  assert.equal(g.summary().state,'waitTop');
  hold(g,pose(0),5025,1000);assert.equal(g.summary().state,'waitTop');
  hold(g,pose(0),6050,500);assert.equal(g.summary().state,'waitBottom');
});

test('an empty camera cannot acquire either calibration position',()=>{
  const g=gameWithSquats();for(let t=100;t<5000;t+=50)g.cameraFrame(t,null);
  assert.equal(g.summary().state,'waitTop');assert.equal(g.summary().topY,null);
  let t=hold(g,pose(0),5000,1600);assert.equal(g.summary().state,'waitBottom');
  t=hold(g,pose(1),t,700);
  for(let now=t;now<t+2000;now+=25)g.cameraFrame(now,null);
  assert.equal(g.summary().state,'waitBottom');assert.equal(g.summary().bottomY,null);
});

test.each(['edge','side','walking'])('squat setup ignores a person at the %s',kind=>{
  const g=gameWithSquats();for(let t=100;t<=6000;t+=25){
    const p=pose(0);if(kind==='edge')for(const i of [11,12,23,24,25,26])p[i].x+=.36;
    if(kind==='side'){p[11].x=.49;p[12].x=.51;}
    if(kind==='walking')for(const i of [11,12,23,24,25,26])p[i].x+=.15*Math.sin(t/700);
    g.step(t,p);
  }
  assert.equal(g.summary().state,'waitTop');assert.equal(g.summary().topY,null);
});


test('a held deep squat cannot establish the standing reference',()=>{
  const g=gameWithSquats();
  hold(g,pose(1),100,6000);
  assert.equal(g.summary().state,'waitTop');
  assert.equal(g.summary().topY,null);
});

test('squat references average the same camera hold as flight',()=>{
  // Use an explicit lexical buffer, just as the assembled game supplies it.
  const src='var stabBuf=[];'+scripts.form+';return {save:saveExperimentalCalibration,set:function(metrics,samples){formCurrentMetrics=metrics;stabBuf=samples;},top:function(){return formTopMetrics;}};';
  const t=new Function('CONFIG',src)({exercise:'squats',trackingMode:'form-test'});
  const a={controllerY:.3,shoulders:{x:.5,y:.3},hips:{x:.5,y:.52},squatThighDrop:.2};
  const b={controllerY:.31,shoulders:{x:.5,y:.31},hips:{x:.5,y:.54},squatThighDrop:.18};
  t.set(b,[{t:100,metrics:a},{t:150,metrics:b}]);t.save('top',100,.305);
  assert.equal(t.top().controllerY,.305);assert.equal(t.top().hips.y,.53);assert.equal(t.top().squatThighDrop,.19);
});


test('camera detector errors clear the squat hold instead of reusing the last person',()=>{
  const g=gameWithSquats();hold(g,pose(0),100,2700);
  assert.ok(g.summary().progress>0);
  const error=new Error('camera observation unavailable');
  const logged=jest.spyOn(console,'error').mockImplementation(()=>{});
  try {
    g.cameraFrame(2825,null,error);
    assert.equal(g.metrics(),null);assert.equal(g.summary().progress,0);
    assert.equal(g.summary().state,'waitTop');
    expect(logged).toHaveBeenCalledWith(error);
    hold(g,pose(0),2850,1000);assert.equal(g.summary().state,'waitTop');
    hold(g,pose(0),3875,500);assert.equal(g.summary().state,'waitBottom');
  } finally {logged.mockRestore();}
});

test('head-only camera frames cannot establish squat calibration',()=>{
  const g=gameWithSquats();
  for(let now=100;now<=6000;now+=25) {
    const points=pose(0).map(p=>({...p,visibility:0}));
    points[0]={x:.5,y:.3+.1*Math.sin(now/100),visibility:1};
    g.cameraFrame(now,points);
  }
  assert.equal(g.summary().state,'waitTop');assert.equal(g.summary().progress,0);
  assert.equal(g.summary().topY,null);
});

test.each(['head-only','missing-legs'])('%s gameplay ends through the existing loss and gravity handling',kind=>{
  const g=gameWithSquats();const t=enterPlay(g,'hidden',1);
  for(let i=0;i<240 && g.summary().state!=='over';i++) {
    const points=pose(.5);
    for(const index of (kind==='head-only'?[11,12,23,24,25,26]:[23,24,25,26]))points[index].visibility=0;
    points[0]={x:.5,y:.3+.1*Math.sin(i/5),visibility:1};
    g.cameraFrame(t+i*25,points);
  }
  assert.equal(g.summary().crashReason,'form');
  assert.equal(g.summary().state,'over');
  assert.ok(g.messages.some(message=>message.type==='gameover'));
});
