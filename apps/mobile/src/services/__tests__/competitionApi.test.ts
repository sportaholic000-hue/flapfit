import { competitionPlayerNameError, normalizeCompetitionPlayerName } from '../competitionApi';

describe('competition player names', () => {
  test('normalizes whitespace and accepts a normal player name', () => {
    expect(normalizeCompetitionPlayerName('  Jay   Bird  ')).toBe('Jay Bird');
    expect(competitionPlayerNameError('Jay Bird')).toBeNull();
  });

  test('matches the server moderation rules including common substitutions', () => {
    expect(competitionPlayerNameError('sh1t')).toBe('Choose a different player name.');
    expect(competitionPlayerNameError('fück')).toBe('Choose a different player name.');
  });

  test('rejects characters the server will not accept', () => {
    expect(competitionPlayerNameError('Jay🙂')).not.toBeNull();
  });
});


const nameCases = require('../../../scripts/fixtures/player-name-cases.cjs') as { rejected: string[]; accepted: string[] };
test.each(nameCases.rejected)('rejects basic and visually disguised inappropriate names: %s', name => {
  expect(competitionPlayerNameError(name)).toBe('Choose a different player name.');
});
test.each(nameCases.accepted)('preserves legitimate display names: %s', name => {
  expect(competitionPlayerNameError(name)).toBeNull();
  expect(normalizeCompetitionPlayerName(name)).toBe(name);
});
