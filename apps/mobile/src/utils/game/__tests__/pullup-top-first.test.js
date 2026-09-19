const { createGame, pose, hold } = require('../testUtils/pullupGameplayHarness');

test.each([0, .12])('top is the first calibrated position after setup, at bar offset %s', offset => {
  const game = createGame();
  let t = hold(game, pose('standing'), 100, 1500);
  const top = pose('top');
  top.forEach(point => { point.y -= offset; });
  // No intermediate pull, bottom hold or suspended-hang reference is supplied.
  t = hold(game, top, t, 4000);
  expect(game.summary().state).toBe('waitBottom');
  expect(game.overlays.some(o => o.state === 'waitTop' && /hang|settle/i.test(o.message))).toBe(false);
  const bottom = pose('bottom');
  bottom.forEach(point => { point.y -= offset; });
  hold(game, bottom, t, 2500);
  expect(game.summary().state).toBe('countdown');
});

test('hidden feet allow standing-reach setup followed directly by top and bottom', () => {
  const game = createGame();
  let t = hold(game, pose('standing', { hideFeet: true }), 100, 1500);
  t = hold(game, pose('top', { hideFeet: true }), t, 4500);
  expect(game.summary().setup.mode).toBe('unverified');
  expect(game.summary().state).toBe('waitBottom');
  expect(game.overlays.some(o => o.state === 'waitTop' && /hang|settle/i.test(o.message))).toBe(false);
  t = hold(game, pose('bottom', { hideFeet: true }), t, 2500);
  expect(game.summary().state).toBe('countdown');
});

test('standing or hanging below the bar cannot fill the top-position bar', () => {
  const game = createGame();
  let t = hold(game, pose('standing'), 100, 1500);
  t = hold(game, pose('bottom'), t, 3500);
  expect(game.summary().state).toBe('waitTop');
  expect(game.summary().progress).toBe(0);
  hold(game, pose('top', { grounded: true }), t, 3500);
  expect(game.summary().topY).toBeNull();
  expect(game.summary().progress).toBe(0);
});
