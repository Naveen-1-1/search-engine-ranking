import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { COLLECTIONS, ensureDatabaseIndexes } from "../db/collections.js";
import { closeDb, connectToDb } from "../db/connection.js";
import { rebuildSearchIndex } from "../services/indexer.js";
import { ensureDefaultRankingProfiles } from "../services/rankingProfiles.js";
import { normalizeSeedRecord } from "../services/records.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedFilePath = path.join(__dirname, "../assets/search-records.json");

async function seedRecords() {
  const db = await connectToDb();
  const rawJson = await readFile(seedFilePath, "utf8");
  const rawRecords = JSON.parse(rawJson);

  if (!Array.isArray(rawRecords) || rawRecords.length < 1000) {
    throw new Error(
      "assets/search-records.json must contain at least 1,000 records."
    );
  }

  await ensureDatabaseIndexes(db);
  await db.collection(COLLECTIONS.records).deleteMany({});

  const records = rawRecords.map((record) => normalizeSeedRecord(record));
  await db
    .collection(COLLECTIONS.records)
    .insertMany(records, { ordered: false });
  await ensureDefaultRankingProfiles(db);

  const indexResult = await rebuildSearchIndex(db);

  console.log(`Seeded ${records.length} records.`);
  console.log(`Indexed ${indexResult.indexedRecords} published records.`);
  console.log(`Created ${indexResult.indexedTerms} search index entries.`);
}

seedRecords()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
