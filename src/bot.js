const { Telegraf, Markup } = require('telegraf');
const { pool } = require('./db');
const { LANGUAGES, LANGUAGE_ORDER, t, formatTemplate } = require('./i18n');

const bot = new Telegraf(process.env.BOT_TOKEN);

// ================ helpers ================
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
  const r = await pool.query(
    'SELECT 1 FROM admins WHERE telegram_id=$1 AND active=true',
    [userId]
  );
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

// ★ Markdown safety — escape special chars so Telegram doesn't reject the message
function escapeMd(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/([_*`\[\]\\])/g, '\\$1');
}

function maskWallet(w) {
  if (!w || w.length < 10) return w || '';
  return w.slice(0, 6) + '…' + w.slice(-4);
}

function timeAgo(date) {
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

// ================ admin sync from group ================
async function upsertAdminFromTelegram(user, role = 'agent') {
  if (!user || user.is_bot) return;
  const name = user.username ? `@${user.username}` : user.first_name || String(user.id);
  await pool.query(
    `INSERT INTO admins (telegram_id, name, role, active, source)
     VALUES ($1,$2,$3,true,'group')
     ON CONFLICT (telegram_id) DO UPDATE SET
       name = EXCLUDED.name,
       active = true,
       source = CASE WHEN admins.source='owner' THEN 'owner' ELSE 'group' END`,
    [user.id, name, role]
  );
}

async function deactivateAdmin(telegramId) {
  await pool.query(
    `UPDATE admins SET active=false WHERE telegram_id=$1 AND source != 'owner'`,
    [telegramId]
  );
}

async function syncAdminsFromGroup() {
  const groupId = await getSetting('admin_group_id');
  if (!groupId) {
    console.warn('No admin_group_id — skipping group sync');
    return;
  }
  try {
    const members = await bot.telegram.getChatAdministrators(groupId);
    for (const m of members) {
      if (m.user.is_bot) continue;
      const role = m.status === 'creator' ? 'super_admin' : 'agent';
      await upsertAdminFromTelegram(m.user, role);
    }
    console.log(`Synced ${members.length} admin(s) from group ${groupId}`);
  } catch (e) {
    console.error('syncAdminsFromGroup failed:', e.message);
  }
}

// ================ user state ================
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

// ================ keyboards ================
function languageKeyboard(currentLang) {
  const rows = [];
  for (let i = 0; i < LANGUAGE_ORDER.length; i += 2) {
    const row = [];
    for (let j = 0; j < 2 && i + j < LANGUAGE_ORDER.length; j++) {
      const code = LANGUAGE_ORDER[i + j];
      const L = LANGUAGES[code];
      row.push(Markup.button.callback(
        `${L.flag} ${L.name}${code === currentLang ? ' ✓' : ''}`,
        `lang:${code}`
      ));
    }
    rows.push(row);
  }
  return Markup.inlineKeyboard(rows);
}

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

// ================ ticket card ================
function ticketCardKeyboard(ticketId) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('💬 Reply', `reply:${ticketId}`),
     Markup.button.callback('🙋 Claim', `claim:${ticketId}`)],
    [Markup.button.callback('📝 Note', `note:${ticketId}`),
     Markup.button.callback('⚡ Priority', `priority:${ticketId}`)],
    [Markup.button.callback('✅ Resolve', `resolve:${ticketId}`),
     Markup.button.callback('🚨 Escalate', `escalate:${ticketId}`)],
    [Markup.button.callback('🔒 Close', `close:${ticketId}`),
     Markup.button.callback('📜 Audit', `audit:${ticketId}`)]
  ]);
}

function priorityKeyboard(ticketId) {
  return Markup.inlineKeyboard([
    [Markup.button.callback('🟢 Low', `setpri:${ticketId}:low`),
     Markup.button.callback('⚪ Normal', `setpri:${ticketId}:normal`)],
    [Markup.button.callback('🟡 High', `setpri:${ticketId}:high`),
     Markup.button.callback('🔴 Urgent', `setpri:${ticketId}:urgent`)],
    [Markup.button.callback('« Cancel', `cancel_pri:${ticketId}`)]
  ]);
}

// ★ All user-supplied fields wrapped in escapeMd() — safe for Telegram Markdown
function cardText(t_) {
  return `🎫 *Ticket #${t_.ticket_number}*
Status: ${escapeMd(t_.status)} | Priority: ${escapeMd(t_.priority)}
User: ${escapeMd(t_.user_name || t_.user_id)} (\`${t_.user_id}\`)
Category: ${escapeMd(t_.category || '—')}
Subject: ${escapeMd(t_.subject || '—')}
Assigned: ${escapeMd(t_.assigned_admin_name || 'Unassigned')}
${t_.transaction_id ? `Tx: \`${t_.transaction_id}\`\n` : ''}${t_.wallet_address ? `Wallet: \`${maskWallet(t_.wallet_address)}\`\n` : ''}Created: ${new Date(t_.created_at).toISOString().slice(0, 16).replace('T', ' ')}`;
}

// ★ Plain-text version for fallback when Markdown parsing fails
function cardTextPlain(t_) {
  return `🎫 Ticket #${t_.ticket_number}
Status: ${t_.status} | Priority: ${t_.priority}
User: ${t_.user_name || t_.user_id} (${t_.user_id})
Category: ${t_.category || '—'}
Subject: ${t_.subject || '—'}
Assigned: ${t_.assigned_admin_name || 'Unassigned'}
${t_.transaction_id ? `Tx: ${t_.transaction_id}\n` : ''}${t_.wallet_address ? `Wallet: ${maskWallet(t_.wallet_address)}\n` : ''}Created: ${new Date(t_.created_at).toISOString().slice(0, 16).replace('T', ' ')}`;
}

// ★ Posts ticket to admin group WITH plain-text fallback on Markdown failure
async function postTicketToGroup(t_) {
  const groupId = await getSetting('admin_group_id');
  if (!groupId) {
    console.error(`❌ postTicketToGroup: admin_group_id is NOT set — ticket #${t_.ticket_number} not delivered`);
    return;
  }
  try {
    const sent = await bot.telegram.sendMessage(groupId, cardText(t_), {
      parse_mode: 'Markdown',
      ...ticketCardKeyboard(t_.id)
    });
    await pool.query(
      'UPDATE tickets SET group_chat_id=$1, card_message_id=$2 WHERE id=$3',
      [groupId, sent.message_id, t_.id]
    );
    await pool.query(
      `INSERT INTO message_mappings (ticket_id, chat_id, message_id, source)
       VALUES ($1,$2,$3,'card') ON CONFLICT DO NOTHING`,
      [t_.id, groupId, sent.message_id]
    );
    console.log(`✅ Ticket #${t_.ticket_number} posted to group ${groupId} (msg ${sent.message_id})`);
  } catch (e) {
    console.error(`❌ postTicketToGroup (markdown) failed for #${t_.ticket_number}: ${e.message}`);
    // ★ Fallback: retry as plain text (no parse_mode)
    try {
      const sent = await bot.telegram.sendMessage(groupId, cardTextPlain(t_), {
        ...ticketCardKeyboard(t_.id)
      });
      await pool.query(
        'UPDATE tickets SET group_chat_id=$1, card_message_id=$2 WHERE id=$3',
        [groupId, sent.message_id, t_.id]
      );
      await pool.query(
        `INSERT INTO message_mappings (ticket_id, chat_id, message_id, source)
         VALUES ($1,$2,$3,'card') ON CONFLICT DO NOTHING`,
        [t_.id, groupId, sent.message_id]
      );
      console.log(`✅ Ticket #${t_.ticket_number} posted to group ${groupId} (plain fallback)`);
    } catch (e2) {
      console.error(`❌ FALLBACK ALSO FAILED for #${t_.ticket_number}: ${e2.message}`);
    }
  }
}

async function refreshCard(ticketId) {
  const tk = (await pool.query('SELECT * FROM tickets WHERE id=$1', [ticketId])).rows[0];
  if (!tk || !tk.group_chat_id || !tk.card_message_id) return;
  try {
    await bot.telegram.editMessageText(
      tk.group_chat_id, tk.card_message_id, undefined,
      cardText(tk),
      { parse_mode: 'Markdown', ...ticketCardKeyboard(tk.id) }
    );
  } catch (_) {
    // Ignore "message not modified" and other edit errors — non-fatal
  }
}

// ================ send to user (admin reply) ================
// ★ escapeMd() applied so admin replies with special chars still deliver
async function sendToUser(ticketId, text, senderId, senderName) {
  const tk = (await pool.query('SELECT * FROM tickets WHERE id=$1', [ticketId])).rows[0];
  if (!tk) throw new Error('Ticket not found');

  let sent;
  try {
    sent = await bot.telegram.sendMessage(
      tk.user_id,
      `📩 *Ticket #${tk.ticket_number}*\n\n${escapeMd(text)}`,
      { parse_mode: 'Markdown' }
    );
  } catch (e) {
    // Fallback without Markdown
    console.error(`sendToUser markdown failed for #${tk.ticket_number}: ${e.message}`);
    sent = await bot.telegram.sendMessage(
      tk.user_id,
      `📩 Ticket #${tk.ticket_number}\n\n${text}`
    );
  }

  await pool.query(
    `INSERT INTO ticket_messages (ticket_id, direction, sender_id, sender_name, text, telegram_message_id, chat_id)
     VALUES ($1,'admin',$2,$3,$4,$5,$6)`,
    [ticketId, senderId, senderName, text, sent.message_id, tk.user_id]
  );
  await audit(ticketId, senderId, senderName, 'reply', null, null, text);
  return sent;
}

// ================= USER COMMANDS =================
bot.start(async (ctx) => {
  await upsertUser(ctx.from);
  const u = await getUser(ctx.from.id);
  if (!u.language) {
    await ctx.reply(t('en', 'choose_lang'), { ...languageKeyboard(null) });
    return;
  }
  await sendGuide(ctx, u.language);
});

bot.command('language', async (ctx) => {
  const u = await getUser(ctx.from.id);
  await ctx.reply(t(u?.language || 'en', 'choose_lang'), { ...languageKeyboard(u?.language) });
});

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
  try { await ctx.deleteMessage(); } catch (_) {}
  await sendGuide(ctx, code);
});

