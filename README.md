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
async function api(path, opts = {})
