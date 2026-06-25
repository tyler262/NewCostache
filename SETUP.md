# Tribe Fake Helper — setup

Two pieces:
1. **Worker** — the backend on Cloudflare. You deploy this once.
2. **Userscript** — what all 40 people install. Members and leaders use the same file.

The whole point of this design: the admin key that lets you *write* the list lives
on Cloudflare, never inside the script members run. Members can only *read*. So even
though everyone has the script, nobody but your leaders can change the list — and if a
key ever leaks, you rotate it in one command without touching the 40 installs.

---

## Part 1 — Deploy the Worker (once, ~20–30 min)

You need a computer for this part (not phone). Free Cloudflare account.

1. **Make a Cloudflare account** at https://dash.cloudflare.com/sign-up

2. **Install Node** (if you don't have it): https://nodejs.org — grab the LTS.

3. **Open a terminal** in the folder with `worker.js` and `wrangler.toml`, then:
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

5. **Set your admin key** (this is the leader password — pick something long):
   ```
   wrangler secret put ADMIN_KEY
   ```
   It prompts you to type/paste the key. Use something like a random 20+ char string.
   Save it somewhere safe — you'll give it only to trusted leaders.

6. **Deploy:**
   ```
   wrangler deploy
   ```
   It prints your URL, e.g.:
   ```
   https://tw-fakes.yourname.workers.dev
   ```

7. **Test it:**
   Open `https://tw-fakes.yourname.workers.dev/health` in a browser. Should say `ok`.
   Open `.../list` — should show an empty list `{"updated":null,"by":null,"targets":[]}`.

Done. The backend is live and basically maintenance-free.

---

## Part 2 — Prep the userscript (once)

1. Open `tribe-fake-helper.user.js` in a text editor.
2. Find this line near the top:
   ```
   const API_BASE = "https://tw-fakes.YOUR-SUBDOMAIN.workers.dev";
   ```
   Replace it with YOUR real worker URL from step 6 (no trailing slash).
3. Save. This is the version you hand to the tribe.

---

## Part 3 — Everyone installs it

### Desktop (Chrome / Firefox / Edge)
1. Install **Tampermonkey** (browser extension store).
2. Tampermonkey dashboard → Create new script → paste the whole file → save (Ctrl+S).

### Android
1. Install **Kiwi Browser** (or Firefox for Android).
2. Install **Tampermonkey** in it (Kiwi supports Chrome extensions; Firefox has the add-on).
3. Same as desktop: new script, paste, save.

Once installed, a **"Fakes"** button appears bottom-right on the TW game page.

---

## Part 4 — Using it

### Members
- Click **Fakes** → see the current target list.
- Click **Open** on a target → it opens your rally point with troops + coord prefilled.
- **You review and click send yourself.** The script never auto-sends.
- To change your default fake composition, edit the `DEFAULT_TROOPS` line in your own
  copy (e.g. 1 spy + 1 ram is the classic fake; bump it if you want it to look heavier).

### Leaders
1. Click **Fakes** → expand **Leader login** → paste the admin key → Save.
   (Stored only on that device. Do this on each device you lead from.)
2. Now you see **Edit list**. One target per line:
   ```
   500|512 wall hit
   501|498 noble bait
   499|503
   ```
3. Click **Publish to tribe.** Every member sees it next time they open the panel.

---

## Maintenance (rare)

- **Rotate the key** (someone left the tribe / key leaked):
  ```
  wrangler secret put ADMIN_KEY
  ```
  Type a new key, then give it to current leaders. Old key stops working instantly.
  Members don't need to do anything.

- **See current data:** visit `.../list` in any browser.

- **Costs:** Cloudflare free tier = 100k requests/day. 40 people won't get close.

---

## Notes & limits

- This prefills the rally point; it does not script the actual send. That's deliberate —
  prefilling is the side of the TW rules bots-policy that's tolerated; scripted auto-send
  is not. Keep it this way.
- The coord-list approach replaces the old per-tab Dropbox file system with one shared
  list. If you want multiple separate lists (e.g. per front), say so and it's a small
  change — add a `?list=front1` style key.
- `@match` is set to `*.tribalwars.net`. If your tribe is on a different TLD
  (e.g. `.co.uk`), add another `@match` line.
