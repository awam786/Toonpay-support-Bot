const { Telegraf, Markup } = require('telegraf');
const { pool } = require('./db');
const { LANGUAGES, LANGUAGE_ORDER, t, languageName, languageFlag, formatTemplate } = require('./i18n');

const bot = new Telegraf(process.env.BOT_TOKEN);

// ================= helpers =================
async function getSetting(key) {
  const r = await pool.query('SELECT value FROM settings WHERE key=$1', [key]);
  return r.rows[0]?.value;
}

async function getUser(userId) {
  const r = await pool.query('SELECT * FROM users WHERE telegram_id=$1', [userId]);
  return r.rows[0];
}

async function upsertUser(from) {
  await pool.query(
    `INSERT INTO users (telegram_id, username, first_name, last_name)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (telegram_id) DO UPDATE SET
       username=EXCLUDED.username, first_name=EXCLUDED.first_name,
       last_name=EXCLUDED.last_name, last_seen=NOW()`,
    [from.id, from.username, from.first_name, from.last_name]
  );
}

async function setLanguage(userId, lang) {
  await pool.query('UPDATE users SET language=$1 WHERE telegram_id=$2', [lang, userId]);
}

async function getUserLanguage(userId) {
  const u = await getUser(userId);
  return u?.language || null;
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

// ================= user state =================
async function getUserState(userId) {
  const r = await pool.query('SELECT * FROM user_states WHERE user_id=$1', [userId]);
  return r.rows[0];
}
async function setUserState(userId, state, payload) {
  await pool.query(
    `INSERT INTO user_states (user_id, state, payload, updated_at)
     VALUES ($1,$2,$3,NOW())
     ON CONFLICT (user_id) DO UPDATE SET state=EXCLUDED.state, payload=EXCLUDED.payload, updated_at=NOW()`,
    [userId, state, payload || {}]
  );
}
async function clearUserState(userId) {
  await pool.query('DELETE FROM user_states WHERE user_id=$1', [userId]);
}

// ================= language keyboard =================
function languageKeyboard(currentLang) {
  const rows = [];
  for (let i = 0; i < LANGUAGE_ORDER.length; i += 2) {
    const row = [];
    for (let j = 0; j < 2 && i + j < LANGUAGE_ORDER.length; j++) {
      const code = LANGUAGE_ORDER[i + j];
      const L = LANGUAGES[code];
      const label = `${L.flag} ${L.name}${code === currentLang ? ' ✓' : ''}`;
      row.push(Markup.button.callback(label, `lang:${code}`));
    }
    rows.push(row);
  }
  return Markup.inlineKeyboard(rows);
}

// ================= category keyboard =================
function categoryKeyboard(lang) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, 'cat_payment'), 'nt:cat:payment'),
     Markup.button.callback(t(lang, 'cat_withdrawal'), 'nt:cat:withdrawal')],
    [Markup.button.callback(t(lang, 'cat_kyc'), 'nt:cat:kyc'),
     Markup.button.callback(t(lang, 'cat_card'), 'nt:cat:card')],
    [Markup.button.callback(t(lang, 'cat_account'), 'nt:cat:account'),
     Markup.button.callback(t(lang, 'cat_other'), 'nt:cat:other')],
    [Markup.button.callback(t(lang, 'btn_change_lang'), 'lang:menu')],
  ]);
}

// ================= guide message =================
function guideKeyboard(lang) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, 'btn_create'), 'nt:start')],
    [Markup.button.callback(t(lang, 'btn_mytickets'), 'mt:show'),
     Markup.button.callback(t(lang, 'btn_guide'), 'guide:show')],
    [Markup.button.callback(t(lang, 'btn_change_lang'), 'lang:menu')],
  ]);
}

async function sendGuide(ctx, lang) {
  await ctx.reply(t(lang, 'guide'), {
    parse_mode: 'Markdown',
    ...guideKeyboard(lang)
  });
}

