// scripts/check-schema.js
// Read-only audit: compare the tables defined in src/sql/*.sql against the
// tables that actually exist in the configured database, and report which
// migrations have not been applied.
//   Run:  npm run check:schema
const fs = require("fs");
const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
  quiet: true,
});

const query = require("../src/utils/db");

const SQL_DIR = path.join(__dirname, "..", "src", "sql");

// "CREATE TABLE IF NOT EXISTS `foo` (" -> foo
const CREATE_TABLE = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?([a-z0-9_]+)[`"]?/gi;

const tablesDefinedIn = (file) => {
  const sql = fs.readFileSync(file, "utf8");
  const names = new Set();
  let match;
  while ((match = CREATE_TABLE.exec(sql)) !== null) {
    names.add(match[1].toLowerCase());
  }
  return names;
};

(async () => {
  const files = fs
    .readdirSync(SQL_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const definedBy = new Map(); // table -> [files]
  for (const file of files) {
    for (const table of tablesDefinedIn(path.join(SQL_DIR, file))) {
      definedBy.set(table, [...(definedBy.get(table) || []), file]);
    }
  }

  const rows = await query(
    "SELECT table_name AS t FROM information_schema.tables WHERE table_schema = ?",
    [process.env.DB_NAME]
  );
  const live = new Set(rows.map((r) => String(r.t || r.T || "").toLowerCase()));

  const defined = [...definedBy.keys()].sort();
  const missing = defined.filter((t) => !live.has(t));
  const extra = [...live].filter((t) => !definedBy.has(t)).sort();

  console.log(`\nDatabase: ${process.env.DB_NAME}`);
  console.log(`SQL files: ${files.join(", ")}\n`);

  console.log(`Tables defined in SQL: ${defined.length}`);
  console.log(`Tables live in DB:     ${live.size}\n`);

  if (missing.length) {
    console.log(`MISSING (${missing.length}) — defined in SQL but not in the database:`);
    for (const t of missing) {
      console.log(`  - ${t}   (from ${definedBy.get(t).join(", ")})`);
    }
  } else {
    console.log("MISSING: none — every defined table exists.");
  }

  if (extra.length) {
    console.log(`\nIn DB but not defined in any SQL file (${extra.length}):`);
    extra.forEach((t) => console.log(`  - ${t}`));
  }

  // Row counts for the tables that do exist, so it's obvious what holds data.
  const present = defined.filter((t) => live.has(t));
  if (present.length) {
    console.log("\nRow counts for existing tables:");
    for (const t of present) {
      try {
        const c = await query(`SELECT COUNT(*) AS n FROM \`${t}\``);
        console.log(`  ${String(c[0].n).padStart(6)}  ${t}`);
      } catch (e) {
        console.log(`       ?  ${t}  (${e.message})`);
      }
    }
  }

  console.log("");
  process.exit(0);
})();
