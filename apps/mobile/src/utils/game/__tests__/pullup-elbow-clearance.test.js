const { SCRIPT_PULLUP_SUPPORT } = require('../html/scriptPullupSupport');

// Synthetic low doorway bar with a maximum tiptoe reach above the grip. Elbow
// heights at top and hang are deliberately identical: their difference is NOT
// evidence. The useful difference is from the unsupported overhead reach.
function metrics(kind) {
  const poses={reach:[.375,.50,.295,.215,.61,.71,.75,178],top:[.33,.45,.34,.28,.55,.64,.68,174],
    hang:[.43,.57,.34,.28,.68,.61,.66,95],supported:[.38,.505,.35,.28,.60,.70,.73,175]};
  const [shoulder,hip,elbow,wrist,knee,ankle,toe,angle]=poses[kind];
  const m={shoulders:{x:.5,y:shoulder},hips:{x:.5,y:hip}};
  for(const [side,x] of [['left',.44],['right',.56]]) {
    for(const [key,y] of Object.entries({Shoulder:shoulder,Hip:hip,Elbow:elbow,Wrist:wrist,Knee:knee,Ankle:ankle,Toe:toe,Heel:toe-.025}))m[side+key]={x,y};
    m[side+'KneeAngle']=angle;m[side+'ElbowAngle']=kind==='reach'?180:kind==='top'?65:150;
  }
  return m;
}
function harness({high=false,hiddenReachHands=false,hiddenReachFeet=false,depth=false,calibrated=true,edgeReach=false}={}) {
  const h=new Function('formDistance', SCRIPT_PULLUP_SUPPORT+`
    var video={videoWidth:480,videoHeight:640}, formTopMetrics=null;
    function formValid(){return {valid:true,fatal:false};}
    function formInvalid(message){return {valid:false,fatal:false,message:message};}
    function formFatal(message,key){return {valid:false,fatal:true,message:message,fatalKey:key};}
    return {update:updatePullupSupportReference,save:savePullupClearanceProfile,
      top:pullupTopSupportClear,debug:pullupSupportDebug,check:pullupFloorGameplayCheck,
      calibration:function(m){return pullupFloorCalibrationCheck(m,'bottom');},
      setTop:function(m){formTopMetrics=m;},reset:resetPullupSupportReference,resetRun:resetPullupSupportRun};
  `)((a,b)=>Math.hypot(a.x-b.x,a.y-b.y));
  let now=0;
  function hold(m,ms=800,dt=50){for(let t=0;t<ms;t+=dt){now+=dt;h.update(m,now);}}
  const reach=metrics('reach');
  if(edgeReach)for(const side of ['left','right']){
    reach[side+'Ankle'].y=.883;reach[side+'Heel'].y=.905;reach[side+'Toe'].y=.943;
  }
  if(depth)for(const side of ['left','right'])for(const [key,z] of Object.entries({Hip:0,Knee:0,Ankle:.12,Toe:0,Heel:.12}))reach[side+key].z=z;
  if(hiddenReachHands)reach.leftWrist=reach.rightWrist=null;
  if(hiddenReachFeet)for(const side of ['left','right'])for(const key of ['Toe','Heel','Ankle'])reach[side+key]=null;
  hold(reach,1000);
  const top=metrics('top'),hang=metrics('hang');
  if(high)for(const m of [top,hang])for(const value of Object.values(m))if(value&&typeof value==='object')value.y-=.15;
  h.setTop(top);if(calibrated)h.save(top,hang);hold(hang,300);
  return {...h,hold,topPose:top,hangPose:hang,pose(m,dt=50){now+=dt;h.update(m,now);},repeat(m){h.update(m,now);}};
}
test('captures all three elbow heights without demanding top-to-hang elbow movement',()=>{
  const h=harness(),p=h.debug().clearance;
  expect(p.lowBar).toBe(true);
  expect(p.sides.left).toMatchObject({reachElbowY:.295,topElbowY:.34,hangElbowY:.34,reachWristY:.215,barY:.28});
  expect(p.sides.left.elbowDescent).toBeCloseTo(.045);
});
test('visible straight supported stance crashes despite sole estimates above saved floor',()=>{
  const h=harness();h.hold(metrics('supported'));
  expect(h.debug().left.current).toBe('air');
  expect(h.debug().bodyContact).toMatchObject({confirmed:true,reason:'low-bar-supported-stance'});
  expect(h.check()).toMatchObject({fatal:true,fatalKey:'pullup-feet',contactConfirmed:true});
});
test('the same combined evidence rejects a grounded bottom calibration',()=>{
  const h=harness(),m=metrics('supported');m.hips.y=.525;m.leftHip.y=m.rightHip.y=.525;
  h.pose(m);expect(h.calibration(m)).toMatchObject({valid:false,fatal:false});
});
test('high bar reached by a jump does not activate the supported-stance inference',()=>{
  const h=harness({high:true});expect(h.debug().clearance.lowBar).toBe(false);
  h.hold(metrics('supported'));expect(h.check().fatal).toBe(false);
});
test('a bent low-bar hang and straight-legged airborne top both stay valid',()=>{
  const h=harness();h.hold(h.hangPose,1500);expect(h.check().fatal).toBe(false);
  h.hold(h.topPose,1500);expect(h.check().fatal).toBe(false);
});
test('a low-bar top below maximum tiptoe hip height is allowed with lifted bent legs',()=>{
  const h=harness(),m=metrics('top');m.hips.y=.53;
  m.leftKneeAngle=m.rightKneeAngle=90;
  expect(h.top(m)).toBe(true);
});
test('simply gripping on tiptoes with straight legs and feet near floor cannot establish top',()=>{
  const h=harness();expect(h.top(metrics('supported'))).toBe(false);
});
test.each(['Toe','Ankle','Knee','Hip'])('missing %s observations cannot infer a supported leg',key=>{
  const h=harness(),m=metrics('supported');m['left'+key]=m['right'+key]=null;
  h.hold(m,1500);expect(h.check().fatal).toBe(false);expect(h.debug().bodyContact.confirmed).toBe(false);
});
test('clear raised feet override standing-like hips and straight legs',()=>{
  const h=harness(),m=metrics('supported');m.leftToe.y=m.rightToe.y=.69;
  h.hold(m,1500);expect(h.check().fatal).toBe(false);
});
test('bent or angled legs do not count as standing',()=>{
  for(const type of ['bent','angled']){
    const h=harness(),m=metrics('supported');
    if(type==='bent')m.leftKneeAngle=m.rightKneeAngle=130;
    else for(const side of ['left','right']){m[side+'Knee'].x+=.15;m[side+'Ankle'].x+=.3;}
    h.hold(m,1500);expect(h.check().fatal).toBe(false);
  }
});
test('cannot infer ground from elbow height alone when hips are lifted',()=>{
  const h=harness(),m=metrics('supported');m.hips.y=.46;
  h.hold(m,1500);expect(h.check().fatal).toBe(false);
});
test('brief jitter, repeated render timestamps, and camera gaps do not confirm support',()=>{
  const h=harness(),m=metrics('supported');h.hold(m,500);
  for(let i=0;i<100;i++)h.repeat(m);
  expect(h.check().fatal).toBe(false);
  h.pose(m,900);h.hold(m,450);expect(h.check().fatal).toBe(false);
  h.hold(h.hangPose,100);h.hold(m,500);expect(h.check().fatal).toBe(false);
  h.hold(m,200);expect(h.check().fatal).toBe(true);
});
test('cropped feet clear pending body evidence; a confirmed crash remains latched',()=>{
  const h=harness(),m=metrics('supported'),hidden=metrics('supported');
  for(const side of ['left','right'])for(const key of ['Toe','Heel','Ankle'])hidden[side+key]=null;
  h.hold(m,400);h.hold(hidden,1000);expect(h.check().fatal).toBe(false);
  h.hold(m,800);expect(h.check().fatal).toBe(true);
  h.hold(hidden,800);expect(h.check().fatal).toBe(true);
  h.resetRun();h.hold(hidden,800);expect(h.check().fatal).toBe(false);
  h.reset();expect(h.debug().clearance).toBeNull();
});
test('tiptoe heels do not become a raised floor plane',()=>{
  const h=harness();expect(h.debug().floor.points.leftHeel.y).toBe(.75);
  const m=metrics('supported');m.leftToe=m.rightToe=null;m.leftHeel.y=m.rightHeel.y=.725;
  h.hold(m,1500);expect(h.check().fatal).toBe(false);
});
test('cropped reach wrists can use the measured held-bar forearms; cropped toes cannot invent floor',()=>{
  const h=harness({hiddenReachHands:true});expect(h.debug().clearance.sides.left.reachWristEstimated).toBe(true);
  expect(h.debug().clearance.lowBar).toBe(true);
  const hidden=harness({hiddenReachFeet:true});hidden.hold(metrics('supported'));expect(hidden.check().fatal).toBe(false);
});