bot.command('guide', async (ctx) => {
  const lang = (await getUserLanguage(ctx.from.id)) || 'en';
  await sendGuide(ctx, lang);
});

bot.action('guide:show', async (ctx) => {
  await ctx.answerCbQuery();
  const lang = (await getUserLanguage(ctx.from.id)) || 'en';
  await sendGuide(ctx, lang);
});

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
    reply_markup: { force_reply: true }
  });
});

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
    txt += `\n• #${tk.ticket_number} — ${escapeMd(st)} — ${escapeMd(tk.subject ? tk.subject.slice(0, 40) : '')}`;
  }
  txt += `\n\n/status <id>`;
  await ctx.reply(txt, { parse_mode: 'Markdown' });
}

bot.command('status', async (ctx) => {
  const lang = (await getUserLanguage(ctx.from.id)) || 'en';
  const num = parseInt(ctx.message.text.split(' ')[1]);
  if (!num) return ctx.reply(t(lang, 'status_usage'));
  const r = await pool.query(
    'SELECT * FROM tickets WHERE ticket_number=$1 AND user_id=$2',
    [num, ctx.from.id]
  );
  if (r.rows.length === 0) return ctx.reply(t(lang, 'status_not_found'));
  const tk = r.rows[0];
  const body = formatTemplate(t(lang, 'status_result'), {
    number: tk.ticket_number,
    status: t(lang, 'statuses')[tk.status] || tk.status,
    priority: t(lang, 'priorities')[tk.priority] || tk.priority,
    date: new Date(tk.created_at).toISOString().slice(0, 16).replace('T', ' ')
  });
  await ctx.reply(escapeMd(body), { parse_mode: 'Markdown' });
});

