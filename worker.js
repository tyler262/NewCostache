/**
 * Tribe Fake Helper — backend
 *
 * Endpoints:
 *   GET  /list           -> returns the current fake list (public, any member)
 *   POST /list           -> replaces the list (admin only, needs X-Admin-Key)
 *   GET  /health         -> "ok"
 *
 * Data is stored in a KV namespace bound as FAKES.
 * The admin key is stored as a secret bound as ADMIN_KEY.
 *
 * Nothing secret ever ships in the member userscript — members only ever GET.
 */

const KEY = "faketargets"; // the single KV key we read/write

// CORS so the userscript (running on tribalwars.net) can call us from the browser.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === "/health") {
      return new Response("ok", { headers: cors });
    }

    if (url.pathname === "/list") {
      // --- READ: open to all members ---
      if (request.method === "GET") {
        const stored = await env.FAKES.get(KEY);
        const data = stored ? JSON.parse(stored) : { updated: null, by: null, targets: [] };
        return json(data);
      }

      // --- WRITE: admins only ---
      if (request.method === "POST") {
        const key = request.headers.get("X-Admin-Key");
        if (!key || key !== env.ADMIN_KEY) {
          return json({ error: "Not authorized. Check your admin key." }, 401);
        }

        let payload;
        try {
          payload = await request.json();
        } catch {
          return json({ error: "Body was not valid JSON." }, 400);
        }

        if (!Array.isArray(payload.targets)) {
          return json({ error: "Expected a 'targets' array." }, 400);
        }

        // Light validation: each target must have a coord like 500|500.
        const clean = [];
        for (const t of payload.targets) {
          if (typeof t.coord !== "string" || !/^\d{1,3}\|\d{1,3}$/.test(t.coord.trim())) {
            return json({ error: `Bad coord: ${JSON.stringify(t.coord)}. Use X|Y, e.g. 500|512.` }, 400);
          }
          clean.push({
            coord: t.coord.trim(),
            note: typeof t.note === "string" ? t.note.slice(0, 120) : "",
          });
        }

        const record = {
          updated: new Date().toISOString(),
          by: typeof payload.by === "string" ? payload.by.slice(0, 60) : "unknown",
          targets: clean,
        };

        await env.FAKES.put(KEY, JSON.stringify(record));
        return json({ ok: true, count: clean.length, updated: record.updated });
      }

      return json({ error: "Method not allowed." }, 405);
    }

    return json({ error: "Not found." }, 404);
  },
};
