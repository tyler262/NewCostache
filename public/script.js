// ==UserScript==
// @name         Tribe Fake Helper (W154)
// @namespace    tribe-fake-helper
// @version      1.0.0
// @description  Shared fake-attack target list for the tribe. Prefills the rally point — does NOT auto-send.
// @match        https://*.tribalwars.net/game.php*
// @grant        none
// ==/UserScript==

/*
 *  HOW IT WORKS
 *  ------------
 *  - Members: open the panel, see the leaders' current target list, click a
 *    target to open the rally point with the troops + coord prefilled. You
 *    review and hit send yourself.
 *  - Leaders: paste the admin key once (saved on your device only). An "Edit
 *    list" box appears. Paste/edit targets, hit Publish, everyone gets them.
 *
 *  The admin key never ships to members — it only exists on devices where a
 *  leader typed it in.
 *
 *  >>> SET THIS to your deployed worker URL (no trailing slash):
 */
const API_BASE = "https://tw-fakes.YOUR-SUBDOMAIN.workers.dev";

(function () {
  "use strict";

  // Only run on the rally point / overview-ish pages where it's useful.
  if (typeof game_data === "undefined") return;

  const LS_KEY = "tribeFakeAdminKey";
  const LS_TROOPS = "tribeFakeTroopPreset";

  // Default fake composition. Members can tweak locally; this is what gets
  // dropped into the rally point. W154 has archers active.
  const DEFAULT_TROOPS = JSON.parse(
    localStorage.getItem(LS_TROOPS) ||
      JSON.stringify({ spear: 0, sword: 0, axe: 0, archer: 0, spy: 1, light: 0, marcher: 0, heavy: 0, ram: 1, catapult: 0, snob: 0 })
  );

  // ---------- styling ----------
  const css = `
    #tfh-btn{position:fixed;right:14px;bottom:14px;z-index:99999;
      background:#5a3a1a;color:#f3e6c9;border:2px solid #c9a25a;
      border-radius:6px;padding:8px 12px;font:bold 13px/1 Verdana,sans-serif;
      cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.4)}
    #tfh-panel{position:fixed;right:14px;bottom:56px;z-index:99999;width:340px;
      max-height:70vh;overflow:auto;background:#f4e9d0;border:2px solid #80501a;
      border-radius:8px;padding:0;display:none;font:12px/1.4 Verdana,sans-serif;
      color:#2b1c08;box-shadow:0 4px 18px rgba(0,0,0,.45)}
    #tfh-panel h3{margin:0;padding:10px 12px;background:#80501a;color:#f3e6c9;
      font-size:13px;border-radius:6px 6px 0 0}
    .tfh-body{padding:10px 12px}
    .tfh-meta{font-size:10px;color:#6b5430;margin-bottom:8px}
    .tfh-target{display:flex;justify-content:space-between;align-items:center;
      gap:8px;padding:6px 8px;margin-bottom:4px;background:#fff7e6;
      border:1px solid #d8bd86;border-radius:4px}
    .tfh-target b{font-family:monospace;font-size:13px}
    .tfh-target span{flex:1;color:#5a4420;font-size:11px}
    .tfh-go{background:#3a6b2f;color:#fff;border:0;border-radius:3px;
      padding:5px 9px;cursor:pointer;font-size:11px;white-space:nowrap}
    .tfh-go:hover{background:#4d8a3f}
    .tfh-sub{margin-top:10px;border-top:1px solid #d8bd86;padding-top:8px}
    .tfh-sub summary{cursor:pointer;font-weight:bold;color:#80501a}
    .tfh-sub textarea{width:100%;height:120px;margin-top:6px;font:11px monospace;
      box-sizing:border-box;border:1px solid #b89a5e;border-radius:4px;padding:6px}
    .tfh-sub input{width:100%;box-sizing:border-box;margin-top:4px;padding:5px;
      border:1px solid #b89a5e;border-radius:4px}
    .tfh-pub{margin-top:6px;width:100%;background:#80501a;color:#f3e6c9;border:0;
      border-radius:4px;padding:7px;cursor:pointer;font-weight:bold}
    .tfh-note{font-size:10px;color:#6b5430;margin-top:4px}
    .tfh-err{color:#9a2b2b;font-weight:bold}
    .tfh-ok{color:#3a6b2f;font-weight:bold}
  `;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // ---------- DOM ----------
  const btn = document.createElement("button");
  btn.id = "tfh-btn";
  btn.textContent = "Fakes";
  document.body.appendChild(btn);

  const panel = document.createElement("div");
  panel.id = "tfh-panel";
  panel.innerHTML = `<h3>Tribe Fakes — W154</h3><div class="tfh-body" id="tfh-body">Loading…</div>`;
  document.body.appendChild(panel);

  btn.addEventListener("click", () => {
    panel.style.display = panel.style.display === "block" ? "none" : "block";
    if (panel.style.display === "block") loadList();
  });

  // ---------- helpers ----------
  function rallyUrl(coord) {
    const [x, y] = coord.split("|");
    const t = DEFAULT_TROOPS;
    const params = new URLSearchParams({
      screen: "place",
      x, y,
      spear: t.spear, sword: t.sword, axe: t.axe, archer: t.archer,
      spy: t.spy, light: t.light, marcher: t.marcher, heavy: t.heavy,
      ram: t.ram, catapult: t.catapult, snob: t.snob,
    });
    // village=current, so it sends from whatever village you're sitting in
    return `/game.php?village=${game_data.village.id}&${params.toString()}`;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  // ---------- member view ----------
  async function loadList() {
    const body = document.getElementById("tfh-body");
    body.innerHTML = "Loading…";
    let data;
    try {
      const res = await fetch(`${API_BASE}/list`, { cache: "no-store" });
      data = await res.json();
    } catch (e) {
      body.innerHTML = `<p class="tfh-err">Couldn't reach the list. Check your connection or tell a leader the server URL may be wrong.</p>`;
      return;
    }

    const targets = data.targets || [];
    let html = "";
    if (data.updated) {
      const when = new Date(data.updated).toLocaleString();
      html += `<div class="tfh-meta">${targets.length} target(s) · set by ${esc(data.by || "?")} · ${esc(when)}</div>`;
    }
    if (targets.length === 0) {
      html += `<p>No targets posted yet. A leader needs to publish a list.</p>`;
    } else {
      for (const t of targets) {
        html += `<div class="tfh-target">
          <b>${esc(t.coord)}</b>
          <span>${esc(t.note || "")}</span>
          <button class="tfh-go" data-coord="${esc(t.coord)}">Open</button>
        </div>`;
      }
    }

    html += renderAdminSection();
    body.innerHTML = html;

    body.querySelectorAll(".tfh-go").forEach((b) => {
      b.addEventListener("click", () => {
        window.location.href = rallyUrl(b.dataset.coord);
      });
    });

    wireAdmin();
  }

  // ---------- admin view ----------
  function renderAdminSection() {
    const hasKey = !!localStorage.getItem(LS_KEY);
    if (!hasKey) {
      return `<details class="tfh-sub"><summary>Leader login</summary>
        <input type="password" id="tfh-keyin" placeholder="Paste admin key">
        <button class="tfh-pub" id="tfh-savekey">Save key on this device</button>
        <div class="tfh-note">Stored only on this device. Leaders only.</div>
      </details>`;
    }
    return `<details class="tfh-sub" open><summary>Edit list (leader)</summary>
      <div class="tfh-note">One target per line: <code>X|Y note here</code></div>
      <textarea id="tfh-edit" placeholder="500|512 wall hit&#10;501|498 noble bait"></textarea>
      <button class="tfh-pub" id="tfh-publish">Publish to tribe</button>
      <div class="tfh-note" id="tfh-status"></div>
      <button class="tfh-pub" id="tfh-forget" style="background:#8a3a3a;margin-top:8px">Forget key on this device</button>
    </details>`;
  }

  function wireAdmin() {
    const saveKey = document.getElementById("tfh-savekey");
    if (saveKey) {
      saveKey.addEventListener("click", () => {
        const k = document.getElementById("tfh-keyin").value.trim();
        if (k) {
          localStorage.setItem(LS_KEY, k);
          loadList();
        }
      });
    }

    const forget = document.getElementById("tfh-forget");
    if (forget) {
      forget.addEventListener("click", () => {
        localStorage.removeItem(LS_KEY);
        loadList();
      });
    }

    const publish = document.getElementById("tfh-publish");
    if (publish) {
      // Prefill the editor with the current list for easy editing.
      fetch(`${API_BASE}/list`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          const ta = document.getElementById("tfh-edit");
          if (ta && d.targets) {
            ta.value = d.targets.map((t) => `${t.coord}${t.note ? " " + t.note : ""}`).join("\n");
          }
        })
        .catch(() => {});

      publish.addEventListener("click", async () => {
        const status = document.getElementById("tfh-status");
        const lines = document.getElementById("tfh-edit").value.split("\n").map((l) => l.trim()).filter(Boolean);
        const targets = [];
        for (const line of lines) {
          const m = line.match(/^(\d{1,3}\|\d{1,3})\s*(.*)$/);
          if (!m) {
            status.className = "tfh-err";
            status.textContent = `Bad line: "${line}". Use X|Y note.`;
            return;
          }
          targets.push({ coord: m[1], note: m[2] || "" });
        }
        status.className = "tfh-note";
        status.textContent = "Publishing…";
        try {
          const res = await fetch(`${API_BASE}/list`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Admin-Key": localStorage.getItem(LS_KEY) },
            body: JSON.stringify({ targets, by: game_data.player.name }),
          });
          const out = await res.json();
          if (!res.ok) {
            status.className = "tfh-err";
            status.textContent = out.error || "Publish failed.";
            return;
          }
          status.className = "tfh-ok";
          status.textContent = `Published ${out.count} target(s).`;
          loadList();
        } catch (e) {
          status.className = "tfh-err";
          status.textContent = "Network error while publishing.";
        }
      });
    }
  }
})();
