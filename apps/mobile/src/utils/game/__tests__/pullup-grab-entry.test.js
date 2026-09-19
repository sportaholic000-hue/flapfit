const { createGame, pose, hold } = require('../testUtils/pullupGameplayHarness');

function directPull(game, dt = 25) {
  let t = hold(game, pose('standing'), 100, Math.max(1500, dt * 6), dt);
  const began = t;
  // Start pulling as the feet lift: there is no separate suspended hold.
  while (t <= began + 2000) {
    game.step(t, pose(.11 * (t - began) / 2000));
    t += dt;
  }
  return hold(game, pose('top'), t, Math.max(2500, dt * 8), dt);
}

test.each([25, 100, 250, 500])('a continuous pull from the setup grip fills step 1 at %sms pose intervals', dt => {
  const game = createGame();
  directPull(game, dt);
  expect(game.summary().state).toBe('waitBottom');
  expect(game.messages.filter(m => m.type === 'formdebug' && m.message.includes('"position":"top"'))).toHaveLength(1);
});

test('three fresh camera sessions each calibrate and still crash on planted toes', () => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const game = createGame();
    expect(game.summary().topY).toBeNull();
    expect(game.support().floor).toBeNull();
    let t = directPull(game);
    expect(game.summary().state).toBe('waitBottom');
    t = hold(game, pose('bottom'), t, 2300);
    expect(game.summary().state).toBe('countdown');
    while (game.summary().state === 'countdown') { game.step(t, pose('bottom')); t += 25; }
    while (game.summary().state !== 'over' && t < 20000) {
      game.step(t, pose('bottom', { grounded: true, calfRaise: true })); t += 25;
    }
    expect(game.messages.filter(m => m.type === 'gameover')).toHaveLength(1);
    expect(game.messages.find(m => m.type === 'gameover').reason).toBe('form');
    expect(game.overlays.some(o => o.state === 'play')).toBe(false);
  }
});

test('a new higher grip cannot reuse the grounded setup reference to skip the pull', () => {
  const game = createGame();
  let t = hold(game, pose('standing'), 100, 1500);
  // The jump raises the entire body and wrists, without pulling against a fixed bar.
  for (let lift = 0; lift <= .1401; lift += .005) {
    const points = pose('bottom');
    points.forEach(p => { p.y -= lift; });
    game.step(t, points); t += 25;
  }
  const higherHang = pose('bottom'); higherHang.forEach(p => { p.y -= .14; });
  hold(game, higherHang, t, 3000);
  expect(game.summary().state).toBe('waitTop');
  expect(game.summary().topY).toBeNull();
});