// ================= ticket helpers =================
async function sendToUser(ticketId, text, senderId, senderName) {
  const t_ = (await pool.query('SELECT * FROM tickets WHERE id=$1', [ticketId])).rows[0];
  if (!t_) throw new Error('Ticket not found');
  const lang = await getUserLanguage(t_.user_id) || 'en';
  const header = `📩 *Ticket #${t_.ticket_number}*`;
  const sent = await bot.telegram.sendMessage(t_.user_id, `${header}\n\n${text}`, { parse_mode: 'Markdown' });
  await pool.query(
    `INSERT INTO ticket_messages (ticket_id, direction, sender_id, sender_name, text, telegram_message_id, chat_id)
     VALUES ($1,'admin',$2,$3,$4,$5,$6)`,
    [ticketId, senderId, senderName, text, sent.message_id, t_.user_id]
  );
  await audit(ticketId, senderId, senderName, 'reply', null, null, text);
  return sent;
}

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

function cardText(t_) {
  return `🎫 *Ticket #${t_.ticket_number}*
Status: ${t_.status} | Priority: ${t_.priority}
User: ${t_.user_name || t_.user_id} (\`${t_.user_id}\`)
Category: ${t_.category || '—'}
Subject: ${t_.subject || '—'}
Assigned: ${t_.assigned_admin_name || 'Unassigned'}
${t_.transaction_id ? `Tx: \`${t_.transaction_id}\`\n` : ''}${t_.wallet_address ? `Wallet: \`${maskWallet(t_.wallet_address)}\`\n` : ''}Created: ${new Date(t_.created_at).toISOString().slice(0, 16).replace('T', ' ')}`;
}

async function postTicketToGroup(t_) {
  const groupId = await getSetting('admin_group_id');
  if (!groupId) { console.error('admin_group_id not set'); return; }
  try {
    const sent = await bot.telegram.sendMessage(groupId, cardText(t_), {
      parse_mode: 'Markdown',
      ...ticketCardKeyboard(t_.id)
    });
    await pool.query('UPDATE tickets SET group_chat_id=$1, card_message_id=$2 WHERE id=$3',
      [groupId, sent.message_id, t_.id]);
    await pool.query(
      `INSERT INTO message_mappings (ticket_id, chat_id, message_id, source)
       VALUES ($1,$2,$3,'card') ON CONFLICT DO NOTHING`,
      [t_.id, groupId, sent.message_id]
    );
  } catch (e) {
    console.error('postTicketToGroup failed:', e.message);
  }
}

// ================= /start =================
bot.start(async (ctx) => {
  await upsertUser(ctx.from);
  const u = await getUser(ctx.from.id);
  if (!u.language) {
    await ctx.reply(t('en', 'choose_lang'), { ...languageKeyboard(null) });
    return;
  }
  await sendGuide(ctx, u.language);
});

// ================= /language =================
bot.command('language', async (ctx) => {
  const u = await getUser(ctx.from.id);
  await ctx.reply(t(u?.language || 'en', 'choose_lang'), { ...languageKeyboard(u?.language) });
});

// ================= language selection callback =================
bot.action('lang:menu', async (ctx) => {
  await ctx.answerCbQuery();
  const u = await getUser(ctx.from.id);
  await ctx.reply(t(u?.language || 'en', 'choose_lang'), { ...languageKeyboard(u?.language) });
});

bot.action(/^lang:([a-z]{2})$/, async (ctx) => {
  const code = ctx.match[1];
  if (!LANGUAGES[code]) return ctx.answerCbQuery('Invalid language');
  await upsertUser(ctx.from);
  await setLanguage(ctx.from.id, code);
  await ctx.answerCbQuery(t(code, 'lang_set'));
  // Replace the language selection with the guide
  try { await ctx.deleteMessage(); } catch (_) {}
  await sendGuide(ctx, code);
});

// ================= /guide =================
bot.command('guide', async (ctx) => {
  const lang = (await getUserLanguage(ctx.from.id)) || 'en';
  await sendGuide(ctx, lang);
});

bot.action('guide:show', async (ctx) => {
  await ctx.answerCbQuery();
  const lang = (await getUserLanguage(ctx.from.id)) || 'en';
  await sendGuide(ctx, lang);
});

// ================= /cancel =================
bot.command('cancel', async (ctx) => {
  await clearUserState(ctx.from.id);
  await pool.query('DELETE FROM pending_replies WHERE admin_id=$1', [ctx.from.id]);
  await pool.query('DELETE FROM broadcast_sessions WHERE admin_id=$1', [ctx.from.id]);
  const lang = (await getUserLanguage(ctx.from.id)) || 'en';
  await ctx.reply(t(lang, 'cancelled'));
});

// ================= /newticket & button =================
bot.command('newticket', async (ctx) => {
  const lang = (await getUserLanguage(ctx.from.id)) || 'en';
  await ctx.reply(t(lang, 'newticket_choose_cat'), { ...categoryKeyboard(lang) });
});

bot.action('nt:start', async (ctx) => {
  await ctx.answerCbQuery();
  const lang = (await getUserLanguage(ctx.from.id)) || 'en';
  await ctx.reply(t(lang, 'newticket_choose_cat'), { ...categoryKeyboard(lang) });
});

bot.action(/^nt:cat:(\w+)$/, async (ctx) => {
  const category = ctx.match[1];
  const lang = (await getUserLanguage(ctx.from.id)) || 'en';
  await setUserState(ctx.from.id, 'awaiting_description', { category });
  await ctx.answerCbQuery();
  await ctx.reply(t(lang, 'newticket_describe'), {
    reply_markup: { force_reply: true, input_field_placeholder: '…' }
  });
});

// ================= /mytickets =================
bot.command('mytickets', async (ctx) => {
  const lang = (await getUserLanguage(ctx.from.id)) || 'en';
  await sendMyTickets(ctx, lang);
});

bot.action('mt:show', async (ctx) => {
  await ctx.answerCbQuery();
  const lang = (await getUserLanguage(ctx.from.id)) || 'en';
  await sendMyTickets(ctx, lang);
});

async function sendMyTickets(ctx, lang) {
  const r = await pool.query(
    'SELECT * FROM tickets WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20',
    [ctx.from.id]
  );
  if (r.rows.length === 0) return ctx.reply(t(lang, 'no_tickets'));
  const statuses = t(lang, 'statuses');
  let txt = t(lang, 'mytickets_header');
  for (const tk of r.rows) {
    const st = statuses[tk.status] || tk.status;
    txt += `\n• #${tk.ticket_number} — ${st} — ${tk.subject ? tk.subject.slice(0, 40) : ''}`;
  }
  txt += `\n\n/status <id>`;
  await ctx.reply(txt, { parse_mode: 'Markdown' });
}

