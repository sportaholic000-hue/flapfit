const assert=require('node:assert/strict');
const {loadScripts,createGame,hold}=require('../testUtils/pullupGameplayHarness');
const scripts=loadScripts();
function curlPose(progress) {
  const points=Array.from({length:33},()=>({x:0,y:0,visibility:0}));
  for(const [l,r,x,y] of [[11,12,.42,.35],[13,14,.42,.53],[15,16,.42,.37+.35*progress],[23,24,.43,.67]]) {
    points[l]={x,y,visibility:1};points[r]={x:1-x,y,visibility:1};
  }
  return points;
}
function game(enabled,exercise='biceps') {
  return createGame({...scripts,form:'CONFIG.exercise='+JSON.stringify(exercise)+';CONFIG.curlDiagnostics='+JSON.stringify(enabled)+';\n'+scripts.form});
}
function traces(g){return g.messages.filter(m=>m.type==='curldebug').map(m=>JSON.parse(m.message));}
function enter(g){let t=hold(g,curlPose(0),100,3600);assert.equal(g.summary().state,'waitBottom');t=hold(g,curlPose(1),t,2000);assert.equal(g.summary().state,'countdown');while(g.summary().state==='countdown'){g.step(t,curlPose(1));t+=25;}return t;}
test.each([false,undefined])('curl trace is silent without explicit opt-in %s',enabled=>{const g=game(enabled);hold(g,curlPose(0),100,6000);assert.equal(traces(g).length,0);});
test.each(['squats','pushups','pullups','lateralraise','shoulderpress'])('curl trace never records exercise %s',exercise=>{const g=game(true,exercise);hold(g,curlPose(0),100,6000);assert.equal(traces(g).length,0);});
test('trace records throttled fresh observations and unchanged camera confidence',()=>{
  const g=game(true);for(let t=100;t<=6000;t+=10){const p=curlPose(.5);p[15]={x:1.1,y:.555555,visibility:.123456};g.step(t,p);g.step(t,p);}
  const batches=traces(g);assert.ok(batches.length>=2);assert.ok(batches.every(b=>b.version==='curl-trace-1'&&b.rows.length<=60));
  const rows=batches.flatMap(b=>b.rows);assert.equal(new Set(rows.map(r=>r.t)).size,rows.length);assert.ok(rows.slice(1).every((r,i)=>r.t-rows[i].t>=40));
  const wrist=rows[0].points.find(p=>p[0]===15);assert.deepEqual(wrist,[15,1.1,.5556,.1235,false]);assert.equal(rows[0].leftElbowAngle,null);assert.equal(rows[0].elbowCount,1);
  assert.ok(rows[0].check.message.includes('visible'));assert.ok(batches.every(b=>b.session===batches[0].session));
});
test('diagnostics preserve calibration, smoothed controller, bird flight and unilateral failure timing',()=>{
  const off=game(false),on=game(true);const t=enter(off);assert.equal(enter(on),t);
  for(let i=0;i<240;i++) {const p=curlPose((1+Math.cos(i/80*Math.PI*2))/2);const now=t+i*25;off.step(now,p);on.step(now,p);assert.deepEqual(on.summary(),off.summary());}
  const oneArm=curlPose(0);oneArm[16].y=.72;
  for(let i=0;i<100;i++){const now=t+6000+i*25;off.step(now,oneArm);on.step(now,oneArm);assert.deepEqual(on.summary(),off.summary());}
  const ended=on.messages.find(m=>m.type==='gameover');assert.equal(ended.reason,'form');assert.equal(ended.fatalCheckKey,'biceps-both-arms');
  assert.equal(off.messages.find(m=>m.type==='gameover').fatalCheckKey,undefined);
  const batches=traces(on);assert.equal(batches.at(-1).terminal.fatalCheckKey,'biceps-both-arms');
  assert.ok(batches.flatMap(b=>b.rows).some(r=>r.check?.fatalKey==='biceps-both-arms'&&r.progressDifference>.3));
});
test('an empty camera observation is logged without changing curl tracking behavior',()=>{
  const off=game(false),on=game(true);const t=enter(off);assert.equal(enter(on),t);
  for(let i=0;i<100;i++){const now=t+i*25;off.cameraFrame(now,null);on.cameraFrame(now,null);assert.deepEqual(on.summary(),off.summary());}
  assert.ok(traces(on).flatMap(b=>b.rows).some(r=>!r.detected&&r.points.every(p=>p[1]===null)));
});
test('production and iOS configuration do not opt into curl diagnostics',()=>{
  const fs=require('node:fs'),path=require('node:path');const source=fs.readFileSync(path.resolve(__dirname,'../../../app/game.tsx'),'utf8');
  assert.ok(source.includes("curlDiagnostics: __DEV__ && Platform.OS === 'android'"));
});
