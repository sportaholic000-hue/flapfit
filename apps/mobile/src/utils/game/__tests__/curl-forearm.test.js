
const assert=require('node:assert/strict');
const {loadScripts,createGame}=require('../testUtils/pullupGameplayHarness');
const scripts=loadScripts();
function game(diag=true) {return createGame({...scripts,form:"CONFIG.exercise='biceps';CONFIG.curlForearmControl=true;CONFIG.curlDiagnostics="+diag+";\n"+scripts.form});}
function pose(left=40,right=left){
  const p=Array.from({length:33},()=>({x:0,y:0,visibility:0}));
  const w=Array.from({length:33},()=>({x:0,y:0,z:0,visibility:0}));
  p[2]={x:.46,y:.20,visibility:1};p[5]={x:.54,y:.20,visibility:1};
  for(const [side,angle]of [[0,left],[1,right]]){
    const x=side?.65:.35,a=angle*Math.PI/180;
    p[13+side]={x,y:.50,visibility:1};p[15+side]={x,y:.50-.17*Math.cos(a),visibility:1};
    for(const index of [17,19,21])p[index+side]={...p[15+side]};
    w[13+side]={x:side?.18:-.18,y:-.10,z:0,visibility:1};
    w[15+side]={x:w[13+side].x,y:-.10-.22*Math.cos(a),z:-.22*Math.sin(a),visibility:1};
  }
  // Shoulders and hips intentionally absent for every test unless explicitly added.
  return {p,w};
}
function camera(g,t,left=40,right=left,edit){const {p,w}=pose(left,right);if(edit)edit(p,w);for(let n=t-48;n<t;n+=16)g.render(n);g.cameraFrame(t,p,w);}
function enter(g,edit){let t=50;for(;t<=4000;t+=50)camera(g,t,40,40,edit);assert.equal(g.summary().state,'waitBottom');for(;t<=6500;t+=50)camera(g,t,160,160,edit);assert.equal(g.summary().state,'countdown');for(;t<=10000;t+=50)camera(g,t,90,90,edit);assert.equal(g.summary().state,'play');return t;}