function overlappingAirbornePose(bent=false) {
  const m=metrics('supported');m.hips.y=.47;m.shoulders.y=.345;
  for(const side of ['left','right']) {
    m[side+'Hip'].y=.47;m[side+'Shoulder'].y=.345;
    m[side+'Knee'].y=.58;m[side+'Ankle'].y=.715;
    m[side+'Toe'].y=.765;m[side+'Heel'].y=.74;
    if(bent){m[side+'Knee'].x+=.07;m[side+'KneeAngle']=145;}
  }
  return m;
}

test.each([false,true])('raised airborne body overrides conflicting floor pixels (bent=%s)',bent=>{
  const h=harness(),m=overlappingAirbornePose(bent);
  h.hold(m,3000);
  expect(h.debug().left.rawCurrent).toBe('contact');
  expect(h.debug().right.rawCurrent).toBe('contact');
  expect(h.debug().left.airborneEvidence).toBeTruthy();
  expect(h.debug().right.airborneEvidence).toBeTruthy();
  expect(h.check()).toMatchObject({valid:true,fatal:false});
});

test('one airborne foot does not excuse the other planted foot',()=>{
  const h=harness(),m=overlappingAirbornePose();
  for(const key of ['Hip','Knee','Ankle','Toe','Heel'])m['right'+key]=metrics('supported')['right'+key];
  m.rightToe.y=.76;m.hips.y=(m.leftHip.y+m.rightHip.y)/2;
  h.hold(m,800);expect(h.debug().left.airborneEvidence).toBeTruthy();
  expect(h.debug().right.airborneEvidence).toBeNull();
  expect(h.check()).toMatchObject({fatal:true,fatalKey:'pullup-feet'});
});

