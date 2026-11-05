const { Telegraf, Markup } = require('telegraf');
const { pool } = require('./db');

const bot = new Telegraf(process.env.BOT_TOKEN);

// -------- helpers --------
async function getSetting(key) {
  const r = await pool.query('SELECT value FROM settings WHERE key=$1', [key]);
  return r.rows[0]?.value;
}

async function isAdmin(userId) {
  const r = await pool.query('SELECT 1 FROM admins WHERE telegram_id=$1', [userId]);
  return r.rows.length > 0;
}

async function getAdminName(userId) {
  const r = await pool.query('SELECT name FROM admins WHERE telegram_id=$1', [userId]);
  return r.rows[0]?.name || `@${userId}`;
}

async function audit(ticketId, actorId, actorName, action, oldVal, newVal, details) {
  await pool.query(
    `INSERT INTO ticket_events (ticket_id, actor_id, actor_name, actor_type, action, old_value, new_value, details)
     VALUES ($1,$2,$3,'admin',$4,$5,$6,$7)`,
    [ticketId, actorId, actorName, action, oldVal || null, newVal || null, details || null]
  );
}

function maskWallet(w) {
  if (!w || w.length < 10) return w || '';
  return w.slice(0, 6) + '…' + w.slice(-4);
}

// -------- explicit reply to user --------
async function sendToUser(ticketId, text, senderId, senderName) {
  const t = (await pool.query('SELECT * FROM tickets WHERE id=$1', [ticketId])).rows[0];
  if (!t) throw new Error('Ticket not found');
  const sent = await bot.telegram.sendMessage(
    t.user_id,
    `📩 <b>Support · Ticket #${t.ticket_number}</b>\n\n${text}`,
    { parse_mode: 'HTML' }
  );
  await pool.query(
    `INSERT INTO ticket_messages (ticket_id, direction, sender_id, sender_name, text, telegram_message_id, chat_id)
     VALUES ($1,'admin',$2,$3,$4,$5,$6)`,
    [ticketId, senderId, senderName, text, sent.message_id, t.user_id]
  );
  await audit(ticketId, senderId, senderName, 'reply', null, null, text);
  return sent;
}

// -------- ticket card --------
function ticketCardKeyboard(ticketId) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('💬 Reply', `reply:${ticketId}`),
     Markup.button.callback('🙋 Claim', `claim:${ticketId}`)],
    [Markup.button.callback('📝 Note', `note:${ticketId}`),
     Markup.button.callback('⚡ Priority', `priority:${ticketId}`)],
    [Markup.button.callback('✅ Resolve', `resolve:${ticketId}`),
     Markup.button.callback('🔒 Close', `close:${ticketId}`)]
  ]);
}

function cardText(t) {
  return `🎫 <b>Ticket #${t.ticket_number}</b>
<b>Status:</b> ${t.status} | <b>Priority:</b> ${t.priority}
<b>User:</b> ${t.user_name || t.user_id} (<code>${t.user_id}</code>)
<b>Category:</b> ${t.category || '—'}
<b>Subject:</b> ${t.subject || '—'}
<b>Assigned:</b> ${t.assigned_admin_name || 'Unassigned'}
${t.transaction_id ? `<b>Tx:</b> <code>${t.transaction_id}</code>` : ''}
${t.wallet_address ? `<b>Wallet:</b> <code>${maskWallet(t.wallet_address)}</code>` : ''}
<b>Created:</b> ${new Date(t.created_at).toISOString().slice(0, 16).replace('T', ' ')}`;
}

