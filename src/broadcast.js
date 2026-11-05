const { pool } = require('./db');

function buildInlineKeyboard(buttons) {
  if (!buttons || buttons.length === 0) return undefined;
  return { inline_keyboard: buttons.map(row => row.map(b => ({ text: b.text, url: b.url }))) };
}

async function resolveTargets(target, ids) {
  if (target === 'all_users') {
    const r = await pool.query('SELECT telegram_id FROM users WHERE blocked=false');
    return r.rows.map(x => x.telegram_id);
  }
  if (target === 'specific_users') {
    return String(ids || '').split(',').map(s => parseInt(s.trim())).filter(Boolean);
  }
  if (target === 'all_groups') {
    const r = await pool.query('SELECT telegram_id FROM groups WHERE active=true');
    return r.rows.map(x => x.telegram_id);
  }
  if (target === 'specific_groups') {
    return String(ids || '').split(',').map(s => parseInt(s.trim())).filter(Boolean);
  }
  return [];
}

function parseMedia(media) {
  if (!media) return [];
  return String(media).split(',').map(s => s.trim()).filter(Boolean);
}

function isVideo(s) { return /\.(mp4|mov|mkv)$/i.test(s); }
function isAnimation(s) { return /\.gif$/i.test(s); }

async function sendToTarget(bot, chatId, payload) {
  const keyboard = buildInlineKeyboard(payload.inline_buttons);
  const text = payload.text || '';
  const media = parseMedia(payload.media);

  // Album (multiple media)
  if (media.length > 1) {
    const group = media.map((m, i) => ({
      type: isVideo(m) ? 'video' : 'photo',
      media: m,
      caption: i === 0 ? text : undefined,
      parse_mode: 'HTML'
    }));
    await bot.telegram.sendMediaGroup(chatId, group);
    if (keyboard) {
      await bot.telegram.sendMessage(chatId, payload.button_text || '👇', { reply_markup: keyboard });
    }
    return;
  }

  if (media.length === 1) {
    const m = media[0];
    const opts = { caption: text, parse_mode: 'HTML', ...(keyboard ? { reply_markup: keyboard } : {}) };
    if (isVideo(m)) return bot.telegram.sendVideo(chatId, m, opts);
    if (isAnimation(m)) return bot.telegram.sendAnimation(chatId, m, opts);
    return bot.telegram.sendPhoto(chatId, m, opts);
  }

  if (!text) throw new Error('No content to send');
  return bot.telegram.sendMessage(chatId, text, {
    parse_mode: 'HTML',
    ...(keyboard ? { reply_markup: keyboard } : {})
  });
}

async function processJob(bot, jobId) {
  const r = await pool.query('SELECT * FROM broadcast_jobs WHERE id=$1', [jobId]);
  if (!r.rows[0]) return;
  const job = r.rows[0];
  const payload = job.payload;

  const targets = await resolveTargets(payload.target, payload.ids);
  await pool.query(
    'UPDATE broadcast_jobs SET total=$1, status=$2, updated_at=NOW() WHERE id=$3',
    [targets.length, 'running', jobId]
  );

  let sent = 0, failed = 0;
  for (const chatId of targets) {
    try {
      await sendToTarget(bot, chatId, payload);
      sent++;
    } catch (e) {
      failed++;
      if (e.response?.error_code === 403) {
        await pool.query('UPDATE users SET blocked=true WHERE telegram_id=$1', [chatId]).catch(() => {});
      }
    }
    if ((sent + failed) % 25 === 0) {
      await pool.query(
        'UPDATE broadcast_jobs SET sent=$1, failed=$2, updated_at=NOW() WHERE id=$3',
        [sent, failed, jobId]
      );
    }
    await new Promise(res => setTimeout(res, 50)); // ~20/sec
  }

  await pool.query(
    'UPDATE broadcast_jobs SET sent=$1, failed=$2, status=$3, updated_at=NOW() WHERE id=$4',
    [sent, failed, 'completed', jobId]
  );
}

async function startBroadcast(adminId, payload, bot) {
  const r = await pool.query(
    'INSERT INTO broadcast_jobs (created_by, payload, status) VALUES ($1,$2,$3) RETURNING *',
    [adminId, payload, 'pending']
  );
  const job = r.rows[0];
  processJob(bot, job.id).catch(e => console.error('Broadcast job error:', e));
  return job;
}

module.exports = { startBroadcast, processJob, resolveTargets, sendToTarget };