test('a bent knee with hips at supported height still permits real toe contact to crash',()=>{
  const h=harness(),m=metrics('supported');
  m.leftKneeAngle=m.rightKneeAngle=130;m.leftToe.y=m.rightToe.y=.76;
  h.hold(m,800);expect(h.check()).toMatchObject({fatal:true,fatalKey:'pullup-feet'});
});

test('landing after suspended clearance starts fresh contact and then crashes',()=>{
  const h=harness(),air=overlappingAirbornePose(),ground=metrics('supported');
  ground.leftToe.y=ground.rightToe.y=.76;
  h.hold(air,2000);expect(h.check().valid).toBe(true);
  h.hold(ground,250);expect(h.check().fatal).toBe(false);
  h.hold(ground,200);expect(h.check()).toMatchObject({fatal:true,fatalKey:'pullup-feet'});
});

test('airborne body evidence cannot clear a crash already confirmed on the floor',()=>{
  const h=harness(),m=metrics('supported');m.leftToe.y=m.rightToe.y=.76;
  h.hold(m,800);expect(h.check().fatal).toBe(true);
  h.hold(overlappingAirbornePose(),1000);expect(h.check().fatal).toBe(true);
});

test('leg reference keeps a complete measured length when a knee estimate shifts',()=>{
  const h=harness(),top=metrics('top');
  // The knee shifts upward: the shin grows while the thigh shrinks. Combining
  // their separate maxima would fabricate a leg longer than either observation.
  top.leftKnee.y=.49;h.save(top,h.hangPose);
  expect(h.debug().clearance.legs.left.leg).toBeCloseTo(.21);
});

// Identical x/y can describe downward standing legs OR legs held out toward
// the camera. Only the recorded depth separates this regression from contact.
function forwardLegPose(hipY=.49) {
  const m=metrics('supported');m.hips.y=hipY;m.shoulders.y=hipY-.125;
  for(const side of ['left','right']){
    for(const [key,y,z] of [['Hip',hipY,0],['Knee',hipY+.09,-.22],['Ankle',hipY+.20,-.4],['Toe',hipY+.27,-.53],['Heel',hipY+.245,-.4]])m[side+key]={...m[side+key],y,z};
    m[side+'Shoulder'].y=hipY-.125;
  }
  return m;
}