// ================= /status =================
bot.command('status', async (ctx) => {
  const lang = (await getUserLanguage(ctx.from.id)) || 'en';
  const parts = ctx.message.text.split(' ');
  const num = parseInt(parts[1]);
  if (!num) return ctx.reply(t(lang, 'status_usage'));
  const r = await pool.query(
    'SELECT * FROM tickets WHERE ticket_number=$1 AND user_id=$2',
    [num, ctx.from.id]
  );
  if (r.rows.length === 0) return ctx.reply(t(lang, 'status_not_found'));
  const tk = r.rows[0];
  const statuses = t(lang, 'statuses');
  const priorities = t(lang, 'priorities');
  const body = formatTemplate(t(lang, 'status_result'), {
    number: tk.ticket_number,
    status: statuses[tk.status] || tk.status,
    priority: priorities[tk.priority] || tk.priority,
    date: new Date(tk.created_at).toISOString().slice(0, 16).replace('T', ' ')
  });
  await ctx.reply(body, { parse_mode: 'Markdown' });
});

// ================= /reply (user alias) =================
bot.command('reply', async (ctx) => {
  if (await isAdmin(ctx.from.id)) return handleAdminReplyCommand(ctx);
  // User reply: /reply <id> <message>
  const lang = (await getUserLanguage(ctx.from.id)) || 'en';
  const parts = ctx.message.text.split(' ');
  const num = parseInt(parts[1]);
  const text = parts.slice(2).join(' ');
  if (!num || !text) return ctx.reply(t(lang, 'reply_usage'));
  const r = await pool.query(
    'SELECT * FROM tickets WHERE ticket_number=$1 AND user_id=$2',
    [num, ctx.from.id]
  );
  if (r.rows.length === 0) return ctx.reply(t(lang, 'status_not_found'));
  const tk = r.rows[0];
  await addUserMessageToTicket(ctx, tk, text);
  await ctx.reply(formatTemplate(t(lang, 'msg_added'), { number: num }));
});

