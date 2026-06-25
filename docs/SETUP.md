# NewCostache — setup

Two pieces:
1. **Worker** — the Cloudflare backend. You deploy this once. It stores the shared
   coordinate tabs **and** serves the in-game script itself.
2. **Quickbar link** — what all ~40 people add in-game. It loads the script from
   your Worker. The link contains **no secret**.

The whole point of this design:

- The **admin key** (lets you *write/publish* tabs) and the **read key** (lets you
  *see* the tabs) live as secrets on Cloudflare — never inside anything members run.
- Members paste the **read key** once; leaders also hold the **admin key**.
- If a key ever leaks (or someone leaves the tribe), you rotate it in one command
  without touching anyone's Quickbar link.
- Because the script is loaded fresh each time via `$.getScript`, everyone
  auto-updates — you never re-hand-out anything.

---

## Part 1 — Deploy the Worker (once, ~20–30 min)

You need a computer for this part (not a phone) and a free Cloudflare account.

1. **Make a Cloudflare account** at https://dash.cloudflare.com/sign-up

2. **Install Node** (if you don't have it): https://nodejs.org — grab the LTS.

3. **Open a terminal in the `worker/` folder** of this project, then:
   ```
   npm install -g wrangler
   wrangler login
   ```
   `wrangler login` opens a browser to authorize. Approve it.

4. **Create the storage** (KV namespace):
   ```
   wrangler kv namespace create FAKES
   ```
   It prints something like:
   ```
   id = "abc123def456..."
   ```
   Copy that id into `wrangler.toml`, replacing `PASTE_YOUR_KV_ID_HERE`.

5. **Set your two keys** (each is prompted; pick long random strings, 20+ chars):
   ```
   wrangler secret put ADMIN_KEY
   wrangler secret put READ_KEY
   ```
   - `ADMIN_KEY` → give only to trusted leaders (lets them publish/delete tabs).
   - `READ_KEY`  → give to every member (lets them see the tabs).
   Save both somewhere safe.

6. **Deploy:**
   ```
   wrangler deploy
   ```
   It prints your URL, e.g.:
   ```
   https://tw-fakes.yourname.workers.dev
   ```
   The `worker/wrangler.toml` already points `[assets]` at `../public`, so the same
   deploy publishes `script.js` and `localforage.js` too.

7. **Test it:**
   - `https://tw-fakes.yourname.workers.dev/health` → should say `ok`.
   - `https://tw-fakes.yourname.workers.dev/script.js` → should show the script source.
   - `.../tabs` in a plain browser → should say *"Not authorized. Check your read
     key."* (that's correct — the list is gated).

Done. The backend is live and basically maintenance-free.

---

## Part 2 — Put your worker URL in the script (once)

1. Open `public/script.js`.
2. Near the top, set:
   ```js
   const API_BASE = "https://tw-fakes.YOUR-SUBDOMAIN.workers.dev"; // no trailing slash
   ```
   to YOUR real worker URL from step 6.
3. Save and **deploy again** (`wrangler deploy`) so the served copy has your URL.

---

## Part 3 — Everyone adds the Quickbar link

In Tribal Wars: **Settings → Quickbar → add a link**. Give it a name (e.g.
`Fakes`) and this URL:

```
javascript:$.getScript('https://tw-fakes.YOUR-SUBDOMAIN.workers.dev/script.js');void(0);
```

(Use your real worker URL.) That's it — no extension, no install. Clicking the
Quickbar link on a game page opens the tool.

Works on desktop and on mobile (the in-game Quickbar exists on both).

---

## Part 4 — Using it

### Members
1. Click the **Fakes** Quickbar link → the panel opens.
2. First time only: paste the **read key** when asked → it's saved on that device.
3. Pick a shared tab, set your troops, and launch. See **USER_GUIDE.md** for the
   full walkthrough.

### Leaders
1. Same as members, plus paste the **admin key** under leader login (saved on that
   device only).
2. You can now edit/publish/delete shared tabs. See **USER_GUIDE.md**.

---

## Maintenance (rare)

- **Rotate a key** (someone left / a key leaked):
  ```
  wrangler secret put ADMIN_KEY     # or READ_KEY
  ```
  Type a new value, then give it to the right people. The old one stops working
  instantly. Nobody needs to change their Quickbar link.

- **Costs:** Cloudflare free tier = 100k requests/day. ~40 people won't get close.

---

## Notes & limits

- A read key keeps the list non-public, non-indexable, and useless to someone who
  only has the URL. It **cannot** stop a member (or a spy already in the tribe) who
  has the key from leaking it — that limit is inherent to any script everyone runs.
  Rotating the key is your remedy.
- The script prefills the rally point / opens attack tabs; **you** review and send.
  It does not script the actual send, in line with TW's bot policy. Keep it that way.
