const assert = require('node:assert/strict');
const { loadScripts, createGame, pose, hold, calibrate } = require('../testUtils/pullupGameplayHarness');
const scripts = loadScripts();

function start(){const game=createGame(scripts);const c=calibrate(game);assert.equal(c.top.state,'waitBottom','legitimate top should fill');assert.equal(c.bottom.state,'countdown','legitimate bottom should fill');return {game,...c};}
function advanceToPlay(game,t,points=pose('bottom')){while(game.summary().state==='countdown'&&t<30000){game.step(t,points);t+=25;}assert.equal(game.summary().state,'play');return t;}
function verifyFall(game,t,grounded){
  const before=game.summary(), beforeFrames=game.frames.length;
  let seenFall=false;
  while(t<before.recordingStartedAt+7000&&game.summary().state!=='over'){
    game.step(t,grounded);t+=25;
    if(game.summary().crashReason){seenFall=true;assert.ok(game.summary().pipeX<before.pipeX,'pipes keep moving while control releases');}
  }
  assert.ok(seenFall,'planting a foot must release bird control');
  assert.equal(game.summary().state,'over','bird ends run by collision');
  assert.ok(game.frames.length>beforeFrames,'composed frames continue during fall');
  assert.equal(game.messages.filter(m=>m.type==='gameover').length,1);
  assert.equal(game.messages.find(m=>m.type==='gameover').reason,'form');
  assert.ok(game.overlays.every(o=>o.state!=='play'),'no gameplay freeze/recovery overlay');
  const finalFrame=game.frames.at(-1),terminal=game.messages.find(m=>m.type==='gameover');
  assert.equal(finalFrame.t,terminal.t,'clip includes collision frame');
  const count=game.frames.length;game.render(t+100);assert.equal(game.frames.length,count,'result screen excluded from video');
  return {playAt:before.recordingStartedAt,collisionAt:terminal.t,frames:game.frames.length,states:game.transitions};
}

test('real calibration enters countdown; recording begins only at play; airborne straight legs remain valid',()=>{
  const {game,t:startT}=start();assert.equal(game.frames.length,0);assert.equal(game.summary().recordingStartedAt,null);
  let t=advanceToPlay(game,startT);const playAt=game.summary().recordingStartedAt;
  const calibrated=game.messages.find(m=>m.type==='calibrated');assert.ok(playAt-calibrated.t>=3000);
  t=hold(game,pose('bottom'),t,5000);
  assert.equal(game.summary().state,'play');assert.equal(game.summary().crashReason,'');
  assert.ok(game.frames.every(f=>f.t>=playAt));assert.ok(game.summary().pipeX<10000);

});

test('placing feet during the initial countdown carries into gameplay and collision',()=>{
  const {game,t}=start();const after=advanceToPlay(game,t,pose('bottom',{grounded:true}));
  verifyFall(game,after,pose('bottom',{grounded:true}));
});

test('placing feet immediately after play begins ends by collision even with stationary shoulders',()=>{
  const {game,t}=start();const after=advanceToPlay(game,t);
  verifyFall(game,after,pose('bottom',{grounded:true}));
});

test('planted toes remain detected when heels and ankles rise for a calf raise',()=>{
  const {game,t}=start();const after=advanceToPlay(game,t);
  verifyFall(game,after,pose('bottom',{grounded:true,calfRaise:true}));
});

test('a planted left foot cannot be masked by an airborne right foot',()=>{
  const {game,t}=start();const after=advanceToPlay(game,t),p=pose('bottom'),grounded=pose('bottom',{grounded:true});
  for(const i of [27,29,31])p[i]=grounded[i];
  verifyFall(game,after,p);
});