// ================= ADMIN COMMANDS =================
bot.command('admin', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.reply('Not authorized');
  await ctx.reply(`👨‍💼 *Admin Commands*

*Ticket management*
/reply \`<#> <text>\` — reply to user
/note \`<#> <text>\` — internal note
/ticket \`<#>\` — show ticket card
/claim \`<#>\` — claim a ticket
/assign \`<#> <@user|id>\` — assign to admin
/priority \`<#> <low|normal|high|urgent>\`
/escalate \`<#>\` — mark urgent
/resolve \`<#>\` — mark resolved
/close \`<#>\` — close ticket

*Lists & search*
/open — open tickets (last 20)
/unassigned — unclaimed queue
/mine — my assigned tickets
/search \`<keyword>\` — search by user, wallet, tx, subject

*Reports*
/stats — overall counts
/stats_admin — per-admin performance
/audit — recent audit log
/audit \`<#>\` — audit trail for one ticket
/admins — list active admins

*Broadcast*
/broadcast — start broadcast flow
/skip — advance to next step
/cancel — cancel any pending action

📌 You can also use the buttons on any ticket card in this group.`,
    { parse_mode: 'Markdown' });
});

// ---- /reply (admin + user fallback) ----
bot.command('reply', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) {
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
    await addUserMessageToTicket(ctx, r.rows[0], text);
    return ctx.reply(formatTemplate(t(lang, 'msg_added'), { number: num }));
  }
  const parts = ctx.message.text.split(' ');
  const num = parseInt(parts[1]);
  const text = parts.slice(2).join(' ');
  if (!num || !text) return ctx.reply('Usage: /reply <ticket#> <message>');
  const tk = (await pool.query('SELECT * FROM tickets WHERE ticket_number=$1', [num])).rows[0];
  if (!tk) return ctx.reply('Ticket not found');
  try {
    const name = await getAdminName(ctx.from.id);
    await sendToUser(tk.id, text, ctx.from.id, name);
    await ctx.reply(`✅ Reply delivered for #${num}`);
  } catch (e) {
    await ctx.reply(`❌ Failed: ${escapeMd(e.message)}`, { parse_mode: 'Markdown' });
  }
});

// ---- /note ----
bot.command('note', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.reply('Not authorized');
  const parts = ctx.message.text.split(' ');
  const num = parseInt(parts[1]);
  const text = parts.slice(2).join(' ');
  if (!num || !text) return ctx.reply('Usage: /note <ticket#> <note>');
  const tk = (await pool.query('SELECT * FROM tickets WHERE ticket_number=$1', [num])).rows[0];
  if (!tk) return ctx.reply('Ticket not found');
  await saveInternalNote(tk.id, ctx.from.id, text);
  await ctx.reply(`📝 Internal note saved for #${num}`);
});

async function saveInternalNote(ticketId, adminId, text) {
  const name = await getAdminName(adminId);
  await pool.query(
    `INSERT INTO ticket_messages (ticket_id, direction, sender_id, sender_name, text, chat_id)
     VALUES ($1,'internal',$2,$3,$4,0)`,
    [ticketId, adminId, name, text]
  );
  await audit(ticketId, adminId, name, 'internal_note', null, null, text);
}

// ---- /ticket ----
bot.command('ticket', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.reply('Not authorized');
  const num = parseInt(ctx.message.text.split(' ')[1]);
  if (!num) return ctx.reply('Usage: /ticket <ticket#>');
  const tk = (await pool.query('SELECT * FROM tickets WHERE ticket_number=$1', [num])).rows[0];
  if (!tk) return ctx.reply('Ticket not found');
  try {
    await ctx.reply(cardText(tk), { parse_mode: 'Markdown', ...ticketCardKeyboard(tk.id) });
  } catch (_) {
    await ctx.reply(cardTextPlain(tk), { ...ticketCardKeyboard(tk.id) });
  }
});

// ---- /claim ----
bot.command('claim', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.reply('Not authorized');
  const num = parseInt(ctx.message.text.split(' ')[1]);
  if (!num) return ctx.reply('Usage: /claim <ticket#>');
  await doClaim(ctx, num, ctx.from.id);
});

async function doClaim(ctx, num, adminId) {
  const tk = (await pool.query('SELECT * FROM tickets WHERE ticket_number=$1', [num])).rows[0];
  if (!tk) return ctx.reply('Ticket not found');
  const name = await getAdminName(adminId);
  const r = await pool.query(
    `UPDATE tickets SET assigned_admin_id=$1, assigned_admin_name=$2,
       status = CASE WHEN status='open' THEN 'in_progress' ELSE status END,
       updated_at=NOW()
     WHERE id=$3 AND (assigned_admin_id IS NULL OR assigned_admin_id=$1)
     RETURNING *`,
    [adminId, name, tk.id]
  );
  if (r.rows.length === 0) return ctx.reply(`Already claimed by ${escapeMd(tk.assigned_admin_name || 'another admin')}`, { parse_mode: 'Markdown' });
  await audit(tk.id, adminId, name, 'claim', null, name);
  await refreshCard(tk.id);
  await ctx.reply(`✅ You claimed #${num}`);
}

// ---- /assign ----
bot.command('assign', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.reply('Not authorized');
  const parts = ctx.message.text.split(' ');
  const num = parseInt(parts[1]);
  const target = parts[2];
  if (!num || !target) return ctx.reply('Usage: /assign <ticket#> <@username|id>');
  const tk = (await pool.query('SELECT * FROM tickets WHERE ticket_number=$1', [num])).rows[0];
  if (!tk) return ctx.reply('Ticket not found');

  let adminRow;
  if (target.startsWith('@')) {
    adminRow = (await pool.query(
      `SELECT * FROM admins WHERE LOWER(name) = LOWER($1) AND active = true`,
      [target]
    )).rows[0];
  } else {
    adminRow = (await pool.query(
      'SELECT * FROM admins WHERE telegram_id=$1 AND active = true', [parseInt(target)]
    )).rows[0];
  }
  if (!adminRow) return ctx.reply('Admin not found. They must be in the admin group.');

  await pool.query(
    `UPDATE tickets SET assigned_admin_id=$1, assigned_admin_name=$2,
       status = CASE WHEN status='open' THEN 'in_progress' ELSE status END,
       updated_at=NOW() WHERE id=$3`,
    [adminRow.telegram_id, adminRow.name, tk.id]
  );
  const name = await getAdminName(ctx.from.id);
  await audit(tk.id, ctx.from.id, name, 'assign', tk.assigned_admin_name, adminRow.name);
  await refreshCard(tk.id);
  await ctx.reply(`✅ #${num} assigned to ${escapeMd(adminRow.name)}`, { parse_mode: 'Markdown' });
  try {
    await bot.telegram.sendMessage(adminRow.telegram_id,
      `📋 You have been assigned ticket #${num}. View: /ticket ${num}`);
  } catch (_) {}
});

