require('dotenv').config();
const express = require('express');
const path = require('path');
const { bot } = require('./bot');
const { init, pool } = require('./db');
const apiRouter = require('./api');

const app = express();
app.use(express.json({ limit: '5mb' }));

// dashboard
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html')));

// API
app.use('/api', apiRouter);

// Telegram webhook
app.post('/webhook', (req, res) => {
  const secret = req.headers['x-telegram-bot-api-secret-token'];
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).end();
  }
  bot.handleUpdate(req.body, res).catch(err => {
    console.error('handleUpdate error:', err);
    res.status(200).end();
  });
});

// health
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, ts: Date.now() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = parseInt(process.env.PORT, 10) || 3000;

async function start() {
  await init();

  if (process.env.PUBLIC_DOMAIN && process.env.WEBHOOK_SECRET) {
    try {
      await bot.telegram.setWebhook(
        `https://${process.env.PUBLIC_DOMAIN}/webhook`,
        { secret_token: process.env.WEBHOOK_SECRET, drop_pending_updates: false }
      );
      const info = await bot.telegram.getWebhookInfo();
      console.log('Webhook registered:', info.url);
    } catch (e) {
      console.error('Webhook setup failed:', e.message);
    }
  } else {
    console.warn('PUBLIC_DOMAIN or WEBHOOK_SECRET missing — webhook not registered');
  }

  app.listen(PORT, () => console.log(`Server listening on :${PORT}`));
}

process.on('unhandledRejection', err => console.error('Unhandled rejection:', err));
process.on('uncaughtException', err => console.error('Uncaught exception:', err));

start().catch(err => {
  console.error('Startup error:', err);
  process.exit(1);
});
