# ToonPay Support Bot

Support ticketing bot with admin group workflow, web dashboard and broadcast engine.

## Deploy on Railway (complete process)

### 1. Get the bot token
- Open **@BotFather** → `/newbot`
- Save the **token**
- Create a **supergroup** (enable Topics if you want per-ticket topics)
- Add the bot to the group and promote it to **admin** (needs permission to pin, edit, send messages)
- Get the **group chat ID** (starts with `-100`). If you don't know it, add `@userinfobot` or `@RawDataBot` to the group, or use the Telegram API once the bot is running.
- Get your own **Telegram user ID** from `@userinfobot` (needed in `ADMIN_IDS`).

### 2. Create the Railway project
1. Go to https://railway.app and create a new project
2. Click **+ New** → **Database** → **PostgreSQL**
3. Railway attaches a volume automatically — data survives redeploys

### 3. Push the repo to GitHub
```bash
git init
git add .
git commit -m "init"
git remote add origin https://github.com/YOUR-USER/toonpay-support-bot.git
git push -u origin main
```

### 4. Create the bot service on Railway
1. In the project → **+ New** → **GitHub Repo** → select your repo
2. Railway auto-detects Node.js and uses `railway.json`

### 5. Set environment variables
In the bot service → **Variables**:

| Key | Value |
|---|---|
| `BOT_TOKEN` | from BotFather (mark as **sealed**) |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference) |
| `ADMIN_IDS` | `123456789,987654321` (your admin Telegram IDs) |
| `ADMIN_GROUP_ID` | `-100…` (your admin supergroup) |
| `WEBHOOK_SECRET` | long random string (sealed) |
| `PUBLIC_DOMAIN` | fill after step 6 |
| `PORT` | `3000` |
| `NODE_ENV` | `production` |

### 6. Generate the public domain
1. Service → **Settings** → **Networking** → **Generate Domain**
2. Copy the host (e.g. `toonpay-bot.up.railway.app`)
3. Set `PUBLIC_DOMAIN` to that host (no `https://`)

### 7. Redeploy
Railway will restart the service, call `setWebhook`, and start receiving updates.

### 8. Enable backups (advanced)
In the **Postgres** service → **Backups** tab:
- Enable **daily** schedule (retention 6 days)
- Enable **weekly** schedule (retention 4 weeks)
- Enable **PITR** (point-in-time recovery)

For maximum safety, run a scheduled `pg_dump` to an external bucket (R2/B2/S3) at least weekly.

### 9. Test end-to-end
1. DM the bot as a normal user → a ticket appears in the admin group and on the dashboard
2. In the admin group, type a **plain message** → confirm it does NOT reach the user
3. Click **💬 Reply** on the ticket card → send text → user receives it
4. From the dashboard, open the ticket → **Send Reply** → user receives it
5. Open the **Broadcast** view → send a test to yourself (Specific Users: your ID) with and without inline buttons

## Adding admin auth to the dashboard (optional but recommended)

The dashboard sends requests without an `x-admin-id` header by default. To enable per-admin attribution and audit, add this to the `api()` function in `public/dashboard.html`:

```js
async function api(path, opts = {}) {
  const adminId = localStorage.getItem('toonpay_admin_id')
    || prompt('Your Telegram ID:') || '0';
  localStorage.setItem('toonpay_admin_id', adminId);
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json', 'x-admin-id': adminId },
    ...opts
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

## Bot commands (work in admin group or in DM as admin)

| Command | Description |
|---|---|
| `/start` | Welcome / create ticket (users) |
| `/reply <ticket#> <text>` | Reply to a ticket |
| `/note <ticket#> <text>` | Save an internal note |
| `/ticket <ticket#>` | Show ticket card |
| `/stats` | Show ticket counters |
| `/broadcast` | Start interactive broadcast flow |
| `/skip` | Skip inline buttons step during broadcast |
| `/cancel` | Abort any active reply/broadcast |

## Broadcast flow via bot

1. Send `/broadcast`
2. Send text OR photo/video/GIF/document (caption = text)
3. Send inline buttons as lines: `Label | https://url` or send `/skip`
4. Choose audience: All Users / Specific Users / All Groups / Specific Groups
5. If specific → send comma-separated IDs

The engine handles:
- Multiple photos → `sendMediaGroup` + follow-up message with buttons
- Video / GIF → `sendVideo` / `sendAnimation` with inline keyboard
- Rate limiting (~20/sec) with progress tracking in `broadcast_jobs`
- Automatic `blocked=true` marking for users who blocked the bot (error 403)

## Data persistence

- **Database**: PostgreSQL on a Railway volume — survives restart/redeploy
- **Uploaded files**: forwarded through Telegram, referenced by `file_id` — nothing stored on disk
- **Audit log**: append-only `ticket_events` table records every action
- **Backups**: volume snapshots + PITR + offsite `pg_dump`

## File map

```
public/dashboard.html   Admin UI (single file, no build)
src/server.js           Express + webhook entry point
src/db.js               Postgres pool + schema + seeding
src/bot.js              Telegraf handlers, ticket routing, interactive broadcast
src/api.js              REST API consumed by the dashboard
src/broadcast.js        Broadcast job engine (media groups, rate limit)
```