// ---- /priority ----
bot.command('priority', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.reply('Not authorized');
  const parts = ctx.message.text.split(' ');
  const num = parseInt(parts[1]);
  const pri = (parts[2] || '').toLowerCase();
  if (!num || !['low', 'normal', 'high', 'urgent'].includes(pri)) {
    return ctx.reply('Usage: /priority <ticket#> <low|normal|high|urgent>');
  }
  const tk = (await pool.query('SELECT * FROM tickets WHERE ticket_number=$1', [num])).rows[0];
  if (!tk) return ctx.reply('Ticket not found');
  await pool.query('UPDATE tickets SET priority=$1, updated_at=NOW() WHERE id=$2', [pri, tk.id]);
  const name = await getAdminName(ctx.from.id);
  await audit(tk.id, ctx.from.id, name, 'priority_change', tk.priority, pri);
  await refreshCard(tk.id);
  await ctx.reply(`✅ #${num} priority → ${pri}`);
});

// ---- /escalate ----
bot.command('escalate', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.reply('Not authorized');
  const num = parseInt(ctx.message.text.split(' ')[1]);
  if (!num) return ctx.reply('Usage: /escalate <ticket#>');
  const tk = (await pool.query('SELECT * FROM tickets WHERE ticket_number=$1', [num])).rows[0];
  if (!tk) return ctx.reply('Ticket not found');
  await pool.query(`UPDATE tickets SET priority='urgent', updated_at=NOW() WHERE id=$1`, [tk.id]);
  const name = await getAdminName(ctx.from.id);
  await audit(tk.id, ctx.from.id, name, 'escalate');
  await refreshCard(tk.id);
  await ctx.reply(`🚨 #${num} escalated to urgent`);
});

// ---- /resolve ----
bot.command('resolve', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.reply('Not authorized');
  const num = parseInt(ctx.message.text.split(' ')[1]);
  if (!num) return ctx.reply('Usage: /resolve <ticket#>');
  const tk = (await pool.query('SELECT * FROM tickets WHERE ticket_number=$1', [num])).rows[0];
  if (!tk) return ctx.reply('Ticket not found');
  await pool.query(
    `UPDATE tickets SET status='resolved', resolved_at=NOW(), updated_at=NOW() WHERE id=$1`,
    [tk.id]
  );
  const name = await getAdminName(ctx.from.id);
  await audit(tk.id, ctx.from.id, name, 'status_change', tk.status, 'resolved');
  await refreshCard(tk.id);
  await ctx.reply(`✅ #${num} resolved`);
  try {
    const lang = (await getUserLanguage(tk.user_id)) || 'en';
    await bot.telegram.sendMessage(tk.user_id,
      `✅ ${t(lang, 'statuses')['resolved']} — *#${tk.ticket_number}*`,
      { parse_mode: 'Markdown' });
  } catch (_) {}
});

// ---- /close ----
bot.command('close', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.reply('Not authorized');
  const num = parseInt(ctx.message.text.split(' ')[1]);
  if (!num) return ctx.reply('Usage: /close <ticket#>');
  const tk = (await pool.query('SELECT * FROM tickets WHERE ticket_number=$1', [num])).rows[0];
  if (!tk) return ctx.reply('Ticket not found');
  await pool.query(`UPDATE tickets SET status='closed', updated_at=NOW() WHERE id=$1`, [tk.id]);
  const name = await getAdminName(ctx.from.id);
  await audit(tk.id, ctx.from.id, name, 'status_change', tk.status, 'closed');
  await refreshCard(tk.id);
  await ctx.reply(`🔒 #${num} closed`);
});

// ---- /open ----
bot.command('open', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.reply('Not authorized');
  const r = await pool.query(`
    SELECT ticket_number, user_name, category, priority, status, created_at
    FROM tickets WHERE status IN ('open','in_progress','pending')
    ORDER BY CASE WHEN priority='urgent' THEN 1
                  WHEN priority='high' THEN 2
                  WHEN priority='normal' THEN 3 ELSE 4 END,
             created_at ASC
    LIMIT 20
  `);
  if (r.rows.length === 0) return ctx.reply('✅ No open tickets.');
  let txt = `📂 *Open Tickets (${r.rows.length})*\n\n`;
  for (const t_ of r.rows) {
    const p = t_.priority === 'urgent' ? '🔴' :
              t_.priority === 'high' ? '🟡' : '⚪';
    txt += `${p} #${t_.ticket_number} · ${escapeMd(t_.user_name || '—')} · ${escapeMd(t_.category || 'other')} · ${timeAgo(t_.created_at)}\n`;
  }
  txt += `\nTap a ticket number with /ticket <#> to open.`;
  await ctx.reply(txt, { parse_mode: 'Markdown' });
});

// ---- /unassigned ----
bot.command('unassigned', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.reply('Not authorized');
  const r = await pool.query(`
    SELECT ticket_number, user_name, category, priority, created_at
    FROM tickets WHERE assigned_admin_id IS NULL
      AND status IN ('open','in_progress','pending')
    ORDER BY created_at ASC LIMIT 20
  `);
  if (r.rows.length === 0) return ctx.reply('✅ No unassigned tickets.');
  let txt = `🆓 *Unassigned Tickets (${r.rows.length})*\n\n`;
  for (const t_ of r.rows) {
    txt += `#${t_.ticket_number} · ${escapeMd(t_.user_name || '—')} · ${escapeMd(t_.category || 'other')} · ${timeAgo(t_.created_at)}\n`;
  }
  txt += `\nClaim with /claim <#>`;
  await ctx.reply(txt, { parse_mode: 'Markdown' });
});