test('curl forearms calibrate and fly with no shoulder or hip observations',()=>{
 const g=game();let t=enter(g),x=g.summary().pipeX;const heights=[];
 for(const a of [60,85,90,95,120,70,105]){for(let i=0;i<45;i++,t+=50)camera(g,t,a);assert.equal(g.summary().crashReason,'');heights.push(g.summary().birdNorm);}
 assert.equal(g.summary().state,'play');assert.ok(g.summary().pipeX<x);
 assert.ok(heights[0]>heights[1]&&heights[1]>heights[2]&&heights[2]>heights[3]);assert.ok(heights[5]>heights[4]+.3);
});
test('head movement, missing eyes after top, and arbitrary shoulder estimates cannot change flight',()=>{
 const a=game(),b=game();let t=enter(a);assert.equal(enter(b),t);
 for(let i=0;i<120;i++,t+=50){const angle=90+25*Math.sin(i/8);camera(a,t,angle);camera(b,t,angle,angle,(p,w)=>{
  p[2]={x:.8,y:i%2?.05:.8,visibility:i%3?1:0};p[5]={x:.2,y:.9,visibility:0};
  for(const j of [11,12]){p[j]={x:i%2,y:.8,visibility:1};w[j]={x:10,y:-20,z:30,visibility:1};}
 });assert.deepEqual(a.summary(),b.summary());}
});
test('eyes qualify only the top step and are not required for bottom or gameplay',()=>{
 const g=game();for(let t=50;t<=4000;t+=50)camera(g,t,40);assert.equal(g.summary().state,'waitBottom');
 for(let t=4050;t<=6500;t+=50)camera(g,t,160,160,p=>{p[2].visibility=0;p[5].visibility=0;});assert.equal(g.summary().state,'countdown');
});
test('a lowered head cannot calibrate hanging arms as the top',()=>{
 const g=game();for(let t=50;t<=6000;t+=50)camera(g,t,160,160,p=>{p[2].y=.6;p[5].y=.6;});assert.equal(g.summary().state,'waitTop');assert.equal(g.summary().progress,0);
});
test('top calibration requires a face reference and both forearms',()=>{
 for(const missing of [2,5,13,14]){const g=game();for(let t=50;t<=5000;t+=50)camera(g,t,40,40,p=>p[missing].visibility=0);assert.equal(g.summary().state,'waitTop');assert.equal(g.summary().progress,0);}
});
test.each([false,true])('one hanging arm cannot complete top calibration %s',swap=>{
 const g=game();for(let t=50;t<=6000;t+=50)camera(g,t,swap?160:40,swap?40:160);assert.equal(g.summary().state,'waitTop');assert.equal(g.summary().progress,0);
});
test.each([false,true])('one curled arm cannot complete bottom calibration %s',swap=>{
 const g=game();for(let t=50;t<=4000;t+=50)camera(g,t,40);for(let t=4050;t<=8000;t+=50)camera(g,t,swap?160:40,swap?40:160);assert.equal(g.summary().state,'waitBottom');assert.equal(g.summary().progress,0);
});
test.each([false,true])('unilateral and alternating curls end the run %s',alternating=>{
 const g=game();let t=enter(g);for(let i=0;i<90;i++,t+=50)camera(g,t,alternating&&i%2?160:40,alternating&&i%2?40:160);
 assert.equal(g.messages.find(m=>m.type==='gameover').fatalCheckKey,'biceps-both-arms');
});
test('small natural differences are allowed while sustained large differences fail',()=>{
 const g=game();let t=enter(g);for(let i=0;i<60;i++,t+=50)camera(g,t,85,95);assert.equal(g.summary().crashReason,'');
 for(let i=0;i<90;i++,t+=50)camera(g,t,60,130);assert.equal(g.messages.find(m=>m.type==='gameover').fatalCheckKey,'biceps-both-arms');
});
test('loss of a forearm never becomes an invented midpoint or single-arm fallback',()=>{
 const g=game();let t=enter(g),x=g.summary().pipeX;for(let i=0;i<90;i++,t+=50)camera(g,t,80,80,p=>{for(const i of [16,18,20,22])p[i].visibility=0;});
 assert.equal(g.messages.find(m=>m.type==='gameover').fatalCheckKey,'biceps-both-arms');assert.ok(g.summary().pipeX<x);
});
test('lifting a whole straight arm fails the independent per-arm elbow anchor',()=>{
 const g=game();let t=enter(g);for(let i=0;i<90;i++,t+=50)camera(g,t,90,90,p=>{for(const i of [13,14,15,16,17,18,19,20,21,22])p[i].y-=.16;});
 assert.equal(g.messages.find(m=>m.type==='gameover').reason,'form');
});
test('forearm direction is unaffected by a common 3D position or scale change',()=>{
 const a=game(),b=game();let t=enter(a);assert.equal(enter(b),t);
 for(let i=0;i<100;i++,t+=50){const angle=90+25*Math.sin(i/7);camera(a,t,angle);camera(b,t,angle,angle,(_,w)=>{for(const j of [13,14,15,16]){w[j].x=w[j].x*1.2+.5;w[j].y=w[j].y*1.2-.3;w[j].z=w[j].z*1.2+.7;}});assert.ok(Math.abs(a.summary().norm-b.summary().norm)<1e-12);}
});
test('each arm uses its own calibrated range',()=>{
 const g=game();for(let t=50;t<=4000;t+=50)camera(g,t,35,55);for(let t=4050;t<=6500;t+=50)camera(g,t,170,150);for(let t=6550;t<=10000;t+=50)camera(g,t,90,90);
 for(let t=10050;t<=12000;t+=50){const left=Math.acos((Math.cos(35*Math.PI/180)+Math.cos(170*Math.PI/180))/2)*180/Math.PI;const right=Math.acos((Math.cos(55*Math.PI/180)+Math.cos(150*Math.PI/180))/2)*180/Math.PI;camera(g,t,left,right);}
 assert.ok(Math.abs(g.summary().norm-.5)<.001);assert.ok(Math.abs(g.metrics().curlLeftProgress-g.metrics().curlRightProgress)<.001);assert.equal(g.summary().crashReason,'');
});
test('a tiny partial adjustment is responsive rather than a dead zone',()=>{
 const g=game();let t=enter(g);for(let i=0;i<40;i++,t+=50)camera(g,t,90);const before=g.summary().norm;
 for(let i=0;i<8;i++,t+=50)camera(g,t,89);assert.ok(g.summary().norm>before+.008);assert.equal(g.summary().crashReason,'');
});
test('diagnostics do not influence the experimental controller',()=>{
 const a=game(false),b=game(true);let t=enter(a);assert.equal(enter(b),t);for(let i=0;i<100;i++,t+=50){const angle=90+25*Math.sin(i/8);camera(a,t,angle);camera(b,t,angle);assert.deepEqual(a.summary(),b.summary());}
 const rows=b.messages.filter(m=>m.type==='curldebug').map(m=>JSON.parse(m.message));assert.ok(rows.every(b=>b.controller==='hand-image-1'));assert.ok(rows.flatMap(b=>b.rows).some(r=>r.points.some(p=>p[0]===2)));assert.ok(!a.messages.some(m=>m.type==='curldebug'));
});
test('experimental calibration uses fresh observations and clears when the person leaves',()=>{
 const g=game();camera(g,2100,40);for(let t=2116;t<=3100;t+=16)g.render(t);assert.equal(g.summary().progress,0);
 for(let t=3150;t<=4000;t+=50)camera(g,t,40);g.cameraFrame(4050,null);assert.equal(g.summary().state,'waitTop');assert.equal(g.summary().progress,0);
});

