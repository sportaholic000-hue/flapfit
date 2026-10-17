
const assert = require('node:assert/strict');
const { SCRIPT_CURL_TRACKING } = require('../html/scriptCurlTracking');
const { loadScripts, createGame } = require('../testUtils/pullupGameplayHarness');
const scripts = loadScripts();
function filter() {
  return new Function(SCRIPT_CURL_TRACKING + ';return {run:filterCurlController,reset:resetCurlControlFilter};')();
}
function input(left, right = left) { return { leftWrist: { y: left }, rightWrist: { y: right } }; }
function pose(down) {
  const p = Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }));
  for (const [l,r,x,y] of [[11,12,.35,.31],[13,14,.35,.5],[23,24,.4,.72]]) {
    p[l]={x,y,visibility:1};p[r]={x:1-x,y,visibility:1};
  }
  const x=.35-.12*Math.sin(Math.PI*down), y=.5-.17*Math.cos(Math.PI*down);
  p[15]={x,y,visibility:1};p[16]={x:1-x,y,visibility:1};return p;
}
function game(legacy = false) {
  let form = scripts.form;
  if (legacy) form = form.replace("return CONFIG.exercise === 'biceps' && formTrackY !== null ? formTrackYSmooth : formTrackY;", 'return formTrackY;');
  return createGame({...scripts,form:"CONFIG.exercise='biceps';CONFIG.curlDiagnostics=true;\n"+form});
}
function camera(g,t,p) { for(let n=t-48;n<t;n+=16)g.render(n);g.cameraFrame(t,p); }
function enter(g) {
  let t=50;for(;t<=4000;t+=50)camera(g,t,pose(0));assert.equal(g.summary().state,'waitBottom');
  for(;t<=6500;t+=50)camera(g,t,pose(1));assert.equal(g.summary().state,'countdown');
  for(;t<=10000;t+=50)camera(g,t,pose(.5));assert.equal(g.summary().state,'play');return t;
}
test('calibration filter suppresses a wrist spike and follows a changed hold',()=>{
  const f=filter();for(let t=50;t<=500;t+=50)f.run(input(.4),t);
  assert.equal(f.run(input(.4,.46),550),.4);assert.equal(f.run(input(.4),600),.4);
  for(let t=650;t<=800;t+=50)f.run(input(.36),t);
  assert.ok(f.run(input(.36),850)<.364,'rapid partial change must reach 90% within 200 ms');
});
test('tiny partial changes and holds are not a dead zone or a frozen pose',()=>{
  const f=filter();for(let t=50;t<=500;t+=50)f.run(input(.4),t);
  let v;for(let t=550;t<=2500;t+=50)v=f.run(input(.399),t);
  assert.ok(Math.abs(v-.399)<.00001);
  for(let t=2550;t<=4500;t+=50)v=f.run(input(.402),t);
  assert.ok(Math.abs(v-.402)<.00001);
});
test('duplicate times, interruption and new-run reset do not reuse noise history',()=>{
  const f=filter();f.run(input(.4),100);assert.equal(f.run(input(.9),100),.4);
  assert.equal(f.run(input(.9),90),.4);assert.equal(f.run(input(.7),400),.7);
  f.reset();assert.equal(f.run(input(.2),50),.2);
});
test('noisy top hold calibrates without lowering the pose, drift or duration requirements',()=>{
  const old=game(true),now=game();for(let t=50;t<=6000;t+=50){const p=pose(0);p[16].y+=(Math.floor(t/50)%3===0?.075:0);camera(old,t,p);camera(now,t,p);}
  assert.equal(old.summary().state,'waitTop');assert.equal(now.summary().state,'waitBottom');
});
test('calibration cannot complete from repeated renders or after leaving the camera',()=>{
  const g=game();camera(g,2100,pose(0));for(let t=2116;t<=2700;t+=16)g.render(t);assert.equal(g.summary().progress,0);
  const h=game();for(let t=2100;t<=3100;t+=50)camera(h,t,pose(0));assert.equal(h.summary().state,'waitTop');
  camera(h,3150,null);assert.equal(h.summary().progress,0);
  for(let t=3200;t<=3850;t+=50)camera(h,t,pose(0));assert.equal(h.summary().state,'waitTop');
});
test('curl filter cannot calibrate with either arm absent',()=>{
  for(const wrist of [15,16]){const g=game();const p=pose(0);p[wrist].visibility=0;for(let t=50;t<=6000;t+=50)camera(g,t,p);assert.equal(g.summary().state,'waitTop');assert.equal(g.summary().progress,0);}
});
test('partial holds and quick reversals keep flight and pipes moving without a form crash',()=>{
  const g=game();let t=enter(g);const x=g.summary().pipeX;const birds=[];
  for(const down of [.25,.7,.35,.6,.45]){for(let i=0;i<12;i++,t+=50)camera(g,t,pose(down));birds.push(g.summary().birdNorm);}
  assert.equal(g.summary().crashReason,'');assert.equal(g.summary().state,'play');assert.ok(g.summary().pipeX<x);
  assert.ok(birds[0]>birds[1]+.25);assert.ok(birds[2]>birds[1]+.2);assert.ok(birds[2]>birds[3]+.15);
});
test('unilateral and alternating curls still fail using raw two-arm evidence',()=>{
  for(const alternating of [false,true]){const g=game();let t=enter(g);for(let i=0;i<70;i++,t+=50){const p=pose(0),b=pose(1);if(alternating&&i%2)p[15]=b[15];else p[16]=b[16];camera(g,t,p);}const ended=g.messages.find(m=>m.type==='gameover');assert.equal(ended.reason,'form');assert.equal(ended.fatalCheckKey,'biceps-both-arms');}
});
test('both missing wrists still end flight; filter does not pause the world',()=>{
  const g=game();let t=enter(g);const x=g.summary().pipeX;const p=pose(.5);p[15].visibility=0;p[16].visibility=0;
  for(let i=0;i<70;i++,t+=50)camera(g,t,p);
  assert.ok(g.summary().pipeX<x);assert.equal(g.messages.find(m=>m.type==='gameover').reason,'form');
});