// ---- /mine ----
bot.command('mine', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.reply('Not authorized');
  const r = await pool.query(`
    SELECT ticket_number, user_name, category, priority, status, created_at
    FROM tickets WHERE assigned_admin_id = $1
      AND status IN ('open','in_progress','pending')
    ORDER BY created_at ASC LIMIT 20
  `, [ctx.from.id]);
  if (r.rows.length === 0) return ctx.reply('✅ You have no open assigned tickets.');
  let txt = `🙋 *Your Assigned Tickets (${r.rows.length})*\n\n`;
  for (const t_ of r.rows) {
    txt += `#${t_.ticket_number} · ${escapeMd(t_.user_name || '—')} · ${escapeMd(t_.status)} · ${timeAgo(t_.created_at)}\n`;
  }
  await ctx.reply(txt, { parse_mode: 'Markdown' });
});

// ---- /search ----
bot.command('search', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.reply('Not authorized');
  const q = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!q) return ctx.reply('Usage: /search <keyword>');
  const like = `%${q}%`;
  const r = await pool.query(`
    SELECT ticket_number, user_name, category, status, priority, created_at
    FROM tickets
    WHERE CAST(ticket_number AS TEXT) = $1
       OR user_name ILIKE $2
       OR transaction_id ILIKE $2
       OR wallet_address ILIKE $2
       OR subject ILIKE $2
    ORDER BY created_at DESC LIMIT 20
  `, [q, like]);
  if (r.rows.length === 0) return ctx.reply(`No tickets match "${escapeMd(q)}".`, { parse_mode: 'Markdown' });
  let txt = `🔍 *Found ${r.rows.length} ticket(s) for "${escapeMd(q)}":*\n\n`;
  for (const t_ of r.rows) {
    txt += `#${t_.ticket_number} · ${escapeMd(t_.user_name || '—')} · ${escapeMd(t_.status)} · ${escapeMd(t_.priority)}\n`;
  }
  txt += `\nOpen with /ticket <#>`;
  await ctx.reply(txt, { parse_mode: 'Markdown' });
});

// ---- /stats ----
bot.command('stats', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.reply('Not authorized');
  const r = await pool.query('SELECT status, COUNT(*)::int AS c FROM tickets GROUP BY status');
  const s = Object.fromEntries(r.rows.map(x => [x.status, x.c]));
  const overdue = (await pool.query(
    `SELECT COUNT(*)::int AS c FROM tickets
     WHERE sla_due_at < NOW() AND status NOT IN ('resolved','closed')`
  )).rows[0].c;
  const unclaimed = (await pool.query(
    `SELECT COUNT(*)::int AS c FROM tickets WHERE assigned_admin_id IS NULL
     AND status IN ('open','in_progress','pending')`
  )).rows[0].c;
  await ctx.reply(
    `📊 *Ticket Stats*\n\n` +
    `Total open: ${(s.open || 0) + (s.in_progress || 0) + (s.pending || 0)}\n` +
    `  • Open: ${s.open || 0}\n` +
    `  • In Progress: ${s.in_progress || 0}\n` +
    `  • Pending: ${s.pending || 0}\n\n` +
    `Unclaimed: ${unclaimed}\n` +
    `Overdue SLA: ${overdue}\n\n` +
    `Resolved: ${s.resolved || 0}\n` +
    `Closed: ${s.closed || 0}`,
    { parse_mode: 'Markdown' }
  );
});

// ---- /stats_admin ----
bot.command('stats_admin', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.reply('Not authorized');
  const r = await pool.query(`
    SELECT a.name, a.telegram_id, a.role,
           COUNT(t.id) FILTER (WHERE t.assigned_admin_id = a.telegram_id)::int AS claimed,
           COUNT(t.id) FILTER (WHERE t.assigned_admin_id = a.telegram_id AND t.status IN ('resolved','closed'))::int AS solved,
           COUNT(t.id) FILTER (WHERE t.assigned_admin_id = a.telegram_id AND t.status = 'in_progress')::int AS in_progress,
           ROUND(AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at))/3600)
             FILTER (WHERE t.resolved_at IS NOT NULL AND t.assigned_admin_id = a.telegram_id)::numeric, 1) AS avg_hours
    FROM admins a
    LEFT JOIN tickets t ON t.assigned_admin_id = a.telegram_id
    WHERE a.active = true
    GROUP BY a.telegram_id, a.name, a.role
    ORDER BY solved DESC, claimed DESC
  `);
  if (r.rows.length === 0) return ctx.reply('No active admins.');
  let txt = `👥 *Admin Performance*\n\n`;
  for (const row of r.rows) {
    txt += `*${escapeMd(row.name || row.telegram_id)}*${row.role === 'super_admin' ? ' 👑' : ''}\n`;
    txt += `  Claimed: ${row.claimed} · Solved: ${row.solved} · In Progress: ${row.in_progress}`;
    if (row.avg_hours) txt += ` · Avg: ${row.avg_hours}h`;
    txt += `\n\n`;
  }
  await ctx.reply(txt, { parse_mode: 'Markdown' });
});