test('the forearm experiment is enabled only for Android development previews',()=>{
 const fs=require('node:fs'),path=require('node:path');const screen=fs.readFileSync(path.resolve(__dirname,'../../../app/game.tsx'),'utf8');
 assert.ok(screen.includes("curlForearmControl: __DEV__ && Platform.OS === 'android'"));
 const g=createGame({...scripts,form:"CONFIG.exercise='biceps';CONFIG.curlForearmControl=false;\n"+scripts.form});
 for(let t=50;t<=5000;t+=50)camera(g,t,40);assert.equal(g.summary().state,'waitTop');
});


test('isolated wrist errors cannot move the median hand signal',()=>{
 const a=game(),b=game();let t=enter(a);enter(b);
 for(let i=0;i<100;i++,t+=50){const angle=90+25*Math.sin(i/7);camera(a,t,angle);camera(b,t,angle,angle,p=>{p[15].y+=i%2?.12:-.12;p[16].y+=i%2?-.12:.12;});assert.deepEqual(a.summary(),b.summary());}
});
test('isolated finger errors cannot move the median hand signal',()=>{
 const a=game(),b=game();let t=enter(a);enter(b);
 for(let i=0;i<100;i++,t+=50){const angle=90+25*Math.sin(i/7);camera(a,t,angle);camera(b,t,angle,angle,p=>{p[19].y+=.2;p[20].y-=.2;});assert.deepEqual(a.summary(),b.summary());}
});
test('finger points can calibrate and control both hands without wrists',()=>{
 const g=game();let t=enter(g,p=>{p[15].visibility=0;p[16].visibility=0;});for(let i=0;i<90;i++,t+=50)camera(g,t,80,80,p=>{p[15].visibility=0;p[16].visibility=0;});assert.equal(g.summary().crashReason,'');assert.equal(g.summary().state,'play');
});
test('a single remaining point cannot qualify a hand for calibration',()=>{
 const g=game();for(let t=50;t<=6000;t+=50)camera(g,t,40,40,p=>{for(const i of [18,20,22])p[i].visibility=0;});assert.equal(g.summary().state,'waitTop');assert.equal(g.summary().progress,0);
});
test('arbitrary or missing world coordinates cannot affect calibration or flight',()=>{
 const a=game(),b=game();let t=enter(a);enter(b,(_,w)=>{w.splice(0,w.length);});
 for(let i=0;i<100;i++,t+=50){const angle=90+25*Math.sin(i/7);camera(a,t,angle);camera(b,t,angle,angle,(_,w)=>{for(const p of w){p.y=i%2?20:-20;p.z=i%2?-30:30;p.visibility=0;}});assert.deepEqual(a.summary(),b.summary());}
});