async function postTicketToGroup(t) {
  const groupId = await getSetting('admin_group_id');
  if (!groupId) {
    console.error('admin_group_id not set — cannot post ticket');
    return;
  }
  try {
    const sent = await bot.telegram.sendMessage(groupId, cardText(t), {
      parse_mode: 'HTML',
      ...ticketCardKeyboard(t.id)
    });
    await pool.query(
      'UPDATE tickets SET group_chat_id=$1, card_message_id=$2 WHERE id=$3',
      [groupId, sent.message_id, t.id]
    );
    await pool.query(
      `INSERT INTO message_mappings (ticket_id, chat_id, message_id, source)
       VALUES ($1,$2,$3,'card') ON CONFLICT DO NOTHING`,
      [t.id, groupId, sent.message_id]
    );
  } catch (e) {
    console.error('postTicketToGroup failed:', e.message);
  }
}

// ============ commands ============
bot.start(async (ctx) => {
  const u = ctx.from;
  await pool.query(
    `INSERT INTO users (telegram_id, username, first_name, last_name)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (telegram_id) DO UPDATE SET
       username=EXCLUDED.username, first_name=EXCLUDED.first_name,
       last_name=EXCLUDED.last_name, last_seen=NOW()`,
    [u.id, u.username, u.first_name, u.last_name]
  );
  await ctx.reply(
    `👋 Welcome to <b>ToonPay Support</b>.\n\nDescribe your issue and I'll create a ticket for you. An agent will reply shortly.`,
    { parse_mode: 'HTML' }
  );
});

bot.command('reply', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.reply('Not authorized');
  const parts = ctx.message.text.split(' ');
  const num = parseInt(parts[1]);
  const text = parts.slice(2).join(' ');
  if (!num || !text) return ctx.reply('Usage: /reply <ticket#> <message>');
  const t = (await pool.query('SELECT * FROM tickets WHERE ticket_number=$1', [num])).rows[0];
  if (!t) return ctx.reply('Ticket not found');
  try {
    const name = await getAdminName(ctx.from.id);
    await sendToUser(t.id, text, ctx.from.id, name);
    await ctx.reply(`✅ Reply delivered for #${num}`);
  } catch (e) {
    await ctx.reply(`❌ Failed: ${e.message}`);
  }
});

bot.command('note', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.reply('Not authorized');
  const parts = ctx.message.text.split(' ');
  const num = parseInt(parts[1]);
  const text = parts.slice(2).join(' ');
  if (!num || !text) return ctx.reply('Usage: /note <ticket#> <internal note>');
  const t = (await pool.query('SELECT * FROM tickets WHERE ticket_number=$1', [num])).rows[0];
  if (!t) return ctx.reply('Ticket not found');
  const name = await getAdminName(ctx.from.id);
  await pool.query(
    `INSERT INTO ticket_messages (ticket_id, direction, sender_id, sender_name, text, chat_id)
     VALUES ($1,'internal',$2,$3,$4,$5)`,
    [t.id, ctx.from.id, name, text, ctx.chat.id]
  );
  await audit(t.id, ctx.from.id, name, 'internal_note', null, null, text);
  await ctx.reply(`📝 Internal note saved for #${num}`);
});

bot.command('ticket', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.reply('Not authorized');
  const num = parseInt(ctx.message.text.split(' ')[1]);
  if (!num) return ctx.reply('Usage: /ticket <ticket#>');
  const t = (await pool.query('SELECT * FROM tickets WHERE ticket_number=$1', [num])).rows[0];
  if (!t) return ctx.reply('Ticket not found');
  await ctx.reply(cardText(t), { parse_mode: 'HTML', ...ticketCardKeyboard(t.id) });
});

bot.command('stats', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.reply('Not authorized');
  const r = await pool.query(
    `SELECT status, COUNT(*)::int AS c FROM tickets GROUP BY status`
  );
  const s = Object.fromEntries(r.rows.map(x => [x.status, x.c]));
  await ctx.reply(
    `📊 <b>Ticket Stats</b>\n\nOpen: ${s.open || 0}\nIn Progress: ${s.in_progress || 0}\nPending: ${s.pending || 0}\nResolved: ${s.resolved || 0}\nClosed: ${s.closed || 0}`,
    { parse_mode: 'HTML' }
  );
});