// ---- /audit ----
bot.command('audit', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.reply('Not authorized');
  const num = parseInt(ctx.message.text.split(' ')[1]);
  if (num) {
    const tk = (await pool.query('SELECT * FROM tickets WHERE ticket_number=$1', [num])).rows[0];
    if (!tk) return ctx.reply('Ticket not found');
    const r = await pool.query(
      `SELECT * FROM ticket_events WHERE ticket_id=$1 ORDER BY timestamp DESC LIMIT 30`,
      [tk.id]
    );
    if (r.rows.length === 0) return ctx.reply('No events.');
    let txt = `📜 *Audit for #${num}*\n\n`;
    for (const e of r.rows) {
      txt += `${new Date(e.timestamp).toISOString().slice(0, 16).replace('T', ' ')} · ${escapeMd(e.actor_name || '—')} · ${escapeMd(e.action)}`;
      if (e.old_value || e.new_value) txt += ` (${escapeMd(e.old_value || '—')} → ${escapeMd(e.new_value || '—')})`;
      txt += `\n`;
    }
    return ctx.reply(txt, { parse_mode: 'Markdown' });
  }
  const r = await pool.query(`
    SELECT e.*, t.ticket_number FROM ticket_events e
    LEFT JOIN tickets t ON t.id = e.ticket_id
    ORDER BY e.timestamp DESC LIMIT 30
  `);
  if (r.rows.length === 0) return ctx.reply('No events.');
  let txt = `📜 *Recent Activity*\n\n`;
  for (const e of r.rows) {
    txt += `${new Date(e.timestamp).toISOString().slice(0, 16).replace('T', ' ')} · ${escapeMd(e.actor_name || '—')} · ${escapeMd(e.action)}`;
    if (e.ticket_number) txt += ` · #${e.ticket_number}`;
    txt += `\n`;
  }
  await ctx.reply(txt, { parse_mode: 'Markdown' });
});

// ---- /admins ----
bot.command('admins', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.reply('Not authorized');
  const r = await pool.query(
    'SELECT name, telegram_id, role, source FROM admins WHERE active=true ORDER BY source DESC, name'
  );
  if (r.rows.length === 0) return ctx.reply('No active admins.');
  let txt = `👥 *Active Admins (${r.rows.length})*\n\n`;
  for (const a of r.rows) {
    txt += `• ${escapeMd(a.name || a.telegram_id)}`;
    if (a.role === 'super_admin') txt += ' 👑';
    if (a.source === 'owner') txt += ' (owner)';
    txt += `\n`;
  }
  await ctx.reply(txt, { parse_mode: 'Markdown' });
});

// ---- /cancel ----
bot.command('cancel', async (ctx) => {
  await clearUserState(ctx.from.id);
  await pool.query('DELETE FROM pending_replies WHERE admin_id=$1', [ctx.from.id]);
  await pool.query('DELETE FROM pending_notes WHERE admin_id=$1', [ctx.from.id]);
  await pool.query('DELETE FROM broadcast_sessions WHERE admin_id=$1', [ctx.from.id]);
  const lang = (await getUserLanguage(ctx.from.id)) || 'en';
  await ctx.reply(t(lang, 'cancelled'));
});

// ================= CARD CALLBACK ACTIONS =================
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
    `✍️ Send your reply for this ticket now. Your next message will be delivered to the user.`,
    { reply_markup: { force_reply: true } }
  );
});

bot.action(/^note:(\d+)$/, async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.answerCbQuery('Not authorized');
  const ticketId = parseInt(ctx.match[1]);
  await pool.query(
    `INSERT INTO pending_notes (admin_id, ticket_id, chat_id) VALUES ($1,$2,$3)
     ON CONFLICT (admin_id) DO UPDATE SET ticket_id=EXCLUDED.ticket_id, chat_id=EXCLUDED.chat_id, created_at=NOW()`,
    [ctx.from.id, ticketId, ctx.chat.id]
  );
  await ctx.answerCbQuery();
  await ctx.reply(
    `📝 Send the internal note now. The user will NOT see this.`,
    { reply_markup: { force_reply: true } }
  );
});

bot.action(/^claim:(\d+)$/, async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.answerCbQuery('Not authorized');
  const ticketId = parseInt(ctx.match[1]);
  const tk = (await pool.query('SELECT * FROM tickets WHERE id=$1', [ticketId])).rows[0];
  if (!tk) return ctx.answerCbQuery('Ticket not found');
  await doClaim(ctx, tk.ticket_number, ctx.from.id);
});

bot.action(/^resolve:(\d+)$/, async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.answerCbQuery('Not authorized');
  const ticketId = parseInt(ctx.match[1]);
  const tk = (await pool.query('SELECT * FROM tickets WHERE id=$1', [ticketId])).rows[0];
  if (!tk) return ctx.answerCbQuery('Ticket not found');
  await pool.query(
    `UPDATE tickets SET status='resolved', resolved_at=NOW(), updated_at=NOW() WHERE id=$1`,
    [ticketId]
  );
  const name = await getAdminName(ctx.from.id);
  await audit(ticketId, ctx.from.id, name, 'status_change', tk.status, 'resolved');
  await refreshCard(ticketId);
  await ctx.answerCbQuery('Resolved');
  try {
    const lang = (await getUserLanguage(tk.user_id)) || 'en';
    await bot.telegram.sendMessage(tk.user_id,
      `✅ ${t(lang, 'statuses')['resolved']} — *#${tk.ticket_number}*`,
      { parse_mode: 'Markdown' });
  } catch (_) {}
});

bot.action(/^close:(\d+)$/, async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.answerCbQuery('Not authorized');
  const ticketId = parseInt(ctx.match[1]);
  const tk = (await pool.query('SELECT * FROM tickets WHERE id=$1', [ticketId])).rows[0];
  if (!tk) return ctx.answerCbQuery('Ticket not found');
  await pool.query(`UPDATE tickets SET status='closed', updated_at=NOW() WHERE id=$1`, [ticketId]);
  const name = await getAdminName(ctx.from.id);
  await audit(ticketId, ctx.from.id, name, 'status_change', tk.status, 'closed');
  await refreshCard(ticketId);
  await ctx.answerCbQuery('Closed');
});

bot.action(/^escalate:(\d+)$/, async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.answerCbQuery('Not authorized');
  const ticketId = parseInt(ctx.match[1]);
  await pool.query(`UPDATE tickets SET priority='urgent', updated_at=NOW() WHERE id=$1`, [ticketId]);
  const name = await getAdminName(ctx.from.id);
  await audit(ticketId, ctx.from.id, name, 'escalate');
  await refreshCard(ticketId);
  await ctx.answerCbQuery('Escalated to urgent');
});

