import { COLLECTIONS } from "../db/collections.js";
import { scoreRecord } from "./scorer.js";
import { getActiveRankingProfile } from "./rankingProfiles.js";
import { tokenize, uniqueTokens } from "./tokenizer.js";

export async function searchRecords(db, options = {}) {
  const page = Math.max(Number(options.page) || 1, 1);
  const limit = Math.min(Math.max(Number(options.limit) || 10, 1), 50);
  const tokens = uniqueTokens(options.q || "");
  const recordFilter = buildRecordFilter(options);
  const rankingProfile = await getActiveRankingProfile(db);
  const matchesByRecordId = new Map();

  if (tokens.length > 0) {
    const indexMatches = await db
      .collection(COLLECTIONS.searchIndex)
      .find({ term: { $in: tokens } })
      .toArray();

    for (const match of indexMatches) {
      const key = String(match.recordId);

      if (!matchesByRecordId.has(key)) {
        matchesByRecordId.set(key, []);
      }

      matchesByRecordId.get(key).push(match);
    }

    recordFilter._id = {
      $in: [...matchesByRecordId.keys()].map(
        (id) =>
          indexMatches.find((match) => String(match.recordId) === id).recordId
      ),
    };
  }

  const records = await db
    .collection(COLLECTIONS.records)
    .find(recordFilter)
    .toArray();
  const scoredResults = records
    .map((record) => {
      const scoring = scoreRecord(
        record,
        matchesByRecordId.get(String(record._id)) || [],
        rankingProfile
      );

      return {
        record,
        ...scoring,
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        new Date(b.record.publishedAt) - new Date(a.record.publishedAt)
    );

  const total = scoredResults.length;
  const start = (page - 1) * limit;
  const results = scoredResults.slice(start, start + limit);

  await logSearchEvent(db, {
    query: options.q || "",
    tokens,
    filters: {
      category: options.category || "",
      source: options.source || "",
      tags: parseTagsFilter(options),
      from: options.from || "",
      to: options.to || "",
    },
    resultCount: total,
  });

  return {
    query: options.q || "",
    tokens,
    rankingProfile: {
      id: rankingProfile._id,
      name: rankingProfile.name,
      weights: rankingProfile.weights,
    },
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    results,
  };
}

export async function getAutocompleteSuggestions(db, queryPrefix, limit = 10) {
  const [prefix] = tokenize(queryPrefix || "");

  if (!prefix) {
    return [];
  }

  return db
    .collection(COLLECTIONS.searchIndex)
    .aggregate([
      {
        $match: {
          term: {
            $regex: `^${escapeRegex(prefix)}`,
          },
        },
      },
      {
        $group: {
          _id: "$term",
          frequency: { $sum: "$termFrequency" },
        },
      },
      { $sort: { frequency: -1, _id: 1 } },
      { $limit: Math.min(Math.max(Number(limit) || 10, 1), 20) },
      {
        $project: {
          _id: 0,
          term: "$_id",
          frequency: 1,
        },
      },
    ])
    .toArray();
}

function buildRecordFilter(options) {
  const filter = {};

  if (options.category) {
    filter.category = options.category;
  }

  if (options.source) {
    filter.source = options.source;
  }

  const tags = parseTagsFilter(options);

  if (tags.length === 1) {
    filter.tags = tags[0];
  } else if (tags.length > 1) {
    filter.tags = { $all: tags };
  }

  if (options.from || options.to) {
    filter.publishedAt = {};

    if (options.from) {
      filter.publishedAt.$gte = new Date(options.from);
    }

    if (options.to) {
      filter.publishedAt.$lte = new Date(options.to);
    }
  }

  return filter;
}

async function logSearchEvent(db, event) {
  await db.collection(COLLECTIONS.searchEvents).insertOne({
    ...event,
    createdAt: new Date(),
  });
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseTagsFilter(options) {
  const raw = options.tags ?? options.tag;

  if (!raw) {
    return [];
  }

  const tags = (Array.isArray(raw) ? raw : String(raw).split(","))
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set(tags)].slice(0, 3);
}