test('suspended knees may bend while feet remain stationary above the captured floor',()=>{
  const {game,t:startT}=start();let t=advanceToPlay(game,startT);const first=game.summary().pipeX;
  for(let i=0;i<240;i++){
    const lift=.02+.06*(.5+.5*Math.sin(i/15)),p=pose(lift);
    for(const j of [27,28])p[j].y=.80;
    for(const j of [29,30])p[j].y=.82;
    for(const j of [31,32])p[j].y=.84;
    p[25].x=.36;p[26].x=.64;
    game.step(t,p);t+=25;
  }
  assert.equal(game.summary().state,'play','airborne bent-leg control should stay active');
  assert.equal(game.summary().crashReason,'');assert.ok(game.summary().pipeX<first);

});

test('holding full extension maps to the bottom endpoint and hits a pipe normally',()=>{
  const {game,t:startT}=start();let t=advanceToPlay(game,startT);game.setPipe(140,320,140);
  while(game.summary().state!=='over'&&t<16000){game.step(t,pose('bottom'));t+=25;}
  assert.equal(game.summary().state,'over');assert.equal(game.summary().crashReason,'');
  assert.equal(game.messages.find(m=>m.type==='gameover').reason,'');
  assert.ok(game.overlays.every(o=>o.state!=='play'));

});

test('reusing three sparse camera poses across render frames cannot fill the top hold',()=>{
  const game=createGame(scripts);
  let t=hold(game,pose('standing'),100,1200);
  t=hold(game,pose('bottom'),t,2400);
  for(let p=0;p<=1.001;p+=.025){game.step(t,pose(.11*p));t+=25;}
  game.step(t,pose('bottom'));t+=25;
  for(let i=0;i<=60;i++){
    if(i%24===0)game.step(t,pose('top'));else game.render(t);
    t+=25;
  }
  assert.equal(game.summary().state,'waitTop','a gap of 600ms between three observations must not become a verified hold');

});

test('a jump to a high bar does not become step 1 before a settled hang and real pull',()=>{
  const game=createGame(scripts);
  let t=hold(game,pose('standing'),100,1200);
  // Reach for the high bar during the jump: feet can briefly leave the image.
  t=hold(game,pose('top',{hideFeet:true}),t,150);
  t=hold(game,pose('bottom'),t,2500);
  assert.equal(game.summary().state,'waitTop','settling into a hang is not a completed pull-up');
  assert.equal(game.summary().topY,null);
  for(let p=0;p<=1.001;p+=.025){game.step(t,pose(.11*p));t+=25;}
  t=hold(game,pose('top'),t,2000);
  assert.equal(game.summary().state,'waitBottom','a real pull after jumping and settling still calibrates');
  assert.equal(game.summary().setup?.mode,'floor','jump does not discard standing floor reference');

});

test('confirmed grounding releases control without a second timer and cannot be erased by lifting',()=>{
  const {game,t:startT}=start();let t=advanceToPlay(game,startT);
  // Begin away from the floor boundary so this checks latching before collision.
  t=hold(game,pose(.055),t,800);
  t=hold(game,pose(.055,{grounded:true}),t,350);
  assert.equal(game.summary().crashReason,'form');
  verifyFall(game,t,pose(.055));
});

test('planted feet are detected at four camera poses per second while render frames stay smooth',()=>{
  const {game,t:startT}=start();let t=advanceToPlay(game,startT);
  let seenFall=false;
  for(let i=0;i<240 && game.summary().state!=='over';i++){
    if(i%10===0)game.step(t,pose('bottom',{grounded:true}));else game.render(t);
    t+=25;
    seenFall ||= game.summary().crashReason==='form';
  }
  assert.ok(seenFall,'fresh 250ms camera intervals must still establish floor contact');
  assert.equal(game.summary().state,'over');
  assert.equal(game.messages.find(m=>m.type==='gameover').reason,'form');

});

test('planted feet are detected at two camera poses per second',()=>{
  const {game,t:startT}=start();let t=advanceToPlay(game,startT);
  let seenFall=false;
  for(let i=0;i<240 && game.summary().state!=='over';i++){
    if(i%20===0)game.step(t,pose('bottom',{grounded:true}));else game.render(t);
    t+=25;
    seenFall ||= game.summary().crashReason==='form';
  }
  assert.ok(seenFall,'fresh 500ms camera intervals must establish floor contact');
  assert.equal(game.summary().state,'over');
  assert.equal(game.messages.find(m=>m.type==='gameover').reason,'form');
  assert.ok(game.overlays.every(o=>o.state!=='play'));

});

