// Deletion and safety/support actions must remain available without renewed participation.
export function requiresAppleCompetitionCheck(method: string, route: string): boolean {
  return (method === 'GET' && route === '/leaderboard') ||
    (method === 'POST' && ['/profile', '/runs', '/runs/finalize', '/leaderboard'].includes(route));
}