test('gameplay restores exactly the original 0.55 response with no median or adaptive delay',()=>{
  const g=game();let t=enter(g);let state=g.summary();let previous=state.bottomY-state.norm*(state.bottomY-state.topY);
  for(const down of [.3,.7,.2,.65,.4,.55]){const p=pose(down);const expected=previous+(p[15].y-previous)*.55;camera(g,t,p);state=g.summary();const actual=state.bottomY-state.norm*(state.bottomY-state.topY);assert.ok(Math.abs(actual-expected)<1e-10);previous=expected;t+=50;}
});
test('curl timing records render and detector duration without changing flight',()=>{
  const g=game();let t=enter(g);for(let i=0;i<60;i++,t+=50)camera(g,t,pose(.5));
  const batches=g.messages.filter(m=>m.type==='curldebug').map(m=>JSON.parse(m.message));
  assert.ok(batches.some(b=>b.render.count>0&&b.render.totalMs>0));
  assert.ok(batches.flatMap(b=>b.rows).some(r=>r.state==='play'&&r.inferenceMs===0));
  assert.ok(batches.every(b=>b.controller==='curl-cal-filter-flight-original'));
  assert.equal(g.summary().state,'play');assert.equal(g.summary().crashReason,'');
});

test.each([15,16])('a curled arm cannot compensate for the other straight arm during Step 1: %s',wrist=>{
  const g=game(),p=pose(0),straight=pose(1);p[wrist]=straight[wrist];
  for(let t=50;t<=6000;t+=50)camera(g,t,p);
  assert.equal(g.summary().state,'waitTop');assert.equal(g.summary().progress,0);
  assert.ok(g.overlays.some(o=>o.message.includes('BOTH hands')));
});
test.each([15,16])('alternating which arm is curled cannot complete Step 1: %s',first=>{
  const g=game(),straight=pose(1);
  for(let t=50;t<=6000;t+=50){const p=pose(0),wrist=Math.floor(t/500)%2?first:(first===15?16:15);p[wrist]=straight[wrist];camera(g,t,p);}
  assert.equal(g.summary().state,'waitTop');assert.equal(g.summary().progress,0);
});
test.each([15,16])('Step 2 needs elbow extension in each arm, not just lowered wrists: %s',wrist=>{
  const g=game();for(let t=50;t<=4000;t+=50)camera(g,t,pose(0));assert.equal(g.summary().state,'waitBottom');
  const p=pose(1);p[wrist].y=.48;p[wrist===15?13:14].y=.65;
  for(let t=4050;t<=7500;t+=50)camera(g,t,p);
  assert.equal(g.summary().state,'waitBottom');assert.equal(g.summary().progress,0);
  assert.ok(g.overlays.some(o=>o.message.includes('BOTH elbows')));
});
test('abandoned Full model experiment is absent from the runtime and app configuration',()=>{
  assert.ok(!scripts.core.includes('pose_landmarker_full'));
  assert.ok(scripts.core.includes('modelAssetPath: REMOTE_MODEL_URL'));
  const fs=require('node:fs'),path=require('node:path');const screen=fs.readFileSync(path.resolve(__dirname,'../../../app/game.tsx'),'utf8');
  assert.ok(!screen.includes('curlFullModelPreview'));
});