test('forward straight legs survive conflicting floor pixels beyond the tracking timeout',()=>{
  const h=harness({depth:true}),m=forwardLegPose();h.hold(m,3000);
  expect(h.debug().left.rawCurrent).toBe('contact');
  expect(h.debug().left.airborneEvidence.reason).toBe('forward-leg-clearance');
  expect(h.debug().right.airborneEvidence.reason).toBe('forward-leg-clearance');
  expect(h.check()).toMatchObject({valid:true,fatal:false});
});

test('the same projected pose with downward depth still crashes',()=>{
  const h=harness({depth:true}),m=forwardLegPose();
  for(const side of ['left','right'])for(const key of ['Hip','Knee','Ankle','Toe','Heel'])m[side+key].z=0;
  h.hold(m,800);expect(h.check()).toMatchObject({fatal:true,fatalKey:'pullup-feet'});
});

test('forward airborne leg clearance can exist below the original tiptoe hip height',()=>{
  const h=harness({depth:true}),m=forwardLegPose(.52);h.hold(m,3000);
  expect(h.debug().left.airborneEvidence.hipRise).toBeLessThan(0);
  expect(h.check()).toMatchObject({valid:true,fatal:false});
});

test('a forward foot with enough downward reach to touch the floor still crashes',()=>{
  const h=harness({depth:true}),m=forwardLegPose(.66);
  for(const side of ['left','right']){
    m[side+'Knee'].y=.71;m[side+'Ankle'].y=.765;
    m[side+'Toe'].y=.79;m[side+'Heel'].y=.77;
  }
  h.hold(m,800);expect(h.debug().left.airborneEvidence).toBeNull();
  expect(h.check()).toMatchObject({fatal:true,fatalKey:'pullup-feet'});
});

test('one forward airborne leg cannot clear the other grounded foot',()=>{
  const h=harness({depth:true}),m=forwardLegPose();
  for(const key of ['Hip','Knee','Ankle','Toe','Heel'])m['right'+key].z=0;
  h.hold(m,800);expect(h.debug().left.airborneEvidence.reason).toBe('forward-leg-clearance');
  expect(h.debug().right.confirmed).toBe(true);expect(h.check().fatal).toBe(true);
});

test.each([undefined,NaN,Infinity])('missing or invalid current depth (%s) cannot invent clearance',z=>{
  const h=harness({depth:true}),m=forwardLegPose();
  m.leftAnkle.z=m.rightAnkle.z=z;h.hold(m,800);expect(h.check().fatal).toBe(true);
});

test('depth needs its own measured reference, not an invented zero-depth setup',()=>{
  const h=harness(),m=forwardLegPose();h.hold(m,800);expect(h.check().fatal).toBe(true);
});

test('toe depth alone cannot turn a planted leg into a forward airborne leg',()=>{
  const h=harness({depth:true}),m=forwardLegPose();
  for(const side of ['left','right'])for(const key of ['Hip','Knee','Ankle'])m[side+key].z=0;
  h.hold(m,800);expect(h.check().fatal).toBe(true);
});

test('landing from forward legs confirms contact afresh and records a crash',()=>{
  const h=harness({depth:true}),m=forwardLegPose();h.hold(m,1800);expect(h.check().valid).toBe(true);
  for(const side of ['left','right'])for(const key of ['Hip','Knee','Ankle','Toe','Heel'])m[side+key].z=0;
  h.hold(m,250);expect(h.check().fatal).toBe(false);
  h.hold(m,200);expect(h.check().fatal).toBe(true);
});

test('depth references are captured and discarded with their calibration',()=>{
  const h=harness({depth:true});expect(h.debug().reach.pose.leftAnkle.z).toBe(.12);
  h.reset();expect(h.debug().reach).toBeNull();expect(h.debug().clearance).toBeNull();
});

