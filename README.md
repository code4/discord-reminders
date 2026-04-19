# Kingshot Discord Reminder Scheduler

A lightweight, configuration-driven reminder bot for Kingshot events.  
Runs entirely on **GitHub Actions** — no server, no database, no always-on process required.

---

## How it works

1. GitHub Actions runs the scheduler **every 5 minutes**, 24/7.
2. The script reads `events.json` and checks whether any event is due in the current 5-minute window.
3. If an event matches, it sends a message to the configured Discord channel via webhook.
4. No state is stored between runs — the schedule is deterministic.

```
GitHub Actions (every 5 min)
        │
        ▼
   src/index.js
        │
        ├── loads events.json
        ├── validates config (fails loudly with clear errors)
        ├── for each enabled event:
        │     shouldFire(event, now) ?
        │       yes → send Discord webhook message
        │       no  → skip (logged)
        └── exits with code 1 if any send failed
```

---

## Quick start

### 1. Fork or clone this repo

### 2. Edit `events.json`

This is the **only file you need to touch** for day-to-day management.  
See [Configuring events](#configuring-events) below.

### 3. Set up GitHub secrets

Go to your repo on GitHub → **Settings → Secrets and variables → Actions → New repository secret**.

Add one secret per Discord webhook you want to use:

| Secret name              | What it's for                          |
|--------------------------|----------------------------------------|
| `DISCORD_WEBHOOK_BEAR`   | Bear 1 and Bear 2 channel              |
| `DISCORD_WEBHOOK_ARENA`  | Arena channel                          |
| `DISCORD_WEBHOOK_GENERAL`| General / TAC / KvK / special events   |

You can name these anything you want — just make sure the `webhook_env` field in `events.json` matches the secret name exactly.

**How to get a Discord webhook URL:**  
Discord channel → Edit Channel → Integrations → Webhooks → New Webhook → Copy URL.

### 4. Push to `main`

GitHub Actions will automatically start scheduling runs every 5 minutes.

---

## Configuring events

Edit `events.json`. All reminders live here. You never need to touch the code.

### Event fields

| Field              | Required | Description |
|--------------------|----------|-------------|
| `id`               | ✅       | Short unique ID used in logs (e.g. `"bear1"`) |
| `name`             | ✅       | Human name shown in messages (e.g. `"Bear 1"`) |
| `enabled`          | ✅       | `true` to send, `false` to pause without deleting |
| `webhook_env`      | ✅       | Name of the GitHub secret holding the Discord webhook URL |
| `role_mention`     |          | Discord role string (see [Role mentions](#role-mentions)) |
| `message_template` | ✅       | Message text with `{placeholders}` (see below) |
| `minutes_before`   |          | Used in `{minutes_before}` placeholder. Default: `5` |
| `timezone`         |          | IANA timezone for this event. Default: `"UTC"` |
| `extra_vars`       |          | Custom key/value pairs available as `{key}` in the template |
| `schedule`         | ✅       | Schedule object (see [Schedule types](#schedule-types)) |

### Message template placeholders

| Placeholder        | Value                          |
|--------------------|--------------------------------|
| `{role}`           | The `role_mention` string      |
| `{event_name}`     | The event `name`               |
| `{time}`           | Scheduled time (HH:MM)         |
| `{minutes_before}` | The `minutes_before` value     |
| `{strategy}`       | Custom — define in `extra_vars`|
| `{any_key}`        | Any key you add to `extra_vars`|

**Example:**
```json
"message_template": "{role} **{event_name}** starts in {minutes_before} minutes! {strategy}",
"extra_vars": {
  "strategy": "Focus on center control today."
}
```

---

## Schedule types

### `daily` — fires every day at a set time

```json
"schedule": {
  "type": "daily",
  "time": "18:55"
}
```

### `weekly` — fires on specific weekdays

```json
"schedule": {
  "type": "weekly",
  "days": ["Monday", "Thursday"],
  "time": "19:55"
}
```

`days` accepts: `Monday`, `Tuesday`, `Wednesday`, `Thursday`, `Friday`, `Saturday`, `Sunday`.

### `every_n_days` — fires every N days from an anchor date

```json
"schedule": {
  "type": "every_n_days",
  "interval": 2,
  "start_date": "2026-05-20",
  "time": "18:55"
}
```

- `interval: 2` = every other day (Bear cycle)
- `start_date` = the first day it should fire; the pattern repeats from there
- To offset Bear 2 by one day from Bear 1, use a `start_date` one day later

### `one_off` — fires once on an exact date

```json
"schedule": {
  "type": "one_off",
  "date": "2026-06-15",
  "time": "19:50"
}
```

Set `enabled: false` after the event has passed so it's preserved for reference but never fires again.

---

## Role mentions

Discord roles can be mentioned in webhook messages using their raw format.  
Set this in the `role_mention` field of the event.

### How to get a role mention string

**Method 1 — from Discord chat:**
Type `\@RoleName` in any Discord message and send it. Discord will show the raw format like `<@&1234567890>`.

**Method 2 — from Developer Mode:**
1. Enable Developer Mode: Discord Settings → Advanced → Developer Mode
2. Right-click the role in Server Settings → Roles → Copy Role ID
3. Format it as: `<@&ROLE_ID_HERE>`

### Common values

| What you want          | `role_mention` value              |
|------------------------|-----------------------------------|
| Ping a specific role   | `<@&1234567890123456789>`         |
| Ping @everyone         | `@everyone`                       |
| Ping @here             | `@here`                           |
| No ping (info only)    | `""` (empty string)               |

> **Important:** For `@everyone` and `@here` pings to work, the webhook must be in a channel where the bot/integration has permission to mention everyone.

---

## Timing guidance

Set event `time` values at **clean 5-minute boundaries** (e.g. `18:55`, `19:00`, `14:30`).  
This aligns perfectly with the 5-minute execution window and avoids ambiguity.

If an event starts at 19:00 and you want a "5 minutes before" reminder:
- Set `"time": "18:55"` in the schedule
- Set `"minutes_before": 5` so the template reads correctly

---

## Testing locally

Make sure you have Node.js 18+ installed.

```bash
# Install dependencies
npm install

# Dry run — shows what would fire right now without sending anything
npm run dry-run

# Dry run with a specific time (override in your shell)
# This lets you simulate a specific moment
DRY_RUN=true EVENTS_CONFIG=./events.json node src/index.js --dry-run

# Run tests
npm test

# Lint
npm run lint
```

**Windows PowerShell:**
```powershell
$env:DRY_RUN="true"; node src/index.js --dry-run
```

**To test with a real webhook locally:**
```bash
DISCORD_WEBHOOK_BEAR="https://discord.com/api/webhooks/..." npm start
```

---

## Manual trigger

To trigger the scheduler manually from GitHub (useful for testing):

1. Go to your repo on GitHub
2. Click **Actions** tab
3. Click **Kingshot Reminder Scheduler** in the left sidebar
4. Click **Run workflow**
5. Choose **dry_run: true** to test without sending, or **false** to send for real
6. Click **Run workflow**

---

## Adding a new event

1. Open `events.json`
2. Copy an existing event block (including the `{ }` and surrounding comma)
3. Change the `id` to something unique (no spaces)
4. Update `name`, `schedule`, `message_template`, etc.
5. If using a new Discord channel, add a new secret in GitHub Settings and add it to the `env` block in `.github/workflows/reminder.yml`
6. Commit and push

---

## Batching (multiple events, one message)

When two or more events fire in the same 5-minute slot **and target the same Discord channel** (same `webhook_env`), the scheduler automatically combines them into a single Discord message instead of sending separate pings.

**Why this matters:** If Bear Hunt and Arena both fire at 18:55 UTC into the same channel, your alliance gets one clean message instead of two back-to-back pings.

**How it looks in Discord:**
```
<@&BEAR_ROLE> Bear Hunt starts in 5 minutes! Get your troops ready. 🐻

<@&ARENA_ROLE> Arena starts in 5 minutes! Report to battle. ⚔️
```

Each event's `message_template` is rendered independently (so role mentions and custom vars still work per-event), then joined with a blank line separator.

Events going to **different channels** (different `webhook_env`) are never combined — they're sent separately to their respective channels regardless of timing.

No configuration needed — batching is automatic.

---

## Pausing or removing an event

**Pause (keep config, stop sending):** Set `"enabled": false`

**Remove permanently:** Delete the entire event object from the `events` array in `events.json`

---

## GitHub secrets reference

If you add a new `webhook_env` value in `events.json`, you must:

1. Add the secret in GitHub: Settings → Secrets and variables → Actions → New repository secret
2. Add the env var to `.github/workflows/reminder.yml` under `env:`:

```yaml
env:
  DISCORD_WEBHOOK_BEAR: ${{ secrets.DISCORD_WEBHOOK_BEAR }}
  DISCORD_WEBHOOK_ARENA: ${{ secrets.DISCORD_WEBHOOK_ARENA }}
  DISCORD_WEBHOOK_GENERAL: ${{ secrets.DISCORD_WEBHOOK_GENERAL }}
  MY_NEW_CHANNEL: ${{ secrets.MY_NEW_CHANNEL }}   # ← add this line
```

---

## Known limitations

### GitHub Actions cron delay

GitHub's scheduled workflows are **not guaranteed to fire exactly on time**.  
Under heavy platform load they can be delayed by 5–15 minutes.

**Impact:** If GitHub Actions delays a run longer than 5 minutes, that reminder may be missed.

**Mitigation:**
- The system uses a deterministic 5-minute matching window — double-sends are extremely unlikely under normal operation (see note below)
- For time-critical reminders, use the manual trigger as a backup
- This is an inherent limitation of free hosted CI; it affects all GitHub-Actions-based bots

### When double-sends can still occur

The slot-based design prevents doubles under normal operation, but these edge cases exist:

- **Manual `workflow_dispatch`** triggered while the scheduled run is in the same slot
- **Re-running a failed job** via the GitHub Actions UI when the slot is still active
- **Two delayed runs** that both fall into the same slot window (very rare)
- **Future parallel workflows** if you add a second workflow file that also calls `npm start`

None of these happen in day-to-day use. They only matter if you're debugging and manually triggering runs.

---

### No catch-up after missed runs

If the scheduler misses a firing window (e.g. due to GitHub outage), it does **not** retry.  
This is intentional — sending a stale reminder 30 minutes late is worse than not sending it.

### No per-user subscriptions

All reminders go to the configured channel/role. There's no opt-in per user.  
See [Future upgrade path](#future-upgrade-path) if you need this.

---

## Troubleshooting

**Reminder not sending**
- Check the Actions run log: repo → Actions → the failed run → expand steps
- Verify the secret name in `webhook_env` exactly matches a GitHub secret (case-sensitive)
- Confirm the webhook URL in the secret is still valid (Discord webhooks can be deleted/regenerated)
- Check that `enabled: true` is set

**Wrong time — reminder fires at the wrong hour**
- Verify the `timezone` field. Use IANA names like `"UTC"`, `"America/New_York"`, `"Europe/London"`
- All GitHub Actions runners run in UTC. The script converts to the event's timezone internally.
- When in doubt, use `"UTC"` everywhere and convert manually

**Bear cycle is off by one day**
- Check your `start_date`. If today is an "off" day and you want it to fire today, shift `start_date` by one day
- Use `npm run dry-run` to see which events match right now

**Config validation error on startup**
- The error message will tell you exactly which field is invalid and why
- Example: `• events[0.schedule.time]: Must be HH:MM format (e.g. "19:05")`

**Actions workflow not running**
- GitHub automatically disables scheduled workflows if the repo has no activity for 60 days
- Fix: Go to Actions tab → click the workflow → click "Enable workflow"
- Or push a small commit to re-activate it

---

## Project structure

```
discord-reminders/
├── src/
│   ├── index.js               # Entry point
│   ├── config/
│   │   ├── loader.js          # Reads and validates events.json
│   │   └── schema.js          # Zod schemas for all config types
│   ├── scheduler/
│   │   └── matcher.js         # shouldFire() — pure schedule matching logic
│   ├── discord/
│   │   └── webhook.js         # Discord webhook sender
│   ├── templates/
│   │   └── default.js         # Message template renderer
│   └── utils/
│       ├── logger.js          # Timestamped console logger
│       └── time.js            # Luxon time helpers
├── events.json                # ← Edit this to manage reminders
├── tests/
│   └── matcher.test.js        # Unit tests for schedule logic
├── .github/workflows/
│   └── reminder.yml           # GitHub Actions workflow
└── package.json
```

---

## Future upgrade path

If your needs grow beyond what this repo supports:

### Slash commands
Replace the webhook-only approach with a real Discord bot using [discord.js](https://discord.js.org/).  
Requires an always-on process (e.g. a $5/month VPS or Railway/Fly.io free tier).

### Per-user subscriptions
Store subscription state in a lightweight database (SQLite or a free-tier Supabase/PlanetScale).  
The bot can DM users individually instead of pinging a role.

### Web admin UI
Build a small Next.js or Remix app that reads/writes `events.json` (or a DB) via API routes.  
Host on Vercel for free. Still no always-on server needed for the scheduler itself.

### Persistent storage / audit log
Add a simple append-only log of sent reminders to a GitHub Gist or R2/S3 bucket.  
Useful for debugging missed fires and confirming delivery.

### Real Discord bot instead of webhooks
Webhooks are one-way (push only). A real bot can read messages, respond to commands,  
handle reactions, manage roles, and more. The scheduler logic in this repo is reusable —  
swap `src/discord/webhook.js` for a discord.js client.

---

## Scheduling logic explained

The scheduler uses **stateless slot-based window matching**:

1. The GitHub Actions workflow fires every 5 minutes
2. When the script runs, it computes the current 5-minute slot:  
   e.g. if it's `18:52 UTC` → slot is `18:50`
3. For each event, it computes the event's scheduled slot:  
   e.g. an event at `18:55` → slot is `18:55`
4. If the slots match, the event fires

This means:
- An event at `18:55` fires when the runner executes anywhere in `[18:55, 19:00)`
- An event at `18:50` fires when the runner executes anywhere in `[18:50, 18:55)`
- **Double-sends are extremely unlikely** — the same slot can only match once per normal run window
- **No state file needed** — the result is always deterministic

**Recommendation:** Set event times at clean 5-minute boundaries (`18:55`, `19:00`, `20:30`)  
so they always align with slot boundaries and the behavior is predictable.