// ---- interactive broadcast ----
const BS = {
  CONTENT: 'awaiting_content',
  BUTTONS: 'awaiting_buttons',
  AUDIENCE: 'awaiting_audience',
  IDS: 'awaiting_ids',
};

async function getBroadcastSession(adminId) {
  const r = await pool.query('SELECT * FROM broadcast_sessions WHERE admin_id=$1', [adminId]);
  return r.rows[0];
}

async function setBroadcastSession(adminId, stage, payload) {
  await pool.query(
    `INSERT INTO broadcast_sessions (admin_id, stage, payload, updated_at)
     VALUES ($1,$2,$3,NOW())
     ON CONFLICT (admin_id) DO UPDATE SET stage=EXCLUDED.stage, payload=EXCLUDED.payload, updated_at=NOW()`,
    [adminId, stage, payload || {}]
  );
}

async function clearBroadcastSession(adminId) {
  await pool.query('DELETE FROM broadcast_sessions WHERE admin_id=$1', [adminId]);
}

async function askAudience(ctx) {
  await ctx.reply('📢 Who should receive this broadcast?', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '👥 All Users', callback_data: 'bc_target:all_users' }],
        [{ text: '👤 Specific Users', callback_data: 'bc_target:specific_users' }],
        [{ text: '👥 All Groups', callback_data: 'bc_target:all_groups' }],
        [{ text: '👤 Specific Groups', callback_data: 'bc_target:specific_groups' }]
      ]
    }
  });
}

bot.command('broadcast', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.reply('Not authorized');
  await setBroadcastSession(ctx.from.id, BS.CONTENT, {});
  await ctx.reply(
    `📢 Broadcast started.\n\n` +
    `Send me:\n` +
    `• Text, OR\n` +
    `• Photo / video / GIF / document (caption becomes the message)\n\n` +
    `Send /cancel to abort.`,
    { reply_markup: { force_reply: true, input_field_placeholder: 'Broadcast content…' } }
  );
});

bot.command('cancel', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return;
  await clearBroadcastSession(ctx.from.id);
  await pool.query('DELETE FROM pending_replies WHERE admin_id=$1', [ctx.from.id]);
  await ctx.reply('Cancelled.');
});

bot.command('skip', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return;
  const s = await getBroadcastSession(ctx.from.id);
  if (!s) return ctx.reply('No active broadcast.');
  if (s.stage === BS.BUTTONS) {
    await setBroadcastSession(ctx.from.id, BS.AUDIENCE, { ...s.payload, inline_buttons: [] });
    await askAudience(ctx);
  }
});

bot.action(/^bc_target:(.+)$/, async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.answerCbQuery('Not authorized');
  const target = ctx.match[1];
  const s = await getBroadcastSession(ctx.from.id);
  if (!s) return ctx.answerCbQuery('No active broadcast');

  const payload = { ...s.payload, target };

  if (target === 'specific_users' || target === 'specific_groups') {
    await setBroadcastSession(ctx.from.id, BS.IDS, payload);
    await ctx.answerCbQuery();
    await ctx.editMessageText(`Send the IDs for ${target.replace('_', ' ')} (comma-separated):`);
    return;
  }

  const { startBroadcast } = require('./broadcast');
  const job = await startBroadcast(ctx.from.id, payload, bot);
  await clearBroadcastSession(ctx.from.id);
  await ctx.answerCbQuery('Starting…');
  await ctx.editMessageText(`🚀 Broadcast started. Job #${job.id}`);
});

// ============ callback actions ============
bot.action(/^reply:(\d+)$/, async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.answerCbQuery('Not authorized');
  const ticketId = parseInt(ctx.match[1]);
  await pool.query(
    `INSERT INTO pending_replies (admin_id, ticket_id, chat_id) VALUES ($1,$2,$3)
     ON CONFLICT (admin_id) DO UPDATE SET ticket_id=EXCLUDED.ticket_id, chat_id=EXCLUDED.chat_id, created_at=NOW()`,
    [ctx.from.id, ticketId, ctx.chat.id]
  );
  await ctx.answerCbQuery();
  await ctx.reply(
    `✍️ Send the reply for ticket #${ticketId} now (your next message will be delivered to the user).`,
    { reply_markup: { force_reply: true, input_field_placeholder: `Reply to #${ticketId}…` } }
  );
});

