/* eslint-disable @typescript-eslint/no-require-imports */
// One-off cleanup script: removes the "Client de démo" seeded by
// prisma/seed.ts, which should only ever run against local SQLite dev but
// was accidentally run against production. Deleted after use — see the
// 2026-07-17 incident note in CAHIER_DES_CHARGES.md / memory.
const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const found = await client.query('SELECT id, name FROM "Client" WHERE name = $1', [
    "Client de démo",
  ]);
  console.log("found:", JSON.stringify(found.rows));

  if (found.rows.length > 0) {
    const id = found.rows[0].id;
    const deleted = await client.query('DELETE FROM "Client" WHERE id = $1', [id]);
    console.log("deleted rows:", deleted.rowCount);
  }

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
