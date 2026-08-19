const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "Content-Type",
      "access-control-allow-methods": "GET,POST,OPTIONS"
    }
  });

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "Content-Type",
      "access-control-allow-methods": "GET,POST,OPTIONS"
    }});

    const url = new URL(request.url);

    try {
      if (url.pathname === "/api/verify-pin" && request.method === "POST") {
        return await verifyPin(request, env);
      }

      if (url.pathname === "/api/vote" && request.method === "POST") {
        return await submitVote(request, env);
      }

      if (url.pathname === "/api/results" && request.method === "GET") {
        return await results(env);
      }

      return json({ error: "Not found" }, 404);
    } catch (err) {
      console.error(err);
      return json({ error: "Server error" }, 500);
    }
  }
};

async function verifyPin(request, env) {
  const body = await request.json();
  const pin = String(body.pin || "").trim();

  if (!/^\d{4}$/.test(pin)) {
    return json({ allowed: false, error: "PIN must be 4 digits." }, 400);
  }

  const voter = await env.DB.prepare(`
    SELECT id, name, grade, team
    FROM rostered_players
    WHERE pin = ?
    LIMIT 1
  `).bind(pin).first();

  if (!voter) {
    return json({ allowed: false, error: "PIN not authorised." }, 403);
  }

  const alreadyVoted = await env.DB.prepare(`
    SELECT 1 FROM votes WHERE voter_player_id = ? LIMIT 1
  `).bind(voter.id).first();

  if (alreadyVoted) {
    return json({ allowed: false, alreadyVoted: true, error: "This PIN has already voted." }, 403);
  }

  // Eligible candidates are rostered players on the same team.
  // Do not return the PIN to the browser.
  const candidates = await env.DB.prepare(`
    SELECT id, name, grade, team
    FROM rostered_players
    WHERE team = ? AND id != ?
    ORDER BY name COLLATE NOCASE
  `).bind(voter.team, voter.id).all();

  return json({
    allowed: true,
    voter: {
      id: voter.id,
      name: voter.name,
      grade: voter.grade,
      team: voter.team
    },
    candidates: candidates.results || []
  });
}

async function submitVote(request, env) {
  const body = await request.json();
  const voterId = String(body.voterId || "").trim();
  const candidateId = String(body.candidateId || "").trim();

  if (!voterId || !candidateId) {
    return json({ error: "voterId and candidateId are required." }, 400);
  }

  if (voterId === candidateId) {
    return json({ error: "A player cannot vote for themselves." }, 400);
  }

  // Re-check voter and candidate entirely on the server.
  const voter = await env.DB.prepare(`
    SELECT id, team FROM rostered_players WHERE id = ? LIMIT 1
  `).bind(voterId).first();

  const candidate = await env.DB.prepare(`
    SELECT id, name, team FROM rostered_players WHERE id = ? LIMIT 1
  `).bind(candidateId).first();

  if (!voter || !candidate) {
    return json({ error: "Invalid rostered player." }, 403);
  }

  if (voter.team !== candidate.team) {
    return json({ error: "Candidate is not on the voter's team." }, 403);
  }

  // UNIQUE(voter_player_id) prevents a second vote.
  try {
    await env.DB.prepare(`
      INSERT INTO votes (voter_player_id, voted_for_player_id)
      VALUES (?, ?)
    `).bind(voterId, candidateId).run();
  } catch (err) {
    return json({ error: "This voter has already submitted a vote." }, 409);
  }

  // KV is used as a fast tally/cache.
  // The authoritative individual vote remains in D1.
  const key = `tally:${candidateId}`;
  const current = Number(await env.VOTES_KV.get(key) || "0");
  await env.VOTES_KV.put(key, String(current + 1));

  return json({ success: true });
}

async function results(env) {
  // Rebuild authoritative tallies from D1 rather than trusting KV alone.
  const rows = await env.DB.prepare(`
    SELECT
      p.id,
      p.name,
      p.team,
      COUNT(v.id) AS votes
    FROM rostered_players p
    LEFT JOIN votes v
      ON v.voted_for_player_id = p.id
    GROUP BY p.id, p.name, p.team
    ORDER BY votes DESC, p.name COLLATE NOCASE
  `).all();

  return json({
    results: rows.results || []
  });
}
