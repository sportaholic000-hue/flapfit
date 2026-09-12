import sql from '@/app/api/utils/sql';

// GET /api/leaderboard?exercise=pushups  — top scores (best per device)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    // Support both old ?mode=endless and new ?exercise=pushups params
    const exercise = searchParams.get('exercise') ?? 'pushups';
    const scores = await sql(
      `SELECT * FROM (
         SELECT DISTINCT ON (device_id) device_id, player_name, score, pushups, exercise, created_at
         FROM leaderboard_scores
         WHERE exercise = $1
         ORDER BY device_id, score DESC
       ) best
       ORDER BY score DESC
       LIMIT 50`,
      [exercise]
    );
    return Response.json({ scores });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Could not load leaderboard' }, { status: 500 });
  }
}

// POST /api/leaderboard — submit a score
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deviceId, playerName, score, pushups, exercise } = body;
    if (!deviceId || !playerName || typeof score !== 'number' || score < 0) {
      return Response.json(
        { error: 'deviceId, playerName and a valid score are required' },
        { status: 400 }
      );
    }
    const validExercises = ['pushups', 'squats', 'pullups'];
    const safeExercise = validExercises.includes(exercise) ? exercise : 'pushups';
    const rows = await sql`
      INSERT INTO leaderboard_scores (device_id, player_name, score, pushups, mode, exercise)
      VALUES (${deviceId}, ${String(playerName).slice(0, 20)}, ${Math.floor(score)}, ${Math.max(0, Math.floor(pushups ?? 0))}, 'endless', ${safeExercise})
      RETURNING id
    `;
    return Response.json({ id: rows[0].id });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Could not submit score' }, { status: 500 });
  }
}
