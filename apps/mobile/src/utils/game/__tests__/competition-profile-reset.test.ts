import { COMPETITION_TERMS_VERSION, useGameStore } from '../store';

describe('competition profile reset', () => {
  test('clears online identity consent while preserving local game progress', () => {
    useGameStore.setState({
      playerName: 'JayBird',
      competitionTermsVersion: COMPETITION_TERMS_VERSION,
      totalPipes: 321,
      totalTutSeconds: 654,
      birdId: 'onyx',
    });

    useGameStore.getState().resetCompetitionProfile();

    const state = useGameStore.getState();
    expect(state.playerName).toBe('');
    expect(state.competitionTermsVersion).toBeNull();
    expect(state.totalPipes).toBe(321);
    expect(state.totalTutSeconds).toBe(654);
    expect(state.birdId).toBe('onyx');
  });
});
