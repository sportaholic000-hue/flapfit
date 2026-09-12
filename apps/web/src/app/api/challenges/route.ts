import sql from '@/app/api/utils/sql';

function makeCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// GET /api/challenges?code=AB12CD — fetch a challenge + its attempts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = (searchParams.get('code') ?? '').trim().toUpperCase();
    if (!code) {
      return Response.json({ error: 'code is required' }, { status: 400 });
    }
    const challenges = await sql`
      SELECT id, code, creator_name, target_score, level_id, created_at
      FROM challenges
      WHERE code = ${code}
      LIMIT 1
    `;
    if (challenges.length === 0) {
      return Response.json({ error: 'Challenge not found' }, { status: 404 });
    }
    const challenge = challenges[0];
    const attempts = await sql`
      SELECT player_name, device_id, score, created_at
      FROM challenge_attempts
      WHERE challenge_id = ${challenge.id}
      ORDER BY score DESC
      LIMIT 50
    `;
    return Response.json({ challenge, attempts });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Could not load challenge' }, { status: 500 });
  }
}

// POST /api/challenges — create a challenge
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { creatorName, deviceId, targetScore, levelId } = body;
    if (!creatorName || !deviceId || typeof targetScore !== 'number' || targetScore < 1) {
      return Response.json(
        { error: 'creatorName, deviceId and a positive targetScore are required' },
        { status: 400 }
      );
    }
    // Retry a few times in the unlikely case of a code collision
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = makeCode();
      try {
        const rows = await sql`
          INSERT INTO challenges (code, creator_name, creator_device_id, target_score, level_id)
          VALUES (${code}, ${String(creatorName).slice(0, 20)}, ${deviceId}, ${Math.floor(targetScore)}, ${levelId ?? 3})
          RETURNING id, code
        `;
        return Response.json({ id: rows[0].id, code: rows[0].code });
      } catch (insertError) {
        if (attempt === 4) {
          throw insertError;
        }
      }
    }
    return Response.json({ error: 'Could not create challenge' }, { status: 500 });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Could not create challenge' }, { status: 500 });
  }
}