const curlFollowGain=new Function(require('../html/scriptCurlForearmTracking').SCRIPT_CURL_FOREARM_TRACKING+';return curlBirdResponseGain;')();
test('curl follow reaches the same position at equal elapsed time across render cadences',()=>{
 const follow=steps=>{let y=.2;for(const dt of steps)y+=(.8-y)*curlFollowGain(dt);return y;};
 const regular=Array.from({length:12},()=>1000/30);
 const fast=Array.from({length:24},()=>1000/60);
 const uneven=Array.from({length:6},()=>[1000/60,50]).flat();
 assert.ok(Math.abs(follow(regular)-follow(fast))<1e-12);assert.ok(Math.abs(follow(regular)-follow(uneven))<1e-12);
});
test('curl follow matches existing 30 fps response without a new temporal filter',()=>{
 assert.ok(Math.abs(curlFollowGain(1000/30)-16/30)<1e-12);
 assert.ok(curlFollowGain(50)>Math.min(1,.035*16));
 assert.equal(curlFollowGain(0),0);assert.equal(curlFollowGain(-10),0);
 assert.equal(curlFollowGain(200),curlFollowGain(100));assert.ok(Number.isFinite(curlFollowGain(NaN)));
});
test('curl follow supports rapid reversals and small partial changes without overshoot',()=>{
 let y=.5;for(const [target,dt] of [[.8,50],[.2,16],[.21,36],[.7,50],[.69,16],[.3,33]]){
  const old=y;y+=(target-y)*curlFollowGain(dt);assert.ok(y>=Math.min(old,target)&&y<=Math.max(old,target));assert.ok(Math.abs(y-target)<Math.abs(old-target));
 }
});


test('actual curl gameplay uses elapsed render time consistently after the same hand observation',()=>{
 const run=steps=>{const g=game();const t=enter(g);camera(g,t,70);let now=t;for(const dt of steps){now+=dt;g.render(now);}assert.equal(g.summary().crashReason,'');return g.summary();};
 const a=run(Array.from({length:12},()=>1000/30));const b=run(Array.from({length:6},()=>[1000/60,50]).flat());
 assert.equal(a.norm,b.norm);assert.ok(Math.abs(a.birdNorm-b.birdNorm)<1e-10);
});


const curlInputGain=new Function(require('../html/scriptCurlForearmTracking').SCRIPT_CURL_FOREARM_TRACKING+';return curlInputResponseGain;')();
test('curl input smoothing preserves 30 fps response and handles sparse camera updates by elapsed time',()=>{
 assert.ok(Math.abs(curlInputGain(1000/30)-.55)<1e-12);assert.ok(curlInputGain(66)>.78);
 const follow=steps=>{let y=.2;for(const dt of steps)y+=(.8-y)*curlInputGain(dt);return y;};
 assert.ok(Math.abs(follow([1000/30,1000/30])-follow([2000/30]))<1e-12);
 assert.ok(Math.abs(follow([50,50])-follow([1000/30,1000/30,1000/30]))<1e-12);
 assert.equal(curlInputGain(0),0);assert.equal(curlInputGain(-5),0);assert.equal(curlInputGain(500),curlInputGain(100));
});
test('actual curl hand input reaches equal normalized height with equal elapsed camera time',()=>{
 const run=steps=>{const g=game();let t=enter(g);camera(g,t,90);for(const dt of steps){t+=dt;camera(g,t,70);}return g.summary();};
 const a=run([1000/30,1000/30,1000/30]);const b=run([50,50]);assert.ok(Math.abs(a.norm-b.norm)<1e-12);assert.equal(a.crashReason,'');assert.equal(b.crashReason,'');
});