test('repeated 800ms camera gaps release control through continuous physics rather than allowing unsupported tracking',()=>{
  const {game,t:startT}=start();let t=advanceToPlay(game,startT);
  const firstPipe=game.summary().pipeX,firstFrames=game.frames.length;
  for(let i=0;i<320 && game.summary().state!=='over';i++){
    if(i%32===0)game.step(t,pose('bottom'));else game.render(t);
    t+=25;
  }
  assert.equal(game.summary().state,'over','an unverified camera stream cannot keep controlling the bird forever');
  assert.ok(['tracking','form'].includes(game.summary().crashReason));
  assert.ok(game.summary().pipeX<firstPipe,'pipes continue through loss and fall');
  assert.ok(game.frames.length>firstFrames,'recording continues through loss and fall');
  assert.ok(game.overlays.every(o=>o.state!=='play'),'no recovery overlay or countdown');
  assert.equal(game.frames.at(-1).t,game.messages.find(m=>m.type==='gameover').t);

});

test('a narrow neutral grip with both hands visible completes real top and bottom calibration',()=>{
  const game=createGame(scripts);
  const narrow=kind=>{const p=pose(kind);p[15].x=.495;p[16].x=.505;return p;};
  let t=hold(game,pose('standing'),100,1200);
  t=hold(game,narrow('bottom'),t,2400);
  assert.equal(game.summary().topY,null,'a narrow static grip still needs an actual pull');
  for(let p=0;p<=1.001;p+=.025){game.step(t,narrow(.11*p));t+=25;}
  t=hold(game,narrow('top'),t,2000);
  assert.equal(game.summary().state,'waitBottom','projected hand spacing does not invalidate a real top');
  for(let p=0;p<=1.001;p+=.025){game.step(t,narrow(.11*(1-p)));t+=25;}
  t=hold(game,narrow('bottom'),t,2000);
  assert.equal(game.summary().state,'countdown','neutral grip also permits the bottom hold');

});

test('upper-body-only framing remains playable while explicitly disclosing unverified floor contact',()=>{
  const game=createGame(scripts);
  const upper=kind=>pose(kind,{hideFeet:true});
  let t=hold(game,upper('bottom'),100,3600);
  assert.equal(game.metrics().leftFoot,null,'no mean foot may accidentally establish a floor');
  assert.equal(game.metrics().rightFoot,null);
  assert.equal(game.summary().setup?.mode,'unverified');
  assert.equal(game.summary().state,'waitTop','a static upper-body grip still needs an actual pull');
  assert.equal(game.summary().topY,null);
  assert.equal(game.summary().progress,0);
  assert.ok(game.overlays.some(o=>o.state==='waitTop'&&o.message.includes('Feet outside view: floor contact cannot be checked.')),
    'preparation must disclose the camera-view limitation');
  for(let p=0;p<=1.001;p+=.025){game.step(t,upper(.11*p));t+=25;}
  t=hold(game,upper('top'),t,2000);
  assert.equal(game.summary().state,'waitBottom','real shoulder rise can complete top with feet outside view');
  for(let p=0;p<=1.001;p+=.025){game.step(t,upper(.11*(1-p)));t+=25;}
  t=hold(game,upper('bottom'),t,2000);
  assert.equal(game.summary().state,'countdown');
  assert.equal(game.summary().recordingStartedAt,null);
  t=advanceToPlay(game,t,upper('bottom'));
  const firstPipe=game.summary().pipeX,firstFrames=game.frames.length;
  hold(game,upper('bottom'),t,5000);
  assert.equal(game.summary().state,'play','feet outside view must not cause a false ground-contact death');
  assert.equal(game.summary().crashReason,'');
  assert.equal(game.summary().setup?.mode,'unverified');
  assert.ok(game.summary().pipeX<firstPipe);
  assert.ok(game.frames.length>firstFrames);
  assert.ok(game.overlays.every(o=>o.state!=='play'));

});


