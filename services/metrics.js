import { COLLECTIONS } from "../db/collections.js";

export async function getAppMetrics(db) {
  const records = db.collection(COLLECTIONS.records);
  const searchIndex = db.collection(COLLECTIONS.searchIndex);
  const searchEvents = db.collection(COLLECTIONS.searchEvents);

  const [
    totalRecords,
    publishedRecords,
    draftRecords,
    archivedRecords,
    categoryCounts,
    sourceCounts,
    topTags,
    indexEntries,
    uniqueTerms,
    searchCount,
    zeroResultQueries,
    searchesByDay,
  ] = await Promise.all([
    records.countDocuments(),
    records.countDocuments({ status: "published" }),
    records.countDocuments({ status: "draft" }),
    records.countDocuments({ status: "archived" }),
    groupCounts(records, "$category"),
    groupCounts(records, "$source"),
    records
      .aggregate([
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 10 },
      ])
      .toArray(),
    searchIndex.countDocuments(),
    searchIndex
      .aggregate([{ $group: { _id: "$term" } }, { $count: "count" }])
      .toArray()
      .then((items) => items[0]?.count || 0),
    searchEvents.countDocuments(),
    searchEvents
      .aggregate([
        { $match: { resultCount: 0, query: { $ne: "" } } },
        { $group: { _id: "$query", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray(),
    searchEvents
      .aggregate([
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: -1 } },
        { $limit: 14 },
      ])
      .toArray(),
  ]);

  return {
    records: {
      total: totalRecords,
      published: publishedRecords,
      draft: draftRecords,
      archived: archivedRecords,
    },
    categoryCounts,
    sourceCounts,
    topTags,
    searchIndex: {
      entries: indexEntries,
      uniqueTerms,
    },
    searches: {
      total: searchCount,
      zeroResultQueries,
      byDay: searchesByDay.reverse(),
    },
  };
}

function groupCounts(collection, field) {
  return collection
    .aggregate([
      { $group: { _id: field, count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ])
    .toArray();
}