bot.action(/^claim:(\d+)$/, async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.answerCbQuery('Not authorized');
  const ticketId = parseInt(ctx.match[1]);
  const name = await getAdminName(ctx.from.id);
  const r = await pool.query(
    `UPDATE tickets SET assigned_admin_id=$1, assigned_admin_name=$2,
       status = CASE WHEN status='open' THEN 'in_progress' ELSE status END,
       updated_at=NOW()
     WHERE id=$3 AND (assigned_admin_id IS NULL OR assigned_admin_id=$1)
     RETURNING *`,
    [ctx.from.id, name, ticketId]
  );
  if (r.rows.length === 0) return ctx.answerCbQuery('Already claimed by another admin', { show_alert: true });
  await audit(ticketId, ctx.from.id, name, 'claim', null, name);
  await ctx.answerCbQuery('Claimed');
  try {
    await ctx.editMessageText(cardText(r.rows[0]), {
      parse_mode: 'HTML',
      ...ticketCardKeyboard(ticketId)
    });
  } catch (_) {}
});

bot.action(/^resolve:(\d+)$/, async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.answerCbQuery('Not authorized');
  const ticketId = parseInt(ctx.match[1]);
  const name = await getAdminName(ctx.from.id);
  const old = (await pool.query('SELECT status FROM tickets WHERE id=$1', [ticketId])).rows[0];
  await pool.query(
    `UPDATE tickets SET status='resolved', resolved_at=NOW(), updated_at=NOW() WHERE id=$1`,
    [ticketId]
  );
  await audit(ticketId, ctx.from.id, name, 'status_change', old?.status, 'resolved');
  await ctx.answerCbQuery('Resolved');
  const t = (await pool.query('SELECT * FROM tickets WHERE id=$1', [ticketId])).rows[0];
  try {
    await ctx.editMessageText(cardText(t), { parse_mode: 'HTML', ...ticketCardKeyboard(ticketId) });
  } catch (_) {}
  try {
    await bot.telegram.sendMessage(
      t.user_id,
      `✅ Your ticket <b>#${t.ticket_number}</b> has been marked as resolved.`,
      { parse_mode: 'HTML' }
    );
  } catch (_) {}
});

bot.action(/^close:(\d+)$/, async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.answerCbQuery('Not authorized');
  const ticketId = parseInt(ctx.match[1]);
  const name = await getAdminName(ctx.from.id);
  await pool.query(`UPDATE tickets SET status='closed', updated_at=NOW() WHERE id=$1`, [ticketId]);
  await audit(ticketId, ctx.from.id, name, 'status_change', null, 'closed');
  await ctx.answerCbQuery('Closed');
  const t = (await pool.query('SELECT * FROM tickets WHERE id=$1', [ticketId])).rows[0];
  try {
    await ctx.editMessageText(cardText(t), { parse_mode: 'HTML', ...ticketCardKeyboard(ticketId) });
  } catch (_) {}
});

bot.action(/^note:(\d+)$/, async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.answerCbQuery('Not authorized');
  const ticketId = parseInt(ctx.match[1]);
  await ctx.answerCbQuery();
  await ctx.reply(
    `Send an internal note for #${ticketId} (user will NOT see it). Or use /note ${ticketId} <text>.`,
    { reply_markup: { force_reply: true, input_field_placeholder: 'Internal note…' } }
  );
});