// Front-facing sagittal curls: depth carries the forearm bend. At 90 degrees
// the wrist and elbow project onto the same pixel despite a valid visible arm.
function depthPose(angle, otherAngle = angle) {
  const p = pose(0), world = Array.from({length:33},()=>({x:0,y:0,z:0,visibility:0}));
  for (const [side,a] of [[0,angle],[1,otherAngle]]) {
    const x=side?.65:.35, radians=a*Math.PI/180;
    p[11+side]={x,y:.31,visibility:1};p[13+side]={x,y:.5,visibility:1};
    p[15+side]={x,y:.5-.17*Math.cos(radians),visibility:1};
    world[11+side]={x,y:.31,z:0,visibility:1};world[13+side]={x,y:.5,z:0,visibility:1};
    world[15+side]={x,y:p[15+side].y,z:-.17*Math.sin(radians),visibility:1};
  }
  return {p,world};
}
function depthCamera(g,t,angle,otherAngle,worldEdit) {
  const {p,world}=depthPose(angle,otherAngle);if(worldEdit)worldEdit(world,p);
  for(let n=t-48;n<t;n+=16)g.render(n);g.cameraFrame(t,p,world);
}
function depthEnter(g) {
  let t=50;for(;t<=4000;t+=50)depthCamera(g,t,10);
  assert.equal(g.summary().state,'waitBottom');
  for(;t<=6500;t+=50)depthCamera(g,t,170);
  assert.equal(g.summary().state,'countdown');
  for(;t<=10000;t+=50)depthCamera(g,t,90);
  assert.equal(g.summary().state,'play');return t;
}
test('3D bend verification handles front-facing partial holds above, at and below 90 degrees',()=>{
  const g=game();let t=depthEnter(g);const x=g.summary().pipeX,heights=[];
  for(const angle of [80,90,100,65,115,85]){
    for(let i=0;i<44;i++,t+=50)depthCamera(g,t,angle);
    assert.equal(g.summary().crashReason,'');assert.equal(g.summary().state,'play');heights.push(g.summary().birdNorm);
  }
  assert.ok(g.summary().pipeX<x);assert.ok(heights[0]>heights[1]&&heights[1]>heights[2]);
  assert.ok(heights[3]>heights[4]+.35);
});
test('projected-angle check reproduces a false rejection on the same ideal front-facing partial hold',()=>{
  const legacy=createGame({...scripts,form:"CONFIG.exercise='biceps';CONFIG.curlDiagnostics=true;\n"+scripts.form.replace('var worldReferences = curlUsesWorldBend();','var worldReferences = false;')});
  let t=depthEnter(legacy);for(let i=0;i<80;i++,t+=50)depthCamera(legacy,t,80);
  assert.equal(legacy.messages.find(m=>m.type==='gameover').reason,'form');
});
test.each([false,true])('3D references preserve unilateral and alternating curl rejection %s',alternating=>{
  const g=game();let t=depthEnter(g);
  for(let i=0;i<80;i++,t+=50)depthCamera(g,t,alternating&&i%2?170:10,alternating&&i%2?10:170);
  assert.equal(g.messages.find(m=>m.type==='gameover').fatalCheckKey,'biceps-both-arms');
});
test('a 3D-calibrated run does not silently switch to projected angles when depth observations disappear',()=>{
  const g=game();let t=depthEnter(g);const x=g.summary().pipeX;
  for(let i=0;i<80;i++,t+=50)depthCamera(g,t,80,80,world=>world[16].visibility=0);
  assert.equal(g.messages.find(m=>m.type==='gameover').reason,'form');assert.ok(g.summary().pipeX<x);
});
test('raising straight whole arms still fails the unchanged 55-degree bend check with 3D references',()=>{
  const g=game();let t=depthEnter(g);
  // Keep calibrated wrists together around 70% height while a straight arm
  // geometry reports no elbow bend. The independent bend check must reject it.
  for(let i=0;i<80;i++,t+=50)depthCamera(g,t,65,65,world=>{
    for(const side of [0,1])world[15+side]={...world[13+side],y:.67,z:0};
  });
  assert.equal(g.messages.find(m=>m.type==='gameover').reason,'form');
});
test('3D bend verification is independent of diagnostic logging',()=>{
  const on=game(),off=createGame({...scripts,form:"CONFIG.exercise='biceps';CONFIG.curlDiagnostics=false;\n"+scripts.form});
  let t=depthEnter(on);assert.equal(depthEnter(off),t);
  for(const angle of [80,90,100,65,115])for(let i=0;i<44;i++,t+=50){depthCamera(on,t,angle);depthCamera(off,t,angle);assert.deepEqual(on.summary(),off.summary());}
  assert.ok(!off.messages.some(m=>m.type==='curldebug'));
});

test('a compressed 3D calibration span does not weaken straight-arm rejection',()=>{
  const rules=new Function(scripts.form+`;return function(value,norm){
    formTopMetrics={elbowAngle:25,curlWorldAngle:70};
    formBottomMetrics={elbowAngle:165,curlWorldAngle:150};
    return validateCurlElbowBend({curlWorldAngle:value},norm);
  };`)();
  assert.equal(rules(150,.5).valid,false);
  assert.equal(rules(136,.48).valid,true);
});