test('strong forward depth does not become ground when its estimated length changes',()=>{
  const h=harness({depth:true}),m=forwardLegPose();
  // The last recorded false crash had a depth-derived leg length over twice
  // setup, although the visible x/y limb lengths were essentially unchanged.
  for(const side of ['left','right'])for(const key of ['Knee','Ankle','Toe','Heel'])m[side+key].z*=2;
  h.hold(m,3000);expect(h.debug().left.airborneEvidence.reason).toBe('forward-leg-clearance');
  expect(h.check()).toMatchObject({valid:true,fatal:false});
});

function foldedBackHang() {
  const m=metrics('hang');
  for(const side of ['left','right']){
    for(const [key,y,z] of [['Hip',.57,0],['Knee',.65,-.04],['Ankle',.705,.44],['Toe',.76,.47],['Heel',.735,.45]])m[side+key]={...m[side+key],y,z};
    // A knee pointing away can look almost straight in x/y.
    m[side+'KneeAngle']=172;
  }
  return m;
}

test.each(['forward','folded-back'])('step two uses %s clearance before its final profile exists',direction=>{
  const h=harness({depth:true,calibrated:false});
  const m=direction==='forward'?forwardLegPose(.52):foldedBackHang();
  h.hold(m,1800);
  expect(h.debug().clearance).toBeNull();
  expect(h.debug().left.rawCurrent).toBe('contact');
  expect(h.debug().left.airborneEvidence).toBeTruthy();
  expect(h.calibration(m)).toMatchObject({valid:true,fatal:false});
});

test('the same folded-back hang remains valid in gameplay',()=>{
  const h=harness({depth:true}),m=foldedBackHang();h.hold(m,3000);
  expect(h.debug().left.airborneEvidence.reason).toBe('folded-leg-clearance');
  expect(h.check()).toMatchObject({valid:true,fatal:false});
});

test('a folded leg low enough to reach the floor still confirms contact',()=>{
  const h=harness({depth:true}),m=foldedBackHang();m.hips.y=.70;
  for(const side of ['left','right'])for(const key of ['Hip','Knee','Ankle','Toe','Heel'])m[side+key].y+=.13;
  h.hold(m,800);expect(h.debug().left.airborneEvidence).toBeNull();
  expect(h.check()).toMatchObject({fatal:true,fatalKey:'pullup-feet'});
});

test('a brief toe-pixel crossing does not reset the second calibration hold',()=>{
  const h=harness({calibrated:false}),m=metrics('hang');
  h.hold(m,400);m.leftToe.y=m.rightToe.y=.76;h.hold(m,200);
  expect(h.calibration(m)).toMatchObject({valid:true,fatal:false});
  h.hold(m,250);expect(h.calibration(m)).toMatchObject({valid:false,fatal:false});
});

test('uncertain bar height cannot disable measured airborne clearance',()=>{
  const h=harness({depth:true,high:true}),m=forwardLegPose();
  for(const side of ['left','right']){
    m[side+'Wrist']={...h.hangPose[side+'Wrist']};
    m[side+'Elbow']={...h.hangPose[side+'Elbow']};
  }
  expect(h.debug().clearance.lowBar).toBe(false);
  h.hold(m,3000);expect(h.debug().left.rawCurrent).toBe('contact');
  expect(h.debug().left.airborneEvidence.reason).toBe('forward-leg-clearance');
  expect(h.check()).toMatchObject({valid:true,fatal:false});
});

test.each(['Toe','Ankle'])('a foot with its %s hidden remains unknown despite other low points',key=>{
  const h=harness(),m=metrics('supported');
  for(const side of ['left','right']){
    m[side+'Toe'].y=.76;m[side+'Heel'].y=.75;m[side+key]=null;
  }
  h.hold(m,3000);
  expect(h.debug().left.current).toBe('unknown');expect(h.debug().right.current).toBe('unknown');
  expect(h.debug().bodyContact.confirmed).toBe(false);
  expect(h.check()).toMatchObject({valid:true,fatal:false});
});

