/**
 * NewCostache — backend Worker
 *
 * Stores the tribe's shared coordinate "tabs" in KV and serves the in-game
 * script itself (so members load it via a Quickbar link, no Dropbox involved).
 *
 * Secrets (set with `wrangler secret put`):
 *   ADMIN_KEY  — required to write/delete tabs (leaders).
 *   READ_KEY   — required to read tabs (every member pastes it once).
 *                The ADMIN_KEY also satisfies reads, so leaders need only one.
 *
 * KV (binding FAKES), single key SHARED_TABS:
 *   { updated, tabs: [ { id, name, by, updated, coords, sourceCoord, grabberInputs } ] }
 *   - coords: normalized space-separated "x|y x|y ..." string
 *
 * Routes:
 *   GET    /script.js       -> the in-game tool (static asset, open)
 *   GET    /localforage.js  -> vendored dep      (static asset, open)
 *   GET    /health          -> "ok"              (open)
 *   GET    /tabs            -> all shared tabs    (needs read key)
 *   PUT    /tab/:id         -> upsert one tab     (needs admin key)
 *   DELETE /tab/:id         -> remove one tab     (needs admin key)
 */

const STORE_KEY = "SHARED_TABS";

// CORS so the script (running on tribalwars.net) can call us from the browser.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key, X-Read-Key",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

// A coord token like 500|512 (1-3 digits each, TW worlds are 0..999).
const COORD_RE = /^\d{1,3}\|\d{1,3}$/;

// Normalize a coords payload (string or array) into a clean "x|y x|y" string.
// Returns { ok:true, coords } or { ok:false, bad } on the first invalid token.
function normalizeCoords(input) {
  let tokens;
  if (Array.isArray(input)) {
    tokens = input;
  } else if (typeof input === "string") {
    tokens = input.match(/\d{1,3}\|\d{1,3}/g) || [];
  } else {
    tokens = [];
  }
  const clean = [];
  for (const raw of tokens) {
    const t = String(raw).trim();
    if (!COORD_RE.test(t)) return { ok: false, bad: raw };
    clean.push(t);
  }
  return { ok: true, coords: clean.join(" ") };
}

async function loadStore(env) {
  const stored = await env.FAKES.get(STORE_KEY);
  if (!stored) return { updated: null, tabs: [] };
  try {
    const data = JSON.parse(stored);
    if (!Array.isArray(data.tabs)) data.tabs = [];
    return data;
  } catch {
    return { updated: null, tabs: [] };
  }
}

function saveStore(env, store) {
  store.updated = new Date().toISOString();
  return env.FAKES.put(STORE_KEY, JSON.stringify(store));
}

function hasAdmin(request, env) {
  const key = request.headers.get("X-Admin-Key");
  return !!key && key === env.ADMIN_KEY;
}

function hasRead(request, env) {
  const key = request.headers.get("X-Read-Key");
  // The admin key also grants read access.
  return (!!key && key === env.READ_KEY) || hasAdmin(request, env);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Preflight
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // Static assets (script.js, localforage.js) are handled by the [assets]
    // binding before reaching here; this Worker only owns the API routes below.

    if (path === "/health") {
      return new Response("ok", { headers: cors });
    }

    // --- READ all tabs ---
    if (path === "/tabs" && method === "GET") {
      if (!hasRead(request, env)) {
        return json({ error: "Not authorized. Check your read key." }, 401);
      }
      return json(await loadStore(env));
    }

    // --- WRITE / DELETE a single tab ---
    const tabMatch = path.match(/^\/tab\/([A-Za-z0-9_-]{1,40})$/);
    if (tabMatch) {
      const id = tabMatch[1];

      if (!hasAdmin(request, env)) {
        return json({ error: "Not authorized. Check your admin key." }, 401);
      }

      const store = await loadStore(env);

      if (method === "DELETE") {
        const before = store.tabs.length;
        store.tabs = store.tabs.filter((t) => t.id !== id);
        if (store.tabs.length === before) {
          return json({ error: `No tab '${id}'.` }, 404);
        }
        await saveStore(env, store);
        return json({ ok: true, deleted: id, count: store.tabs.length });
      }

      if (method === "PUT") {
        let payload;
        try {
          payload = await request.json();
        } catch {
          return json({ error: "Body was not valid JSON." }, 400);
        }

        const norm = normalizeCoords(payload.coords);
        if (!norm.ok) {
          return json(
            { error: `Bad coord: ${JSON.stringify(norm.bad)}. Use X|Y, e.g. 500|512.` },
            400
          );
        }

        const tab = {
          id,
          name: typeof payload.name === "string" ? payload.name.slice(0, 60) : id,
          by: typeof payload.by === "string" ? payload.by.slice(0, 60) : "unknown",
          updated: new Date().toISOString(),
          coords: norm.coords,
          sourceCoord:
            typeof payload.sourceCoord === "string" ? payload.sourceCoord.slice(0, 40) : "",
          // Free-form grabber filter inputs, capped to keep the record small.
          grabberInputs: Array.isArray(payload.grabberInputs)
            ? payload.grabberInputs.slice(0, 20).map((v) => String(v).slice(0, 60))
            : [],
        };

        const idx = store.tabs.findIndex((t) => t.id === id);
        if (idx === -1) store.tabs.push(tab);
        else store.tabs[idx] = tab;

        await saveStore(env, store);
        return json({
          ok: true,
          id,
          count: norm.coords ? norm.coords.split(" ").length : 0,
          updated: tab.updated,
        });
      }

      return json({ error: "Method not allowed." }, 405);
    }

    return json({ error: "Not found." }, 404);
  },
};
