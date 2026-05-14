// ===== SPACE LINK CRM — EXPRESS API SERVER =====
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query } from './db.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// ===== HELPERS =====
function generateId(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ===== DATABASE INIT =====
async function initDatabase() {
  try {
    // Run schema
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    await query(schema);
    console.log('✓ Schema initialized');

    // Check if data exists
    const { rows } = await query('SELECT COUNT(*) FROM users');
    if (parseInt(rows[0].count) === 0) {
      const seed = readFileSync(join(__dirname, 'seed.sql'), 'utf-8');
      await query(seed);
      console.log('✓ Seed data loaded');
    } else {
      console.log('✓ Data already exists, skipping seed');
    }
  } catch (err) {
    console.error('Database init error:', err.message);
    process.exit(1);
  }
}

// ===== AUTH ROUTES =====
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { rows } = await query(
      'SELECT id, name, role, email FROM users WHERE email = $1 AND password_hash = $2 AND active = TRUE',
      [email, password]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const user = rows[0];
    res.json({
      userId: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
      loginAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== USER ROUTES =====
app.get('/api/users', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM users ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/active', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM users WHERE active = TRUE ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, email, phone, role, password_hash } = req.body;
    const id = 'user_' + Date.now().toString(36);
    const { rows } = await query(
      'INSERT INTO users (id, name, email, phone, role, password_hash, active) VALUES ($1,$2,$3,$4,$5,$6,TRUE) RETURNING *',
      [id, name, email, phone || '', role, password_hash]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { name, email, phone, role, password_hash } = req.body;
    let q, params;
    if (password_hash) {
      q = 'UPDATE users SET name=$1, email=$2, phone=$3, role=$4, password_hash=$5, updated_at=NOW() WHERE id=$6 RETURNING *';
      params = [name, email, phone, role, password_hash, req.params.id];
    } else {
      q = 'UPDATE users SET name=$1, email=$2, phone=$3, role=$4, updated_at=NOW() WHERE id=$5 RETURNING *';
      params = [name, email, phone, role, req.params.id];
    }
    const { rows } = await query(q, params);
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/users/:id/toggle', async (req, res) => {
  try {
    const { rows } = await query(
      'UPDATE users SET active = NOT active, updated_at=NOW() WHERE id=$1 RETURNING *',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== SOURCE ROUTES =====
app.get('/api/sources', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM sources ORDER BY source_name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sources', async (req, res) => {
  try {
    const { source_name } = req.body;
    // Check existing
    const existing = await query('SELECT * FROM sources WHERE LOWER(source_name) = LOWER($1)', [source_name]);
    if (existing.rows.length > 0) return res.json(existing.rows[0]);

    const id = 'src_' + generateId();
    const { rows } = await query(
      'INSERT INTO sources (id, source_name, is_custom) VALUES ($1,$2,TRUE) RETURNING *',
      [id, source_name]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== LEAD ROUTES =====
app.get('/api/leads', async (req, res) => {
  try {
    let q = 'SELECT * FROM leads WHERE 1=1';
    const params = [];
    let idx = 1;

    if (req.query.search) {
      const search = `%${req.query.search.toLowerCase()}%`;
      q += ` AND (LOWER(lead_name) LIKE $${idx} OR phone LIKE $${idx} OR COALESCE(alternate_phone,'') LIKE $${idx} OR LOWER(COALESCE(email,'')) LIKE $${idx})`;
      params.push(search);
      idx++;
    }
    if (req.query.source_id) {
      q += ` AND source_id = $${idx}`;
      params.push(req.query.source_id);
      idx++;
    }
    if (req.query.status) {
      q += ` AND status = $${idx}`;
      params.push(req.query.status);
      idx++;
    }
    if (req.query.assigned_to) {
      q += ` AND assigned_to = $${idx}`;
      params.push(req.query.assigned_to);
      idx++;
    }
    if (req.query.date_from) {
      q += ` AND created_at >= $${idx}`;
      params.push(req.query.date_from);
      idx++;
    }
    if (req.query.date_to) {
      q += ` AND created_at <= ($${idx}::date + interval '1 day')`;
      params.push(req.query.date_to);
      idx++;
    }

    q += ' ORDER BY updated_at DESC';

    const { rows } = await query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leads/today', async (req, res) => {
  try {
    const { rows } = await query(
      "SELECT * FROM leads WHERE created_at::date = CURRENT_DATE ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leads/check-duplicate', async (req, res) => {
  try {
    const { phone, alternate_phone, exclude_id } = req.query;
    const phones = [phone, alternate_phone].filter(Boolean);
    if (phones.length === 0) return res.json([]);

    let q = 'SELECT * FROM leads WHERE (phone = ANY($1) OR alternate_phone = ANY($1))';
    const params = [phones];
    if (exclude_id) {
      q += ' AND id != $2';
      params.push(exclude_id);
    }
    const { rows } = await query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/leads/:id', async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Lead not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leads', async (req, res) => {
  try {
    const d = req.body;
    const id = 'lead_' + generateId();
    const { rows } = await query(
      `INSERT INTO leads (id, lead_name, phone, alternate_phone, email, source_id, custom_source,
        assigned_to, attended_by, budget, preferred_location, property_type, bhk, notes,
        referrer_name, referrer_phone, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
      [id, d.lead_name, d.phone, d.alternate_phone || '', d.email || '', d.source_id,
        d.custom_source || '', d.assigned_to, d.attended_by || '', d.budget || '',
        d.preferred_location || '', d.property_type || '', d.bhk || '', d.notes || '',
        d.referrer_name || '', d.referrer_phone || '', d.status || 'new', d.created_by]
    );

    // Log activity
    await query(
      'INSERT INTO activities (id, lead_id, activity_type, description, performed_by) VALUES ($1,$2,$3,$4,$5)',
      [generateId('act_'), id, 'created', `Lead created - ${d.lead_name}`, d.created_by]
    );

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/leads/:id', async (req, res) => {
  try {
    const d = req.body;
    const userId = d.userId;

    // Get old lead for change tracking
    const old = await query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
    if (old.rows.length === 0) return res.status(404).json({ error: 'Lead not found' });
    const oldLead = old.rows[0];

    // Build dynamic update
    const fields = ['lead_name', 'phone', 'alternate_phone', 'email', 'assigned_to',
      'attended_by', 'budget', 'preferred_location', 'property_type', 'bhk', 'notes',
      'status', 'status_note'];
    const updates = [];
    const params = [];
    let idx = 1;

    for (const f of fields) {
      if (d[f] !== undefined) {
        updates.push(`${f} = $${idx}`);
        params.push(d[f]);
        idx++;
      }
    }

    if (updates.length === 0) {
      // Touch updated_at even if no fields changed
      await query('UPDATE leads SET updated_at = NOW() WHERE id = $1', [req.params.id]);
      const { rows } = await query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
      return res.json(rows[0]);
    }

    updates.push('updated_at = NOW()');
    params.push(req.params.id);
    const { rows } = await query(
      `UPDATE leads SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    // Log status change
    if (d.status && d.status !== oldLead.status) {
      const label = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const desc = `Status changed from ${label(oldLead.status)} to ${label(d.status)}${d.status_note ? ': ' + d.status_note : ''}`;
      await query(
        'INSERT INTO activities (id, lead_id, activity_type, description, performed_by) VALUES ($1,$2,$3,$4,$5)',
        [generateId('act_'), req.params.id, 'status_change', desc, userId]
      );
    }

    // Log assignment change
    if (d.assigned_to && d.assigned_to !== oldLead.assigned_to) {
      await query(
        'INSERT INTO activities (id, lead_id, activity_type, description, performed_by) VALUES ($1,$2,$3,$4,$5)',
        [generateId('act_'), req.params.id, 'assignment_change', 'Lead reassigned', userId]
      );
    }

    // General update
    if (!d.status && !d.assigned_to) {
      await query(
        'INSERT INTO activities (id, lead_id, activity_type, description, performed_by) VALUES ($1,$2,$3,$4,$5)',
        [generateId('act_'), req.params.id, 'updated', 'Lead information updated', userId]
      );
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/leads/:id', async (req, res) => {
  try {
    const userId = req.query.userId;
    const lead = await query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
    if (lead.rows.length === 0) return res.status(404).json({ error: 'Lead not found' });

    await query('DELETE FROM leads WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== VISIT ROUTES =====
app.get('/api/visits', async (req, res) => {
  try {
    let q = 'SELECT * FROM visits';
    const params = [];
    if (req.query.lead_id) {
      q += ' WHERE lead_id = $1';
      params.push(req.query.lead_id);
    }
    q += ' ORDER BY created_at DESC';
    const { rows } = await query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/visits/today', async (req, res) => {
  try {
    const { rows } = await query(
      "SELECT * FROM visits WHERE visit_date = to_char(CURRENT_DATE, 'YYYY-MM-DD') ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/visits', async (req, res) => {
  try {
    const d = req.body;
    const id = 'visit_' + generateId();
    const { rows } = await query(
      `INSERT INTO visits (id, lead_id, visit_date, visit_time, site_location, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, d.lead_id, d.visit_date, d.visit_time || '', d.site_location || '', d.notes || '', d.created_by]
    );

    // Log activity
    await query(
      'INSERT INTO activities (id, lead_id, activity_type, description, performed_by) VALUES ($1,$2,$3,$4,$5)',
      [generateId('act_'), d.lead_id, 'visit_logged', `Site visit logged at ${d.site_location || 'site'}`, d.created_by]
    );

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== ACTIVITY ROUTES =====
app.get('/api/activities', async (req, res) => {
  try {
    let q = 'SELECT * FROM activities';
    const params = [];
    if (req.query.lead_id) {
      q += ' WHERE lead_id = $1';
      params.push(req.query.lead_id);
    }
    q += ' ORDER BY created_at DESC';
    if (req.query.limit) {
      q += ` LIMIT ${parseInt(req.query.limit)}`;
    }
    const { rows } = await query(q, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/activities', async (req, res) => {
  try {
    const { lead_id, activity_type, description, performed_by } = req.body;
    const id = generateId('act_');
    const { rows } = await query(
      'INSERT INTO activities (id, lead_id, activity_type, description, performed_by) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [id, lead_id, activity_type, description, performed_by]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== DASHBOARD STATS =====
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const [
      totalRes,
      todayWalkInsRes,
      followUpsRes,
      newTodayRes,
      byStatusRes,
      bySourceRes,
      byAssigneeRes,
    ] = await Promise.all([
      query('SELECT COUNT(*) FROM leads'),
      query("SELECT COUNT(*) FROM leads WHERE source_id = 'src_walkin' AND created_at::date = CURRENT_DATE"),
      query("SELECT COUNT(*) FROM leads WHERE status = 'followup'"),
      query('SELECT COUNT(*) FROM leads WHERE created_at::date = CURRENT_DATE'),
      query('SELECT status, COUNT(*) FROM leads GROUP BY status'),
      query('SELECT source_id, COUNT(*) FROM leads GROUP BY source_id'),
      query('SELECT assigned_to, COUNT(*) FROM leads WHERE assigned_to IS NOT NULL GROUP BY assigned_to'),
    ]);

    const byStatus = {};
    byStatusRes.rows.forEach(r => { byStatus[r.status] = parseInt(r.count); });

    const bySource = {};
    bySourceRes.rows.forEach(r => { bySource[r.source_id] = parseInt(r.count); });

    const byAssignee = {};
    byAssigneeRes.rows.forEach(r => { if (r.assigned_to) byAssignee[r.assigned_to] = parseInt(r.count); });

    res.json({
      total: parseInt(totalRes.rows[0].count),
      todayWalkIns: parseInt(todayWalkInsRes.rows[0].count),
      followUpsDue: parseInt(followUpsRes.rows[0].count),
      newToday: parseInt(newTodayRes.rows[0].count),
      byStatus,
      bySource,
      byAssignee,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== LEAD COUNTS FOR USER MANAGEMENT =====
app.get('/api/leads/counts-by-assignee', async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT assigned_to, COUNT(*)::int as count FROM leads WHERE assigned_to IS NOT NULL GROUP BY assigned_to'
    );
    const counts = {};
    rows.forEach(r => { counts[r.assigned_to] = r.count; });
    res.json(counts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3001;

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Space Link CRM API running on http://localhost:${PORT}\n`);
  });
});
