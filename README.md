# NewCostache

A Tribal Wars **Fakes / Nukes / Fangs** helper for a tribe — a modern rebuild of
the original "Costache" script.

It has two parts:

- **`worker/`** — a Cloudflare Worker (+ KV) that stores the tribe's shared
  coordinate lists and serves the script itself. The write credential
  (`ADMIN_KEY`) and read credential (`READ_KEY`) live only on the server, never
  in anything members run.
- **`public/`** — `script.js`, the in-game tool, loaded via a TW **Quickbar link**
  (`javascript:$.getScript('.../script.js');void(0);`). `localforage.js` is a
  vendored dependency served alongside it.

## Why this rebuild

The original stored everything in Dropbox with the Dropbox token embedded
(obfuscated) in the client, and loaded code from third-party Dropbox URLs at
runtime. This version moves storage to a Cloudflare Worker so:

- the write key never ships to members — they can only read the list;
- there's no secret inside the Quickbar link;
- keys are rotatable in one command if someone leaves the tribe;
- `$.getScript` always fetches fresh, so everyone auto-updates.

## Docs

- **`docs/SETUP.md`** — deploy the Worker and hand out the Quickbar link.
- **`docs/USER_GUIDE.md`** — how members and leaders use it (the living usage doc).

> Status: feature-complete rebuild. Fakes, nukes/fangs, the coord grabber, night-bonus
> and landing-window timing, shared/personal tabs, and a theme picker are all in.
> Verified offline (Node + JSDOM harnesses); confirm live in-game with the checklist
> in `docs/USER_GUIDE.md`.
