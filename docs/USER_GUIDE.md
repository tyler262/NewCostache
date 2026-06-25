# NewCostache — user guide

This is the living usage doc. It describes how to **use** the tool in-game. For
one-time deployment (Cloudflare Worker, keys, Quickbar link), see **SETUP.md**.

> Reminder: the tool **prefills** the rally point / opens attack tabs. **You**
> review and click send. It never auto-sends.

---

## Opening it

Click your **Fakes** Quickbar link on a Tribal Wars game page. A draggable panel
titled *Fakes / Nukes / Fangs* appears.

- Run it from **Overview → Combined** (`overview_villages&mode=combined`) when you
  want to actually send — the engine reads your troops from that page. If you're
  somewhere else, it'll send you there.
- First time on a device: open **Keys** and paste your **read key** (everyone) and,
  if you're a leader, your **admin key**. They're stored on that device only.

---

## The keys

| Key | Who | Lets you |
|---|---|---|
| **Read key** | every member | see the shared tabs |
| **Admin key** | leaders | publish / edit / delete shared tabs |

Paste them under **Keys** in the panel. "Forget" clears them from the device. If a
key is rotated (someone leaves the tribe), just paste the new one — no need to
touch your Quickbar link. The admin key also unlocks reading, so leaders only need
the admin key.

---

## Coordinate tabs

Two kinds, shown as tabs in the panel:

- **My list (personal):** local to your device. Add with the **＋** tab, rename by
  clicking an active tab, delete with the trash icon. Type or paste coords; they're
  cleaned to `X|Y X|Y …` automatically and saved as you go.
- **Shared (tribe):** come from the server. Members see them read-only. Leaders can
  edit a shared tab's coords and click **Publish**, create one with **＋shared**, or
  **Delete** it. Everyone else sees the update next time they open the panel.

The **active** tab is the one the engine uses as its target list.

---

## Sending fakes

1. Pick **fakes** in the attack-type dropdown.
2. For each unit, choose how many to send per fake (or **min**). The classic fake is
   **1 spy + 1 ram**. On worlds with a **fake limit**, the engine automatically
   builds the smallest army that still clears the limit, per village.
3. Set **nr fakes** (how many fakes each village sends) and **fakes per village**
   (cap on how many land on the same target).
4. Choose a launch mode (below), click **Start**, then **Show** to preview, and
   send each prefilled rally point yourself.

Fakes skip duplicates, barbarians, and villages that don't exist.

---

## Sending nukes / fangs

1. Pick **nukes** or **fangs**.
2. Enter **send** and **reserve** counts per unit, and a **min population** (only
   villages whose available army meets it will send).
3. Click **Start**. One attack is built per source village; each target is used
   once. **Delete** removes the used targets from your active personal list.

---

## Coord grabber

Click **Coord grabber** to open the filter form. Filter the world's villages by:

- players, tribes, continents,
- a min/max coordinate box,
- or a radius around a center coordinate.

Click **Grab into active tab** to drop the matching coords into the active tab.
Your filter values are remembered. Leaders: when you Publish a shared tab, its
grabber filters are saved with it.

---

## Timing (optional)

- **Night bonus:** if the world has a night bonus, the engine automatically avoids
  scheduling attacks that would land during it (static or per-player dynamic).
- **Land between:** tick *attacks land between* and set a start/end time to only
  keep attacks that land inside that window. If nothing fits, it tells you instead
  of sending.

---

## Launch modes

- **open tabs:** makes buttons that open the prefilled rally points in batches of
  **split tabs**, staggered by **delay open tabs [ms]**. Click a batch, review each
  tab, send.
- **go to rally:** opens the first rally point and queues the rest; each time you
  land on a rally page it advances to the next. Good for mobile / one-at-a-time.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "read key needed" | Open **Keys**, paste the read key, Save. |
| Shared tabs won't load | Wrong read key, or wrong worker URL in the script. |
| "Run this from Overview → Combined" | Open the combined overview, click the link again. |
| Publish says "Not authorized" | Your admin key is wrong or missing. |
| "Village database stale" | Click **Start** again — it rebuilds the village cache. |
| Coord rejected on publish | Coords must look like `500|512` (X|Y). |

---

## In-game verification checklist (after deploying)

Run through this once on a real world to confirm everything works end-to-end:

- [ ] Quickbar link opens the panel on a game page.
- [ ] Pasting the read key loads the shared tabs.
- [ ] (Leader) Publish/edit/delete a shared tab; another account sees the change.
- [ ] Personal tab: add, rename, paste coords, reload — persists.
- [ ] Fakes: Start on Combined overview prefills a rally point with the right troops.
- [ ] "fakes per village" and "nr fakes" behave as expected.
- [ ] Nukes/fangs: send/reserve/min-pop produce one attack per source; Delete works.
- [ ] Coord grabber: a player/tribe/continent filter returns the expected coords.
- [ ] Land-between window keeps only attacks landing in the window.
- [ ] open-tabs batches and go-to-rally both open prefilled (never auto-sent) pages.
