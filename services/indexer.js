import { COLLECTIONS, ensureDatabaseIndexes } from "../db/collections.js";
import { buildRecordTermStats } from "./tokenizer.js";

const INDEX_BATCH_SIZE = 500;

export async function indexRecord(db, record) {
  if (!record?._id) {
    return 0;
  }

  const searchIndex = db.collection(COLLECTIONS.searchIndex);
  const entries = buildIndexEntries(record);

  await searchIndex.deleteMany({ recordId: record._id });

  if (entries.length === 0) {
    return 0;
  }

  await searchIndex.insertMany(entries, { ordered: false });
  return entries.length;
}

export async function removeRecordFromIndex(db, recordId) {
  const result = await db
    .collection(COLLECTIONS.searchIndex)
    .deleteMany({ recordId });
  return result.deletedCount;
}

export async function rebuildSearchIndex(db) {
  await ensureDatabaseIndexes(db);

  const searchIndex = db.collection(COLLECTIONS.searchIndex);
  const records = db.collection(COLLECTIONS.records);
  const startedAt = new Date();
  let indexedRecords = 0;
  let indexedTerms = 0;
  let batch = [];

  await searchIndex.deleteMany({});

  const cursor = records.find({});

  for await (const record of cursor) {
    const entries = buildIndexEntries(record);

    indexedRecords += 1;
    indexedTerms += entries.length;
    batch.push(...entries.map((entry) => ({ insertOne: { document: entry } })));

    if (batch.length >= INDEX_BATCH_SIZE) {
      await searchIndex.bulkWrite(batch, { ordered: false });
      batch = [];
    }
  }

  if (batch.length > 0) {
    await searchIndex.bulkWrite(batch, { ordered: false });
  }

  return {
    indexedRecords,
    indexedTerms,
    startedAt,
    completedAt: new Date(),
  };
}

function buildIndexEntries(record) {
  const now = new Date();

  return buildRecordTermStats(record).map((termStat) => ({
    ...termStat,
    recordId: record._id,
    externalId: record.externalId,
    recordTitle: record.title,
    updatedAt: now,
  }));
}