test.each(['bottom','left','right'])('foot predictions against the %s frame edge cannot establish contact',edge=>{
  const h=harness(),m=metrics('supported');
  for(const side of ['left','right']){
    m[side+'Toe'].y=.76;m[side+'Heel'].y=.75;
    if(edge==='bottom'){
      m[side+'Ankle'].y=.95;m[side+'Heel'].y=.97;m[side+'Toe'].y=.99;
    }else for(const key of ['Ankle','Heel','Toe'])m[side+key].x=edge==='left'?.005:.995;
  }
  h.hold(m,3000);expect(h.debug().left.observable).toBe(false);
  expect(h.check()).toMatchObject({valid:true,fatal:false});
});

test('one cropped foot does not excuse the other clearly planted foot',()=>{
  const h=harness(),m=metrics('supported');m.leftToe=null;m.leftHeel.y=.76;m.rightToe.y=.76;
  h.hold(m,800);expect(h.debug().left.current).toBe('unknown');
  expect(h.debug().right.confirmed).toBe(true);expect(h.check().fatal).toBe(true);
});

test('returning after a cropped foot needs fresh observed contact',()=>{
  const h=harness(),ground=metrics('supported'),cropped=metrics('supported');
  ground.leftToe.y=ground.rightToe.y=.76;
  cropped.leftToe=cropped.rightToe=null;cropped.leftHeel.y=cropped.rightHeel.y=.76;
  h.hold(ground,250);h.hold(cropped,350);expect(h.check().valid).toBe(true);
  h.hold(ground,250);expect(h.check().fatal).toBe(false);
  h.hold(ground,200);expect(h.check().fatal).toBe(true);
});

test('cropping a foot cannot clear an already confirmed gameplay crash',()=>{
  const h=harness(),m=metrics('supported');m.leftToe.y=m.rightToe.y=.76;
  h.hold(m,800);expect(h.check().fatal).toBe(true);
  m.leftToe=m.rightToe=null;h.hold(m,800);expect(h.check().fatal).toBe(true);
});

test('partly cropped feet permit the upper-body top check without a new setup step',()=>{
  const h=harness(),m=metrics('top');
  for(const side of ['left','right']){m[side+'Toe']=null;m[side+'Heel'].y=.76;}
  h.hold(m,800);expect(h.top(m)).toBe(true);expect(h.calibration(m).valid).toBe(true);
});


function returnedEdgeFootPose() {
  const m=metrics('supported');
  for(const side of ['left','right']){
    m[side+'Ankle'].y=.895;m[side+'Heel'].y=.920;m[side+'Toe'].y=.965;
  }
  return m;
}

test('visible toes just below their setup footprint still confirm a phone landing near the bottom edge',()=>{
  const h=harness({edgeReach:true}),m=returnedEdgeFootPose();
  h.hold(m,250);expect(h.check().fatal).toBe(false);
  h.hold(m,200);expect(h.debug().left.observable).toBe(true);
  expect(h.debug().left.confirmed).toBe(true);
  expect(h.check()).toMatchObject({fatal:true,fatalKey:'pullup-feet'});
});

test('one visible returned foot near the frame edge still crashes when the other foot is hidden',()=>{
  const h=harness({edgeReach:true}),m=returnedEdgeFootPose();m.rightToe=null;
  h.hold(m,800);expect(h.debug().left.confirmed).toBe(true);
  expect(h.debug().right.current).toBe('unknown');expect(h.check().fatal).toBe(true);
});

test.each(['Toe','Ankle'])('the calibrated edge footprint cannot replace a missing %s',key=>{
  const h=harness({edgeReach:true}),m=returnedEdgeFootPose();
  m['left'+key]=m['right'+key]=null;
  h.hold(m,1500);expect(h.debug().left.current).toBe('unknown');expect(h.check().fatal).toBe(false);
});

test('a toe beyond the image boundary cannot inherit its setup footprint visibility',()=>{
  const h=harness({edgeReach:true}),m=returnedEdgeFootPose();
  m.leftToe.y=m.rightToe.y=1.002;
  h.hold(m,1500);expect(h.check().fatal).toBe(false);
});

test('near-edge feet outside the measured standing footprint remain unknown',()=>{
  const h=harness({edgeReach:true}),m=returnedEdgeFootPose();
  for(const side of ['left','right']){
    m[side+'Ankle'].y=.94;m[side+'Heel'].y=.96;m[side+'Toe'].y=.99;
  }
  h.hold(m,1500);expect(h.debug().left.current).toBe('unknown');expect(h.check().fatal).toBe(false);
});