// ============ generic message handler ============
bot.on('message', async (ctx, next) => {
  const u = ctx.from;
  const chatType = ctx.chat.type;

  if (chatType === 'private') {
    await pool.query(
      `INSERT INTO users (telegram_id, username, first_name, last_name)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (telegram_id) DO UPDATE SET
         username=EXCLUDED.username, first_name=EXCLUDED.first_name,
         last_name=EXCLUDED.last_name, last_seen=NOW()`,
      [u.id, u.username, u.first_name, u.last_name]
    );
    const isA = (await pool.query('SELECT 1 FROM admins WHERE telegram_id=$1', [u.id])).rows.length > 0;
    if (isA && u.username) {
      await pool.query('UPDATE admins SET name=$1 WHERE telegram_id=$2', [`@${u.username}`, u.id]);
    }
  }

  if (['group', 'supergroup', 'channel'].includes(chatType)) {
    await pool.query(
      `INSERT INTO groups (telegram_id, title, type, active) VALUES ($1,$2,$3,true)
       ON CONFLICT (telegram_id) DO UPDATE SET title=EXCLUDED.title, active=true`,
      [ctx.chat.id, ctx.chat.title, chatType]
    );
  }

  const userIsAdmin = (await isAdmin(u.id));

  // 1) Admin broadcast session
  if (userIsAdmin) {
    const bs = await getBroadcastSession(u.id);
    if (bs) {
      await handleBroadcastMessage(ctx, bs);
      return;
    }
    // 2) Admin pending reply
    const pr = await pool.query('SELECT * FROM pending_replies WHERE admin_id=$1', [u.id]);
    if (pr.rows.length > 0) {
      await handleAdminReply(ctx, pr.rows[0]);
      return;
    }
  }

  // 3) Private chat as regular user → ticket creation
  if (chatType === 'private') {
    if (userIsAdmin) return next();
    await handleUserMessage(ctx);
    return;
  }

  // 4) Group message replying to ticket card — warn, don't auto-send
  if ((chatType === 'group' || chatType === 'supergroup') && userIsAdmin && ctx.message.reply_to_message) {
    const mapped = await pool.query(
      'SELECT ticket_id FROM message_mappings WHERE chat_id=$1 AND message_id=$2',
      [ctx.chat.id, ctx.message.reply_to_message.message_id]
    );
    if (mapped.rows.length > 0) {
      await ctx.reply(
        `⚠️ Plain messages are NOT sent to the user.\nUse the 💬 Reply button on the ticket card or /reply <ticket#> <message>.`,
        { reply_to_message_id: ctx.message.message_id }
      );
      return;
    }
  }

  return next();
});

// ---- user ticket handler ----
async function handleUserMessage(ctx) {
  const u = ctx.from;
  const text = ctx.message.text || ctx.message.caption || '[attachment]';
  const existing = await pool.query(
    `SELECT * FROM tickets WHERE user_id=$1 AND status IN ('open','in_progress','pending')
     ORDER BY created_at DESC LIMIT 1`,
    [u.id]
  );

  if (existing.rows.length === 0) {
    const r = await pool.query(
      `INSERT INTO tickets (user_id, user_name, category, subject, status, priority)
       VALUES ($1,$2,'general',$3,'open','normal') RETURNING *`,
      [u.id, u.username ? `@${u.username}` : u.first_name, text.slice(0, 80)]
    );
    const t = r.rows[0];
    await pool.query(
      `INSERT INTO ticket_messages (ticket_id, direction, sender_id, sender_name, text, telegram_message_id, chat_id)
       VALUES ($1,'user',$2,$3,$4,$5,$6)`,
      [t.id, u.id, u.first_name, text, ctx.message.message_id, u.id]
    );
    await postTicketToGroup(t);
    await ctx.reply(`🎫 Ticket <b>#${t.ticket_number}</b> created. An agent will reply soon.`,
      { parse_mode: 'HTML' });
  } else {
    const t = existing.rows[0];
    await pool.query(
      `INSERT INTO ticket_messages (ticket_id, direction, sender_id, sender_name, text, telegram_message_id, chat_id)
       VALUES ($1,'user',$2,$3,$4,$5,$6)`,
      [t.id, u.id, u.first_name, text, ctx.message.message_id, u.id]
    );
    const groupId = await getSetting('admin_group_id');
    if (groupId) {
      try {
        await bot.telegram.sendMessage(
          groupId,
          `💬 <b>New message on #${t.ticket_number}</b> from ${u.first_name}:\n\n${text}`,
          { parse_mode: 'HTML', reply_to_message_id: t.card_message_id }
        );
      } catch (_) {}
    }
  }
}

