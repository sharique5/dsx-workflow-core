require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const branding = JSON.stringify({
  firmName: 'Nair & Associates',
  logoUrl: null,
  primaryColor: '#1a4f9d',
  tagline: 'Trusted legal counsel.',
});

pool.query(
  `UPDATE tenants
   SET web_domain = $1, portal_domain = $2, branding_config = $3
   WHERE name = $4
   RETURNING id, name, web_domain, portal_domain`,
  ['team.nairandassociates.com', 'portal.nairandassociates.com', branding, 'Nair & Associates']
)
  .then(r => { console.log('Updated:', JSON.stringify(r.rows[0], null, 2)); })
  .catch(e => { console.error('Error:', e.message); })
  .finally(() => pool.end());
