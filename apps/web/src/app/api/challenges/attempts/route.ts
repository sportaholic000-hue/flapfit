import sql from '@/app/api/utils/sql';

// POST /api/challenges/attempts — record an attempt for a challenge code
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, playerName, deviceId, score } = body;
    if (!code || !playerName || !deviceId || typeof score !== 'number' || score < 0) {
      return Response.json(
        { error: 'code, playerName, deviceId and a valid score are required' },
        { status: 400 }
      );
    }
    const challenges = await sql`
      SELECT id FROM challenges WHERE code = ${String(code).trim().toUpperCase()} LIMIT 1
    `;
    if (challenges.length === 0) {
      return Response.json({ error: 'Challenge not found' }, { status: 404 });
    }
    const rows = await sql`
      INSERT INTO challenge_attempts (challenge_id, player_name, device_id, score)
      VALUES (${challenges[0].id}, ${String(playerName).slice(0, 20)}, ${deviceId}, ${Math.floor(score)})
      RETURNING id
    `;
    return Response.json({ id: rows[0].id });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Could not record attempt' }, { status: 500 });
  }
}
