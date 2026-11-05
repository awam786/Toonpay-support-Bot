# ToonPay Support Bot

Support ticketing bot with 20 languages, admin group workflow, web dashboard, and broadcast engine. **Users create tickets entirely through the bot** — no user-facing app.

## New user flow (bot only)

1. User sends `/start`
2. Bot asks for language (20 options, 2-column keyboard)
3. User taps a language → bot saves preference and sends a full **guide message** with:
   - How to create a ticket (button + `/newticket` command)
   - How to check status (`/status <id>`, `/mytickets`)
   - How to reply to a ticket
   - How to change language (`/language`)
4. User taps **Create Ticket Now** → category keyboard → describe issue → ticket is created and confirmed with a ticket number
5. User can check status with `/status <ticket_id>`, list tickets with `/mytickets`, and reply by typing (auto-added to open ticket) or `/reply <id> <text>`

**All bot messages are localized** to the user's selected language.

## Supported languages (order of keyboard)

1. 🇬🇧 English
2. 🇪🇸 Español
3. 🇩🇪 Deutsch
4. 🇭🇺 Magyar
5. 🇹🇷 Türkçe
6. 🇷🇺 Русский
7. 🇫🇷 Français
8. 🇮🇹 Italiano
9. 🇵🇹 Português
10. 🇨🇳 中文
11. 🇯🇵 日本語
12. 🇰🇷 한국어
13. 🇸🇦 العربية
14. 🇮🇳 हिन्दी
15. 🇧🇩 বাংলা
16. 🇵🇰 اردو
17. 🇮🇩 Indonesia
18. 🇻🇳 Tiếng Việt
19. 🇹🇭 ไทย
20. 🇳🇱 Nederlands

## User commands

| Command | Description |
|---|---|
| `/start` | Welcome + language picker (first time) or guide |
| `/newticket` | Start a new ticket (category → description) |
| `/mytickets` | List your tickets |
| `/status <id>` | Check a specific ticket's status |
| `/reply <id> <text>` | Reply to a ticket |
| `/language` | Change your language |
| `/guide` | Show the guide again |
| `/cancel` | Cancel any pending action |

## Admin commands (English, in DM or admin group)

| Command | Description |
|---|---|
| `/reply <ticket#> <text>` | Reply to a ticket (delivered to user) |
| `/note <ticket#> <text>` | Internal note (user never sees it) |
| `/ticket <ticket#>` | Show ticket card with action buttons |
| `/stats` | Ticket counters |
| `/broadcast` | Start interactive broadcast |
| `/skip` | Skip inline buttons step during broadcast |
| `/cancel` | Abort pending admin action |

## Admin group behaviour

- Plain messages in the group are **never** sent to users
- Admins must use the **💬 Reply** button, `/reply <id> <text>`, or the dashboard's **Send Reply** button
- Claiming is race-safe (atomic DB update)
- Every action is recorded in `ticket_events` (append-only audit log)

## Railway deployment (complete)

### 1. Create the bot
- `@BotFather` → `/newbot` → save token
- Create a supergroup (enable Topics if desired), add the bot, promote it to **admin**

### 2. Create the Railway project
- New project → **+ New** → **Database** → **PostgreSQL** (volume attached automatically)

### 3. Push to GitHub
```bash
git init && git add . && git commit -m "init"
git remote add origin https://github.com/YOU/toonpay-support-bot.git
git push -u origin main
```

### 4. Add the bot service
- Railway project → **+ New** → **GitHub Repo** → select your repo

### 5. Variables

| Key | Value |
|---|---|
| `BOT_TOKEN` | from BotFather (**sealed**) |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `ADMIN_IDS` | `123456789,987654321` |
| `ADMIN_GROUP_ID` | `-100…` |
| `WEBHOOK_SECRET` | long random string (**sealed**) |
| `PUBLIC_DOMAIN` | fill after step 6 |
| `PORT` | `3000` |
| `NODE_ENV` | `production` |

### 6. Generate public domain
Settings → Networking → **Generate Domain** → copy hostname → set `PUBLIC_DOMAIN` (no `https://`)

### 7. Redeploy
The bot registers the webhook automatically on boot.

### 8. Enable backups
Postgres → Backups → daily + weekly + PITR. For maximum safety, schedule `pg_dump` to an external bucket.

### 9. Test

1. Send `/start` as a new user → language keyboard appears
2. Pick **Deutsch** → guide appears in German with **Ticket erstellen** button
3. Tap the button → category keyboard → pick **Zahlung** → describe issue → ticket number returned in German
4. Send `/status <number>` → status returned in German
5. Send `/language` → pick **Français** → guide appears in French
6. In the admin group: type a plain message → confirm it does **not** reach the user
7. Press **💬 Reply** → send text → user receives it in their language header
8. Open the dashboard → tickets show language flag next to user
9. Broadcast test: `/broadcast` → text → `/skip` → **Specific Users** → your ID → message arrives with buttons

## File map

```
public/dashboard.html   Admin dashboard (single-file UI)
src/server.js           Express + webhook entry
src/db.js               Postgres schema (adds users.language, user_states)
src/i18n.js             20-language translations
src/bot.js              Bot handlers: language → guide → /newticket flow
src/api.js              REST API for the dashboard
src/broadcast.js        Broadcast job engine
```

## Adding a language

Edit `src/i18n.js` — add a new entry to `LANGUAGES`, add the code to `LANGUAGE_ORDER`, and it appears in the keyboard automatically. The bot falls back to English for any missing key.
