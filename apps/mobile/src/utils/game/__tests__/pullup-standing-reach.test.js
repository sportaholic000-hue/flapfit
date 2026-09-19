const { SCRIPT_PULLUP_SUPPORT } = require('../html/scriptPullupSupport');
const { createGame, pose, hold } = require('../testUtils/pullupGameplayHarness');

function bodyRule(reference, shoulder, hip) {
  return new Function('reference','metrics', SCRIPT_PULLUP_SUPPORT + `
    pullupReachReference=reference;
    return {top:pullupStandingBodyRiseValid(metrics),range:pullupMinimumCalibrationRange()};
  `)(reference,{shoulders:{y:shoulder},hips:{y:hip},leftShoulder:{y:shoulder},rightShoulder:{y:shoulder}});
}

// Recorded endpoint medians from the two September 18 low-bar attempts.
// These test the body-rise decision, not a replay of the new reach setup.
test('the recorded small tiptoe-like rise cannot establish the top',()=>{
  const reference={torso:.12953,shoulderY:.4281,leftShoulderY:.4281,rightShoulderY:.4281,hipY:.5553};
  expect(bodyRule(reference,.4034,.5323).top).toBe(false);
});
test('the later recorded body lift passes and its lowering range is sufficient',()=>{
  const reference={torso:.12529,shoulderY:.43035,leftShoulderY:.43035,rightShoulderY:.43035,hipY:.5534};
  const result=bodyRule(reference,.3842,.48745);
  expect(result.top).toBe(true);
  expect(.4253-.3842).toBeGreaterThan(result.range);
  expect(.4253-.3842).toBeLessThan(.06);
});
test('overhead shoulder elevation does not require the hips to duplicate that extra rise',()=>{
  const r={torso:.15,shoulderY:.41,leftShoulderY:.41,rightShoulderY:.41,hipY:.56};
  expect(bodyRule(r,.385,.49).top).toBe(true);
  expect(bodyRule(r,.385,.545).top).toBe(false);
});
test.each([.65,1,1.3])('reach, top, bottom and hidden-feet gameplay work at scale %s',scale=>{
  const game=createGame();
  const scaled=(kind,options)=>pose(kind,options).map(p=>({...p,x:.5+(p.x-.5)*scale,y:.5+(p.y-.5)*scale}));
  let t=hold(game,scaled('standing'),100,1600);
  expect(game.support().reach).toBeTruthy();
  t=hold(game,scaled('top',{hideFeet:true}),t,3500);
  expect(game.summary().state).toBe('waitBottom');
  t=hold(game,scaled('bottom',{hideFeet:true}),t,2500);
  expect(game.summary().state).toBe('countdown');
  t=hold(game,scaled('bottom',{hideFeet:true}),t,5000);
  expect(game.summary().state).toBe('play');
  expect(game.summary().crashReason).toBe('');
});
test('reach setup permits hands above the camera when both raised elbows are visible',()=>{
  const game=createGame(),reach=pose('standing');
  reach[15].y=reach[16].y=-.05;
  hold(game,reach,100,1500);
  expect(game.summary().setup.ready).toBe(true);
});
test('a visible planted toe still ends play when the other foot leaves view',()=>{
  const game=createGame();let t=hold(game,pose('standing'),100,1500);
  t=hold(game,pose('top'),t,3500);t=hold(game,pose('bottom'),t,2500);
  t=hold(game,pose('bottom'),t,3500);
  const contact=pose('bottom',{grounded:true,calfRaise:true});
  for(const i of [28,30,32])contact[i].visibility=0;
  hold(game,contact,t,2500);
  expect(game.summary().state).toBe('over');
  expect(game.messages.find(m=>m.type==='gameover').reason).toBe('form');
});