async function handleAdminReplyCommand(ctx) {
  const parts = ctx.message.text.split(' ');
  const num = parseInt(parts[1]);
  const text = parts.slice(2).join(' ');
  if (!num || !text) return ctx.reply('Usage: /reply <ticket#> <message>');
  const r = (await pool.query('SELECT * FROM tickets WHERE ticket_number=$1', [num])).rows[0];
  if (!r) return ctx.reply('Ticket not found');
  try {
    const name = await getAdminName(ctx.from.id);
    await sendToUser(r.id, text, ctx.from.id, name);
    await ctx.reply(`✅ Reply delivered for #${num}`);
  } catch (e) { await ctx.reply(`❌ ${e.message}`); }
}

// ================= admin /note, /ticket, /stats (unchanged) =================
bot.command('note', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.reply('Not authorized');
  const parts = ctx.message.text.split(' ');
  const num = parseInt(parts[1]);
  const text = parts.slice(2).join(' ');
  if (!num || !text) return ctx.reply('Usage: /note <ticket#> <note>');
  const tk = (await pool.query('SELECT * FROM tickets WHERE ticket_number=$1', [num])).rows[0];
  if (!tk) return ctx.reply('Ticket not found');
  const name = await getAdminName(ctx.from.id);
  await pool.query(
    `INSERT INTO ticket_messages (ticket_id, direction, sender_id, sender_name, text, chat_id)
     VALUES ($1,'internal',$2,$3,$4,$5)`,
    [tk.id, ctx.from.id, name, text, ctx.chat.id]
  );
  await audit(tk.id, ctx.from.id, name, 'internal_note', null, null, text);
  await ctx.reply(`📝 Internal note saved for #${num}`);
});

bot.command('ticket', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.reply('Not authorized');
  const num = parseInt(ctx.message.text.split(' ')[1]);
  const tk = (await pool.query('SELECT * FROM tickets WHERE ticket_number=$1', [num])).rows[0];
  if (!tk) return ctx.reply('Ticket not found');
  await ctx.reply(cardText(tk), { parse_mode: 'Markdown', ...ticketCardKeyboard(tk.id) });
});

bot.command('stats', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.reply('Not authorized');
  const r = await pool.query('SELECT status, COUNT(*)::int AS c FROM tickets GROUP BY status');
  const s = Object.fromEntries(r.rows.map(x => [x.status, x.c]));
  await ctx.reply(
    `📊 *Ticket Stats*\n\nOpen: ${s.open || 0}\nIn Progress: ${s.in_progress || 0}\nPending: ${s.pending || 0}\nResolved: ${s.resolved || 0}\nClosed: ${s.closed || 0}`,
    { parse_mode: 'Markdown' }
  );
});

// ================= admin card actions =================
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
    { reply_markup: { force_reply: true } }
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
  if (r.rows.length === 0) return ctx.answerCbQuery('Already claimed', { show_alert: true });
  await audit(ticketId, ctx.from.id, name, 'claim', null, name);
  await ctx.answerCbQuery('Claimed');
  try { await ctx.editMessageText(cardText(r.rows[0]), { parse_mode: 'Markdown', ...ticketCardKeyboard(ticketId) }); } catch (_) {}
});

bot.action(/^resolve:(\d+)$/, async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.answerCbQuery('Not authorized');
  const ticketId = parseInt(ctx.match[1]);
  const name = await getAdminName(ctx.from.id);
  const old = (await pool.query('SELECT status FROM tickets WHERE id=$1', [ticketId])).rows[0];
  await pool.query(`UPDATE tickets SET status='resolved', resolved_at=NOW(), updated_at=NOW() WHERE id=$1`, [ticketId]);
  await audit(ticketId, ctx.from.id, name, 'status_change', old?.status, 'resolved');
  await ctx.answerCbQuery('Resolved');
  const tk = (await pool.query('SELECT * FROM tickets WHERE id=$1', [ticketId])).rows[0];
  try { await ctx.editMessageText(cardText(tk), { parse_mode: 'Markdown', ...ticketCardKeyboard(ticketId) }); } catch (_) {}
  const lang = await getUserLanguage(tk.user_id) || 'en';
  try {
    await bot.telegram.sendMessage(tk.user_id,
      `✅ Ticket #${tk.ticket_number} — ${t(lang, 'statuses')['resolved']}`,
      { parse_mode: 'Markdown' });
  } catch (_) {}
});