bot.action(/^priority:(\d+)$/, async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.answerCbQuery('Not authorized');
  const ticketId = parseInt(ctx.match[1]);
  await ctx.answerCbQuery();
  await ctx.reply(`Select new priority for ticket:`, { ...priorityKeyboard(ticketId) });
});

bot.action(/^setpri:(\d+):(\w+)$/, async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.answerCbQuery('Not authorized');
  const ticketId = parseInt(ctx.match[1]);
  const pri = ctx.match[2];
  if (!['low', 'normal', 'high', 'urgent'].includes(pri)) return ctx.answerCbQuery('Invalid');
  const tk = (await pool.query('SELECT * FROM tickets WHERE id=$1', [ticketId])).rows[0];
  await pool.query('UPDATE tickets SET priority=$1, updated_at=NOW() WHERE id=$2', [pri, ticketId]);
  const name = await getAdminName(ctx.from.id);
  await audit(ticketId, ctx.from.id, name, 'priority_change', tk.priority, pri);
  await refreshCard(ticketId);
  await ctx.answerCbQuery(`Priority → ${pri}`);
});

bot.action(/^audit:(\d+)$/, async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return ctx.answerCbQuery('Not authorized');
  const ticketId = parseInt(ctx.match[1]);
  const r = await pool.query(
    `SELECT * FROM ticket_events WHERE ticket_id=$1 ORDER BY timestamp DESC LIMIT 15`,
    [ticketId]
  );
  await ctx.answerCbQuery();
  if (r.rows.length === 0) return ctx.reply('No events for this ticket.');
  let txt = `📜 *Audit trail*\n\n`;
  for (const e of r.rows) {
    txt += `${new Date(e.timestamp).toISOString().slice(0, 16).replace('T', ' ')} · ${escapeMd(e.actor_name || '—')} · ${escapeMd(e.action)}\n`;
  }
  await ctx.reply(txt, { parse_mode: 'Markdown' });
});

bot.action(/^cancel_pri:(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery('Cancelled');
  try { await ctx.deleteMessage(); } catch (_) {}
});

// ================= BROADCAST =================
const BS = {
  CONTENT: 'awaiting_content',
  BUTTONS: 'awaiting_buttons',
  AUDIENCE: 'awaiting_audience',
  IDS: 'awaiting_ids'
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
    `📢 *Broadcast started*\n\n` +
    `Send me:\n` +
    `• Text, OR\n` +
    `• Photo / video / GIF / document (caption becomes the message)\n\n` +
    `For multiple photos, send them as an album, then send /skip when done.\n\n` +
    `/cancel to abort.`,
    { parse_mode: 'Markdown', reply_markup: { force_reply: true } }
  );
});

