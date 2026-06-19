export const COLLECTIONS = {
  records: "records",
  searchIndex: "search_index",
  rankingProfiles: "ranking_profiles",
};

export async function ensureDatabaseIndexes(db) {
  await Promise.all([
    db.collection(COLLECTIONS.records).createIndexes([
      { key: { category: 1 } },
      { key: { source: 1 } },
      { key: { tags: 1 } },
      { key: { publishedAt: -1 } },
      { key: { status: 1 } },
      { key: { slug: 1 }, unique: true },
      {
        key: { externalId: 1 },
        unique: true,
        partialFilterExpression: { externalId: { $exists: true } },
      },
    ]),
    db
      .collection(COLLECTIONS.searchIndex)
      .createIndexes([
        { key: { term: 1 } },
        { key: { recordId: 1 } },
        { key: { term: 1, recordId: 1, field: 1 }, unique: true },
      ]),
    db
      .collection(COLLECTIONS.rankingProfiles)
      .createIndexes([
        { key: { name: 1 }, unique: true },
        { key: { isActive: 1 } },
      ]),
  ]);
}