bot.action(/^close:(\d+)$/, async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.answerCbQuery('Not authorized');
  const ticketId = parseInt(ctx.match[1]);
  const name = await getAdminName(ctx.from.id);
  await pool.query(`UPDATE tickets SET status='closed', updated_at=NOW() WHERE id=$1`, [ticketId]);
  await audit(ticketId, ctx.from.id, name, 'status_change', null, 'closed');
  await ctx.answerCbQuery('Closed');
  const tk = (await pool.query('SELECT * FROM tickets WHERE id=$1', [ticketId])).rows[0];
  try { await ctx.editMessageText(cardText(tk), { parse_mode: 'Markdown', ...ticketCardKeyboard(ticketId) }); } catch (_) {}
});

bot.action(/^note:(\d+)$/, async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.answerCbQuery('Not authorized');
  await ctx.answerCbQuery();
  await ctx.reply(
    `Send an internal note for #${ctx.match[1]} (user will NOT see it). Or /note ${ctx.match[1]} <text>.`,
    { reply_markup: { force_reply: true } }
  );
});

// ================= broadcast commands (unchanged) =================
const BS = { CONTENT: 'awaiting_content', BUTTONS: 'awaiting_buttons', AUDIENCE: 'awaiting_audience', IDS: 'awaiting_ids' };

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
    reply_markup: { inline_keyboard: [
      [{ text: '👥 All Users', callback_data: 'bc_target:all_users' }],
      [{ text: '👤 Specific Users', callback_data: 'bc_target:specific_users' }],
      [{ text: '👥 All Groups', callback_data: 'bc_target:all_groups' }],
      [{ text: '👤 Specific Groups', callback_data: 'bc_target:specific_groups' }]
    ]}
  });
}

