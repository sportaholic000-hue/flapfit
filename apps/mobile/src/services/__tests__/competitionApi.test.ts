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
