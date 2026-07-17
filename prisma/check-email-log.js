/* eslint-disable @typescript-eslint/no-require-imports */
// One-off diagnostic: read the latest EmailLog rows to see why a test email
// didn't arrive. Deleted after use.
const { Client } = require("pg");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const rows = await client.query(
    'SELECT "triggerType", "recipientEmail", success, error, "sentAt" FROM "EmailLog" ORDER BY "sentAt" DESC LIMIT 5',
  );
  console.log(JSON.stringify(rows.rows, null, 2));

  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
