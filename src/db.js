const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL?.includes('localhost')
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tickets (
      id SERIAL PRIMARY KEY,
      ticket_number INTEGER UNIQUE,
      user_id BIGINT NOT NULL,
      user_name TEXT,
      category TEXT,
      subject TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      priority TEXT NOT NULL DEFAULT 'normal',
      assigned_admin_id BIGINT,
      assigned_admin_name TEXT,
      group_chat_id BIGINT,
      topic_id BIGINT,
      card_message_id BIGINT,
      transaction_id TEXT,
      wallet_address TEXT,
      sla_due_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMP
    );

    CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START 1000;
    ALTER TABLE tickets ALTER COLUMN ticket_number SET DEFAULT nextval('ticket_number_seq');

    CREATE TABLE IF NOT EXISTS ticket_messages (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      direction TEXT NOT NULL,
      sender_id BIGINT,
      sender_name TEXT,
      text TEXT,
      attachment_url TEXT,
      telegram_message_id BIGINT,
      chat_id BIGINT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ticket_events (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER,
      actor_id BIGINT,
      actor_name TEXT,
      actor_type TEXT,
      action TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      details TEXT,
      timestamp TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS message_mappings (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
      chat_id BIGINT NOT NULL,
      message_id BIGINT NOT NULL,
      source TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(chat_id, message_id)
    );

    CREATE TABLE IF NOT EXISTS admins (
      id SERIAL PRIMARY KEY,
      telegram_id BIGINT UNIQUE NOT NULL,
      name TEXT,
      role TEXT DEFAULT 'agent',
      active BOOLEAN DEFAULT true,
      source TEXT DEFAULT 'group',
      created_at TIMESTAMP DEFAULT NOW()
    );
    ALTER TABLE admins ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
    ALTER TABLE admins ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'group';

    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      telegram_id BIGINT UNIQUE NOT NULL,
      username TEXT,
      first_name TEXT,
      last_name TEXT,
      language TEXT,
      first_seen TIMESTAMP DEFAULT NOW(),
      last_seen TIMESTAMP DEFAULT NOW(),
      blocked BOOLEAN DEFAULT false
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS language TEXT;

    CREATE TABLE IF NOT EXISTS groups (
      id SERIAL PRIMARY KEY,
      telegram_id BIGINT UNIQUE NOT NULL,
      title TEXT,
      type TEXT,
      added_at TIMESTAMP DEFAULT NOW(),
      active BOOLEAN DEFAULT true
    );

    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);

    CREATE TABLE IF NOT EXISTS pending_replies (
      admin_id BIGINT PRIMARY KEY,
      ticket_id INTEGER NOT NULL,
      chat_id BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pending_notes (
      admin_id BIGINT PRIMARY KEY,
      ticket_id INTEGER NOT NULL,
      chat_id BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_states (
      user_id BIGINT PRIMARY KEY,
      state TEXT NOT NULL,
      payload JSONB DEFAULT '{}',
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS broadcast_sessions (
      admin_id BIGINT PRIMARY KEY,
      stage TEXT NOT NULL,
      payload JSONB DEFAULT '{}',
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS broadcast_jobs (
      id SERIAL PRIMARY KEY,
      created_by BIGINT,
      payload JSONB NOT NULL,
      total INTEGER DEFAULT 0,
      sent INTEGER DEFAULT 0,
      failed INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assigned_admin_id);
    CREATE INDEX IF NOT EXISTS idx_messages_ticket ON ticket_messages(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_events_ticket ON ticket_events(ticket_id);
    CREATE INDEX IF NOT EXISTS idx_events_ts ON ticket_events(timestamp DESC);
  `);

  // Bootstrap the OWNER (bot creator) — cannot be removed via group leave
  if (process.env.OWNER_ID) {
    await pool.query(
      `INSERT INTO admins (telegram_id, role, active, source)
       VALUES ($1, 'super_admin', true, 'owner')
       ON CONFLICT (telegram_id) DO UPDATE SET role='super_admin', active=true, source='owner'`,
      [process.env.OWNER_ID]
    );
  }

  if (process.env.ADMIN_GROUP_ID) {
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ('admin_group_id', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [process.env.ADMIN_GROUP_ID]
    );
  }

  console.log('Database schema ready');
}

module.exports = { pool, init };
