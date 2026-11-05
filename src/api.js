const express = require('express');
const { pool } = require('./db');
const { sendToUser, bot } = require('./bot');
const { startBroadcast } = require('./broadcast');

const router = express.Router();

// Lightweight identity middleware: uses x-admin-id header if provided,
// otherwise acts as "dashboard" (log everything as an audit entry).
async function identifyAdmin(req, res, next) {
  const adminId = parseInt(req.headers['x-admin-id'] || req.query.admin_id || '0', 10);
  if (adminId) {
    const r = await pool.query('SELECT * FROM admins WHERE telegram_id=$1', [adminId]);
    if (r.rows[0]) {
      req.adminId = adminId;
      req.adminName = r.rows[0].name || `@${adminId}`;
      return next();
    }
  }
  req.adminId = 0;
  req.adminName = 'dashboard';
  next();
}
router.use(identifyAdmin);

// =============== stats ===============
router.get('/stats/overview', async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status='open')::int AS open,
        COUNT(*) FILTER (WHERE status='in_progress')::int AS in_progress,
        COUNT(*) FILTER (WHERE status='pending')::int AS pending,
        COUNT(*) FILTER (WHERE status='resolved')::int AS resolved,
        COUNT(*) FILTER (WHERE status='closed')::int AS closed,
        COUNT(*) FILTER (WHERE sla_due_at < NOW() AND status NOT IN ('resolved','closed'))::int AS overdue
      FROM tickets
    `);
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/stats/admins', async (req, res) => {
  try {
    const admins = (await pool.query('SELECT * FROM admins')).rows;
    const result = [];
    for (const a of admins) {
      const c = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE assigned_admin_id=$1)::int AS claimed,
          COUNT(*) FILTER (WHERE assigned_admin_id=$1 AND status IN ('resolved','closed'))::int AS solved,
          COUNT(*) FILTER (WHERE assigned_admin_id=$1 AND status='in_progress')::int AS in_progress
        FROM tickets
      `, [a.telegram_id]);
      result.push({
        id: a.telegram_id,
        name: a.name || `@${a.telegram_id}`,
        claimed: c.rows[0].claimed,
        solved: c.rows[0].solved,
        in_progress: c.rows[0].in_progress,
        avg_first_response: '—',
        avg_resolution: '—',
        sla_percent: '—',
        csat: '—',
      });
    }
    res.json({
      active: admins.length,
      total_solved: result.reduce((s, x) => s + x.solved, 0),
      avg_resolution: '—',
      admins: result,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// =============== tickets ===============
router.get('/tickets', async (req, res) => {
  try {
    const { status, q, limit } = req.query;
    const conds = [];
    const vals = [];
    let i = 1;
    if (status && status !== 'all') { conds.push(`status=$${i++}`); vals.push(status); }
    if (q) {
      conds.push(`(
        CAST(ticket_number AS TEXT) ILIKE $${i} OR
        user_name ILIKE $${i} OR
        transaction_id ILIKE $${i} OR
        wallet_address ILIKE $${i} OR
        subject ILIKE $${i}
      )`);
      vals.push(`%${q}%`);
      i++;
    }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const lim = Math.min(parseInt(limit) || 100, 500);
    const r = await pool.query(
      `SELECT * FROM tickets ${where} ORDER BY created_at DESC LIMIT $${i}`,
      [...vals, lim]
    );
    res.json({ tickets: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/tickets/:id', async (req, res) => {
  try {
    const t = await pool.query('SELECT * FROM tickets WHERE id=$1', [req.params.id]);
    if (!t.rows[0]) return res.status(404).json({ error: 'Not found' });
    const msgs = await pool.query(
      'SELECT * FROM ticket_messages WHERE ticket_id=$1 ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json({ ...t.rows[0], messages: msgs.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// =============== actions ===============
router.post('/tickets/:id/reply', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'No text' });
    await sendToUser(parseInt(req.params.id), text, req.adminId, req.adminName);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/tickets/:id/note', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'No text' });
    await pool.query(
      `INSERT INTO ticket_messages (ticket_id, direction, sender_id, sender_name, text, chat_id)
       VALUES ($1,'internal',$2,$3,$4,0)`,
      [parseInt(req.params.id), req.adminId, req.adminName, text]
    );
    await pool.query(
      `INSERT INTO ticket_events (ticket_id, actor_id, actor_name, actor_type, action, details)
       VALUES ($1,$2,$3,'admin','internal_note',$4)`,
      [parseInt(req.params.id), req.adminId, req.adminName, text]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/tickets/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const old = (await pool.query('SELECT status FROM tickets WHERE id=$1', [req.params.id])).rows[0];
    await pool.query(
      `UPDATE tickets SET status=$1, updated_at=NOW()
       ${status === 'resolved' ? ', resolved_at=NOW()' : ''}
       WHERE id=$2`,
      [status, req.params.id]
    );
    await pool.query(
      `INSERT INTO ticket_events (ticket_id, actor_id, actor_name, actor_type, action, old_value, new_value)
       VALUES ($1,$2,$3,'admin','status_change',$4,$5)`,
      [parseInt(req.params.id), req.adminId, req.adminName, old?.status, status]
    );
    if (status === 'resolved' || status === 'closed') {
      const t = (await pool.query('SELECT * FROM tickets WHERE id=$1', [req.params.id])).rows[0];
      try {
        await bot.telegram.sendMessage(
          t.user_id,
          `Ticket <b>#${t.ticket_number}</b> has been ${status}.`,
          { parse_mode: 'HTML' }
        );
      } catch (_) {}
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/tickets/:id/priority', async (req, res) => {
  try {
    const { priority } = req.body;
    await pool.query('UPDATE tickets SET priority=$1, updated_at=NOW() WHERE id=$2',
      [priority, req.params.id]);
    await pool.query(
      `INSERT INTO ticket_events (ticket_id, actor_id, actor_name, actor_type, action, new_value)
       VALUES ($1,$2,$3,'admin','priority_change',$4)`,
      [parseInt(req.params.id), req.adminId, req.adminName, priority]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/tickets/:id/claim', async (req, res) => {
  try {
    const r = await pool.query(
      `UPDATE tickets SET assigned_admin_id=$1, assigned_admin_name=$2,
         status = CASE WHEN status='open' THEN 'in_progress' ELSE status END,
         updated_at=NOW()
       WHERE id=$3 AND (assigned_admin_id IS NULL OR assigned_admin_id=$1)
       RETURNING *`,
      [req.adminId, req.adminName, parseInt(req.params.id)]
    );
    if (r.rows.length === 0) return res.status(409).json({ error: 'Already claimed' });
    await pool.query(
      `INSERT INTO ticket_events (ticket_id, actor_id, actor_name, actor_type, action, new_value)
       VALUES ($1,$2,$3,'admin','claim',$4)`,
      [parseInt(req.params.id), req.adminId, req.adminName, req.adminName]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/tickets/:id/escalate', async (req, res) => {
  try {
    await pool.query(`UPDATE tickets SET priority='urgent', updated_at=NOW() WHERE id=$1`,
      [req.params.id]);
    await pool.query(
      `INSERT INTO ticket_events (ticket_id, actor_id, actor_name, actor_type, action)
       VALUES ($1,$2,$3,'admin','escalate')`,
      [parseInt(req.params.id), req.adminId, req.adminName]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// =============== broadcast ===============
router.post('/broadcast', async (req, res) => {
  try {
    const payload = req.body;
    const job = await startBroadcast(req.adminId, payload, bot);
    res.json({ job_id: job.id, sent: 0, failed: 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// =============== audit ===============
router.get('/audit', async (req, res) => {
  try {
    const q = req.query.q || '';
    const r = await pool.query(
      `SELECT e.*, t.ticket_number
       FROM ticket_events e
       LEFT JOIN tickets t ON t.id = e.ticket_id
       WHERE ($1=''
         OR e.action ILIKE $2
         OR e.actor_name ILIKE $2
         OR CAST(t.ticket_number AS TEXT) = $1)
       ORDER BY e.timestamp DESC LIMIT 200`,
      [q, `%${q}%`]
    );
    res.json({ events: r.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// =============== settings ===============
router.post('/settings', async (req, res) => {
  try {
    const { admin_group_id, default_topic_id } = req.body;
    if (admin_group_id) {
      await pool.query(
        `INSERT INTO settings (key, value) VALUES ('admin_group_id', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [admin_group_id]
      );
    }
    if (default_topic_id) {
      await pool.query(
        `INSERT INTO settings (key, value) VALUES ('default_topic_id', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [default_topic_id]
      );
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
