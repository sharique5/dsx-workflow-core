require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const branding = JSON.stringify({
  firmName: 'Practix',
  logoUrl: null,
  primaryColor: '#4f46e5',
  tagline: 'Practix by Disionix — Intelligent Operations for Professional Firms',
});

pool.query(
  `UPDATE tenants
   SET web_domain = $1, portal_domain = $2, branding_config = $3
   WHERE name = $4
   RETURNING id, name, web_domain, portal_domain, branding_config`,
  ['practix-ops.disionix.com', 'practix.disionix.com', branding, 'Practix']
)
  .then(r => { console.log('Updated:', JSON.stringify(r.rows[0], null, 2)); })
  .catch(e => { console.error('Error:', e.message); })
  .finally(() => pool.end());