// ---- admin reply handler ----
async function handleAdminReply(ctx, pending) {
  const text = ctx.message.text || ctx.message.caption || '[media]';
  if (text.startsWith('/')) return; // let commands handle themselves
  const name = await getAdminName(ctx.from.id);
  try {
    await sendToUser(pending.ticket_id, text, ctx.from.id, name);
    await pool.query('DELETE FROM pending_replies WHERE admin_id=$1', [ctx.from.id]);
    await ctx.reply('✅ Reply delivered to user.');
  } catch (e) {
    await ctx.reply(`❌ Failed: ${e.message}`);
  }
}

// ---- broadcast stage handler ----
async function handleBroadcastMessage(ctx, session) {
  const u = ctx.from;
  const msg = ctx.message;

  if (session.stage === BS.CONTENT) {
    const payload = { ...session.payload };
    if (msg.text) payload.text = msg.text;
    else if (msg.photo) { payload.media = msg.photo[msg.photo.length - 1].file_id; payload.text = msg.caption || ''; }
    else if (msg.video) { payload.media = msg.video.file_id; payload.text = msg.caption || ''; }
    else if (msg.animation) { payload.media = msg.animation.file_id; payload.text = msg.caption || ''; }
    else if (msg.document) { payload.media = msg.document.file_id; payload.text = msg.caption || ''; }
    else return ctx.reply('Send text, photo, video, GIF or document.');

    await setBroadcastSession(u.id, BS.BUTTONS, payload);
    await ctx.reply(
      `Content saved. Add inline buttons?\n\n` +
      `Format — one button per line:\n<code>Label | https://url</code>\n\n` +
      `Or send /skip to continue without buttons.`,
      { parse_mode: 'HTML' }
    );
    return;
  }

  if (session.stage === BS.BUTTONS) {
    if (!msg.text) return ctx.reply('Send buttons as text, or /skip.');
    const buttons = msg.text.split('\n').map(line => {
      const [label, url] = line.split('|').map(s => s.trim());
      if (!label || !url) return null;
      return [{ text: label, url }];
    }).filter(Boolean);
    const payload = { ...session.payload, inline_buttons: buttons };
    await setBroadcastSession(u.id, BS.AUDIENCE, payload);
    await askAudience(ctx);
    return;
  }

  if (session.stage === BS.IDS) {
    if (!msg.text) return;
    const payload = { ...session.payload, ids: msg.text.trim() };
    const { startBroadcast } = require('./broadcast');
    const job = await startBroadcast(u.id, payload, bot);
    await clearBroadcastSession(u.id);
    await ctx.reply(`🚀 Broadcast started. Job #${job.id}`);
    return;
  }
}

// track group membership changes
bot.on('my_chat_member', async (ctx) => {
  const chat = ctx.chat;
  const status = ctx.myChatMember.new_chat_member.status;
  if (['group', 'supergroup', 'channel'].includes(chat.type)) {
    if (['member', 'administrator', 'creator'].includes(status)) {
      await pool.query(
        `INSERT INTO groups (telegram_id, title, type, active) VALUES ($1,$2,$3,true)
         ON CONFLICT (telegram_id) DO UPDATE SET title=EXCLUDED.title, active=true`,
        [chat.id, chat.title, chat.type]
      );
    } else if (status === 'left' || status === 'kicked') {
      await pool.query('UPDATE groups SET active=false WHERE telegram_id=$1', [chat.id]);
    }
  }
});

module.exports = { bot, sendToUser, getSetting, isAdmin, audit };
