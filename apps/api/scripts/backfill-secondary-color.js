require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const updates = [
  {
    name: 'Nair & Associates',
    branding: {
      firmName: 'Nair & Associates',
      logoUrl: null,
      primaryColor: '#1a4f9d',
      secondaryColor: '#dbeafe',
      tagline: 'Trusted legal counsel.',
    },
  },
  {
    name: 'Practix',
    branding: {
      firmName: 'Practix',
      logoUrl: null,
      primaryColor: '#4f46e5',
      secondaryColor: '#e0e7ff',
      tagline: 'Practix by Disionix — Intelligent Operations for Professional Firms',
    },
  },
];

async function run() {
  for (const { name, branding } of updates) {
    const result = await pool.query(
      `UPDATE tenants SET branding_config = $1 WHERE name = $2 RETURNING id, name`,
      [JSON.stringify(branding), name]
    );
    console.log('Updated:', result.rows[0]);
  }
}

run().catch(e => console.error(e.message)).finally(() => pool.end());