test('a grounded overhead grip cannot seed the hang baseline and turn a jump into step one',()=>{
  const game=createGame(scripts);
  let t=hold(game,pose('standing'),100,3500);
  assert.equal(game.summary().setup.mode,'floor');
  assert.equal(game.summary().topY,null);
  t=hold(game,pose('top'),t,3000);
  assert.equal(game.summary().state,'waitTop','jumping directly to eye level is not an observed pull');
  assert.equal(game.summary().progress,0);
  t=hold(game,pose('bottom'),t,700);
  for(let p=0;p<=1.001;p+=.025){game.step(t,pose(.11*p));t+=25;}
  hold(game,pose('top'),t,2000);
  assert.equal(game.summary().state,'waitBottom');
});

test('fresh confirmed toe contact releases control within one confirmation window',()=>{
  const {game,t:startT}=start();let t=advanceToPlay(game,startT);
  const first=t,grounded=pose('bottom',{grounded:true,calfRaise:true});
  while(!game.summary().crashReason&&t<first+1000){game.step(t,grounded);t+=25;}
  assert.equal(game.summary().crashReason,'form');
  assert.ok(t-first>=350,'one noisy contact frame must not end the run');
  assert.ok(t-first<=425,'fresh confirmed contact must not wait for another fatal timer');
  verifyFall(game,t,grounded);
});

test.each(['missing toes','all feet hidden','ambiguous clearance'])(
  'persistent %s cannot keep a floor-verified run playable', kind=>{
    const {game,t:startT}=start();let t=advanceToPlay(game,startT);
    const p=pose('bottom');
    if(kind==='missing toes') for(const i of [31,32])p[i].visibility=0.2;
    if(kind==='all feet hidden') for(const i of [27,28,29,30,31,32])p[i].visibility=0;
    if(kind==='ambiguous clearance'){
      const floor=game.support().floor;
      const between=(floor.tolerance+floor.clearance)/2;
      for(const [i,key] of [[29,'leftHeel'],[30,'rightHeel'],[31,'leftToe'],[32,'rightToe']])
        p[i].y=floor.points[key].y-between;
    }
    verifyFall(game,t,p);
  }
);

test('a brief missing-toe estimate recovers without a fall, pause, or countdown',()=>{
  const {game,t:startT}=start();let t=advanceToPlay(game,startT);
  const p=pose('bottom');p[31].visibility=p[32].visibility=.2;
  t=hold(game,p,t,300);
  t=hold(game,pose('bottom'),t,2000);
  assert.equal(game.summary().state,'play');
  assert.equal(game.summary().crashReason,'');
  assert.ok(game.overlays.every(o=>o.state!=='play'));
});

test.each([300,600,900])(
  'planting feet for %sms invalidates the old hang before a jump to top', groundedMs=>{
    const game=createGame(scripts);
    let t=hold(game,pose('standing'),100,1200);
    t=hold(game,pose('bottom'),t,2400);
    assert.equal(game.summary().state,'waitTop');
    t=hold(game,pose('bottom',{grounded:true}),t,groundedMs);
    assert.equal(game.support().left.current,'contact');
    assert.equal(game.support().right.current,'contact');
    t=hold(game,pose('top'),t,2200);
    assert.equal(game.summary().state,'waitTop','a jump after ground contact must not reuse the old airborne hang');
    assert.equal(game.summary().topY,null);
    assert.equal(game.summary().progress,0);
    t=hold(game,pose('bottom'),t,700);
    for(let p=0;p<=1.001;p+=.025){game.step(t,pose(.11*p));t+=25;}
    hold(game,pose('top'),t,2000);
    assert.equal(game.summary().state,'waitBottom','a new hang followed by a real pull must still calibrate');
  }
);