bot.command('skip', async (ctx) => {
  if (!(await isAdmin(ctx.from.id))) return;
  const s = await getBroadcastSession(ctx.from.id);
  if (!s) return ctx.reply('No active broadcast.');
  if (s.stage === BS.CONTENT) {
    // ★ Finish album/content stage, advance to buttons
    await setBroadcastSession(ctx.from.id, BS.BUTTONS, s.payload);
    await ctx.reply(
      `Content saved. Add inline buttons?\n\n` +
      `Format — one button per line:\n\`Label | https://url\`\n\n` +
      `Or send /skip to continue without buttons.`,
      { parse_mode: 'Markdown' }
    );
  } else if (s.stage === BS.BUTTONS) {
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

// ================= GENERIC MESSAGE HANDLER =================
bot.on('message', async (ctx, next) => {
  const chatType = ctx.chat.type;
  const u = ctx.from;

  if (chatType === 'private') await upsertUser(u);

  // Track groups
  if (['group', 'supergroup', 'channel'].includes(chatType)) {
    await pool.query(
      `INSERT INTO groups (telegram_id, title, type, active) VALUES ($1,$2,$3,true)
       ON CONFLICT (telegram_id) DO UPDATE SET title=EXCLUDED.title, active=true`,
      [ctx.chat.id, ctx.chat.title, chatType]
    );
  }

  const userIsAdmin = await isAdmin(u.id);

  // Auto-register admins writing in the admin group
  if (['group', 'supergroup'].includes(chatType) && u && !u.is_bot) {
    const gid = await getSetting('admin_group_id');
    if (String(ctx.chat.id) === String(gid)) {
      await upsertAdminFromTelegram(u, 'agent');
    }
  }

  // 1) Admin broadcast session
  if (userIsAdmin) {
    const bs = await getBroadcastSession(u.id);
    if (bs) { await handleBroadcastMessage(ctx, bs); return; }
  }

  // 2) Admin pending reply / note
  if (userIsAdmin) {
    const pr = await pool.query('SELECT * FROM pending_replies WHERE admin_id=$1', [u.id]);
    if (pr.rows.length > 0) { await handleAdminReply(ctx, pr.rows[0]); return; }

    const pn = await pool.query('SELECT * FROM pending_notes WHERE admin_id=$1', [u.id]);
    if (pn.rows.length > 0) { await handleAdminNote(ctx, pn.rows[0]); return; }
  }

  // 3) PRIVATE CHAT USER FLOW
  //    ★ FIX: state check runs BEFORE admin check, so admins testing
  //      the ticket-creation flow are not silently dropped.
  if (chatType === 'private') {
    const state = await getUserState(u.id);
    if (state && state.state === 'awaiting_description') {
      await createTicketFromDescription(ctx, state.payload.category || 'other');
      return;
    }

    const open = await pool.query(
      `SELECT * FROM tickets WHERE user_id=$1 AND status IN ('open','in_progress','pending')
       ORDER BY created_at DESC LIMIT 1`,
      [u.id]
    );

    // Admin with no pending state and no open ticket → ignore (they're acting as admin)
    if (userIsAdmin && open.rows.length === 0) return next();

    if (open.rows.length > 0) {
      const text = ctx.message.text || ctx.message.caption || '[attachment]';
      await addUserMessageToTicket(ctx, open.rows[0], text);
      const lang = (await getUserLanguage(u.id)) || 'en';
      await ctx.reply(formatTemplate(t(lang, 'msg_added'), { number: open.rows[0].ticket_number }));
      return;
    }

    const lang = (await getUserLanguage(u.id)) || 'en';
    if (!lang) {
      await ctx.reply(t('en', 'choose_lang'), { ...languageKeyboard(null) });
      return;
    }
    await ctx.reply(t(lang, 'no_open_ticket'), { ...guideKeyboard(lang) });
    return;
  }

  // 4) Group: warn about plain replies to ticket cards
  if (['group', 'supergroup'].includes(chatType) && userIsAdmin && ctx.message.reply_to_message) {
    const mapped = await pool.query(
      'SELECT ticket_id FROM message_mappings WHERE chat_id=$1 AND message_id=$2',
      [ctx.chat.id, ctx.message.reply_to_message.message_id]
    );
    if (mapped.rows.length > 0) {
      await ctx.reply(
        `⚠️ Plain replies are NOT sent to users.\nUse the 💬 Reply button on the ticket card or /reply <ticket#> <message>.`,
        { reply_to_message_id: ctx.message.message_id }
      );
      return;
    }
  }

  return next();
});

// ================= USER TICKET CREATION =================
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

  // ★ Post to group (with fallback)
  await postTicketToGroup(tk);

  await ctx.reply(
    formatTemplate(t(lang, 'ticket_created'), { number: tk.ticket_number }),
    { parse_mode: 'Markdown' }
  );
}

async function addUserMessageToTicket(ctx, ticket, text) {
  const u = ctx.from;
  await pool.query(
    `INSERT INTO ticket_messages (ticket_id, direction, sender_id, sender_name, text, telegram_message_id, chat_id)
     VALUES ($1,'user',$2,$3,$4,$5,$6)`,
    [ticket.id, u.id, u.first_name, text, ctx.message?.message_id, u.id]
  );
  if (ticket.group_chat_id && ticket.card_message_id) {
    const notice = `💬 *New message on #${ticket.ticket_number}* from ${escapeMd(u.first_name)}:\n\n${escapeMd(text)}`;
    const noticePlain = `💬 New message on #${ticket.ticket_number} from ${u.first_name}:\n\n${text}`;
    try {
      await bot.telegram.sendMessage(ticket.group_chat_id, notice, {
        parse_mode: 'Markdown',
        reply_to_message_id: ticket.card_message_id
      });
    } catch (e) {
      console.error(`notify group failed (markdown): ${e.message}`);
      try {
        await bot.telegram.sendMessage(ticket.group_chat_id, noticePlain, {
          reply_to_message_id: ticket.card_message_id
        });
      } catch (e2) {
        console.error(`notify group failed (plain): ${e2.message}`);
      }
    }
  }
}

// ================= ADMIN REPLY / NOTE HANDLERS =================
async function handleAdminReply(ctx, pending) {
  const text = ctx.message.text || ctx.message.caption || '[media]';
  if (text.startsWith('/')) return;
  const name = await getAdminName(ctx.from.id);
  try {
    await sendToUser(pending.ticket_id, text, ctx.from.id, name);
    await pool.query('DELETE FROM pending_replies WHERE admin_id=$1', [ctx.from.id]);
    await ctx.reply('✅ Reply delivered to user.');
  } catch (e) {
    await ctx.reply(`❌ Failed: ${escapeMd(e.message)}`, { parse_mode: 'Markdown' });
  }
}

async function handleAdminNote(ctx, pending) {
  const text = ctx.message.text;
  if (!text || text.startsWith('/')) return;
  await saveInternalNote(pending.ticket_id, ctx.from.id, text);
  await pool.query('DELETE FROM pending_notes WHERE admin_id=$1', [ctx.from.id]);
  await ctx.reply('📝 Internal note saved.');
}

// ================= BROADCAST MESSAGE HANDLER =================
async function handleBroadcastMessage(ctx, session) {
  const u = ctx.from;
  const msg = ctx.message;

  if (session.stage === BS.CONTENT) {
    const payload = { ...session.payload };
    if (msg.media_group_id) {
      const existing = payload.media_items || [];
      if (msg.photo) existing.push({ type: 'photo', file_id: msg.photo[msg.photo.length - 1].file_id, caption: msg.caption || '' });
      else if (msg.video) existing.push({ type: 'video', file_id: msg.video.file_id, caption: msg.caption || '' });
      payload.media_items = existing;
      await setBroadcastSession(u.id, BS.CONTENT, payload);
      return;
    }
    if (msg.text) payload.text = msg.text;
    else if (msg.photo) { payload.media = msg.photo[msg.photo.length - 1].file_id; payload.text = msg.caption || ''; }
    else if (msg.video) { payload.media = msg.video.file_id; payload.text = msg.caption || ''; }
    else if (msg.animation) { payload.media = msg.animation.file_id; payload.text = msg.caption || ''; }
    else if (msg.document) { payload.media = msg.document.file_id; payload.text = msg.caption || ''; }
    else return ctx.reply('Send text, photo, video, GIF or document.');

    await setBroadcastSession(u.id, BS.BUTTONS, payload);
    await ctx.reply(
      `Content saved. Add inline buttons?\n\n` +
      `Format — one button per line:\n\`Label | https://url\`\n\n` +
      `Or send /skip to continue without buttons.`,
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

// ================= GROUP MEMBERSHIP EVENTS =================
bot.on('chat_member', async (ctx) => {
  const gid = await getSetting('admin_group_id');
  if (String(ctx.chat.id) !== String(gid)) return;

  const m = ctx.chatMember;
  if (m.new_chat_member.user.is_bot) return;

  const status = m.new_chat_member.status;
  const user = m.new_chat_member.user;

  if (['member', 'administrator', 'creator'].includes(status)) {
    const role = status === 'creator' ? 'super_admin' : 'agent';
    await upsertAdminFromTelegram(user, role);
  } else if (['left', 'kicked'].includes(status)) {
    await deactivateAdmin(user.id);
  }
});

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

module.exports = { bot, sendToUser, getSetting, isAdmin, audit, syncAdminsFromGroup };