bot.command('broadcast', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.reply('Not authorized');
  await setBroadcastSession(ctx.from.id, BS.CONTENT, {});
  await ctx.reply(
    `📢 Broadcast started.\n\nSend text, OR photo/video/GIF/document (caption becomes the message).\n\nSend /cancel to abort.`,
    { reply_markup: { force_reply: true } }
  );
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

// ================= generic message handler =================
bot.on('message', async (ctx, next) => {
  const chatType = ctx.chat.type;
  const u = ctx.from;

  if (chatType === 'private') await upsertUser(u);

  if (['group', 'supergroup', 'channel'].includes(chatType)) {
    await pool.query(
      `INSERT INTO groups (telegram_id, title, type, active) VALUES ($1,$2,$3,true)
       ON CONFLICT (telegram_id) DO UPDATE SET title=EXCLUDED.title, active=true`,
      [ctx.chat.id, ctx.chat.title, chatType]
    );
  }

  const userIsAdmin = await isAdmin(u.id);

  // 1) Admin broadcast session
  if (userIsAdmin) {
    const bs = await getBroadcastSession(u.id);
    if (bs) { await handleBroadcastMessage(ctx, bs); return; }

    // 2) Admin pending reply
    const pr = await pool.query('SELECT * FROM pending_replies WHERE admin_id=$1', [u.id]);
    if (pr.rows.length > 0) { await handleAdminReply(ctx, pr.rows[0]); return; }
  }

  // 3) Private chat user flow
  if (chatType === 'private') {
    if (userIsAdmin && !(ctx.message.text && !ctx.message.text.startsWith('/'))) return next();

    // 3a) awaiting description state
    const state = await getUserState(u.id);
    if (state && state.state === 'awaiting_description') {
      await createTicketFromDescription(ctx, state.payload.category || 'other');
      return;
    }

    // 3b) has an open ticket → append to it
    const open = await pool.query(
      `SELECT * FROM tickets WHERE user_id=$1 AND status IN ('open','in_progress','pending')
       ORDER BY created_at DESC LIMIT 1`,
      [u.id]
    );
    if (open.rows.length > 0) {
      const text = ctx.message.text || ctx.message.caption || '[attachment]';
      await addUserMessageToTicket(ctx, open.rows[0], text);
      const lang = (await getUserLanguage(u.id)) || 'en';
      await ctx.reply(formatTemplate(t(lang, 'msg_added'), { number: open.rows[0].ticket_number }));
      return;
    }

    // 3c) no open ticket → prompt to create one
    const lang = (await getUserLanguage(u.id)) || 'en';
    if (!lang) {
      await ctx.reply(t('en', 'choose_lang'), { ...languageKeyboard(null) });
      return;
    }
    await ctx.reply(t(lang, 'no_open_ticket'), { ...guideKeyboard(lang) });
    return;
  }

  // 4) Group message replying to ticket card — warn (no auto-send)
  if (['group', 'supergroup'].includes(chatType) && userIsAdmin && ctx.message.reply_to_message) {
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

// ================= create ticket from description =================
async function createTicketFromDescription(ctx, category) {
  const u = ctx.from;
  const lang = (await getUserLanguage(u.id)) || 'en';
  const text = ctx.message.text || ctx.message.caption || '[no text]';
  const r = await pool.query(
    `INSERT INTO tickets (user_id, user_name, category, subject, status, priority)
     VALUES ($1,$2,$3,$4,'open','normal') RETURNING *`,
    [u.id, u.username ? `@${u.username}` : u.first_name, category, text.slice(0, 80)]
  );
  const tk = r.rows[0];
  await pool.query(
    `INSERT INTO ticket_messages (ticket_id, direction, sender_id, sender_name, text, telegram_message_id, chat_id)
     VALUES ($1,'user',$2,$3,$4,$5,$6)`,
    [tk.id, u.id, u.first_name, text, ctx.message.message_id, u.id]
  );
  await clearUserState(u.id);
  await postTicketToGroup(tk);
  await ctx.reply(formatTemplate(t(lang, 'ticket_created'), { number: tk.ticket_number }),
    { parse_mode: 'Markdown' });
}

// ================= append user message to ticket =================
async function addUserMessageToTicket(ctx, ticket, text) {
  const u = ctx.from;
  await pool.query(
    `INSERT INTO ticket_messages (ticket_id, direction, sender_id, sender_name, text, telegram_message_id, chat_id)
     VALUES ($1,'user',$2,$3,$4,$5,$6)`,
    [ticket.id, u.id, u.first_name, text, ctx.message?.message_id, u.id]
  );
  const groupId = await getSetting('admin_group_id');
  if (groupId) {
    try {
      await bot.telegram.sendMessage(
        groupId,
        `💬 *New message on #${ticket.ticket_number}* from ${u.first_name}:\n\n${text}`,
        { parse_mode: 'Markdown', reply_to_message_id: ticket.card_message_id }
      );
    } catch (_) {}
  }
}

// ================= admin reply handler =================
async function handleAdminReply(ctx, pending) {
  const text = ctx.message.text || ctx.message.caption || '[media]';
  if (text.startsWith('/')) return;
  const name = await getAdminName(ctx.from.id);
  try {
    await sendToUser(pending.ticket_id, text, ctx.from.id, name);
    await pool.query('DELETE FROM pending_replies WHERE admin_id=$1', [ctx.from.id]);
    await ctx.reply('✅ Reply delivered to user.');
  } catch (e) { await ctx.reply(`❌ ${e.message}`); }
}

// ================= broadcast message handler =================
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
      `Content saved. Add inline buttons?\n\nFormat — one button per line:\n\`Label | https://url\`\n\nOr send /skip.`,
      { parse_mode: 'Markdown' }
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
    await setBroadcastSession(u.id, BS.AUDIENCE, { ...session.payload, inline_buttons: buttons });
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
    } else if (['left', 'kicked'].includes(status)) {
      await pool.query('UPDATE groups SET active=false WHERE telegram_id=$1', [chat.id]);
    }
  }
});

module.exports = { bot, sendToUser, getSetting, isAdmin, audit };
