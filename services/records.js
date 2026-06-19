import { ObjectId } from "mongodb";
import { COLLECTIONS } from "../db/collections.js";
import { indexRecord, removeRecordFromIndex } from "./indexer.js";

const VALID_STATUSES = new Set(["published", "draft", "archived"]);

export async function listRecords(db, options = {}) {
  const page = Math.max(Number(options.page) || 1, 1);
  const limit = Math.min(Math.max(Number(options.limit) || 25, 1), 100);
  const skip = (page - 1) * limit;
  const filter = buildRecordFilter(options);
  const records = db.collection(COLLECTIONS.records);
  const [items, total] = await Promise.all([
    records
      .find(filter)
      .sort({ publishedAt: -1, title: 1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    records.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

export async function getRecordByIdentifier(db, identifier) {
  return db
    .collection(COLLECTIONS.records)
    .findOne(buildIdentifierFilter(identifier));
}

export async function createRecord(db, input) {
  const now = new Date();
  const record = normalizeRecordInput(input, { now, partial: false });
  const records = db.collection(COLLECTIONS.records);
  const result = await records.insertOne(record);
  const createdRecord = await records.findOne({ _id: result.insertedId });

  await indexRecord(db, createdRecord);
  return createdRecord;
}

export async function updateRecord(db, identifier, input) {
  const records = db.collection(COLLECTIONS.records);
  const filter = buildIdentifierFilter(identifier);
  const existingRecord = await records.findOne(filter);

  if (!existingRecord) {
    return null;
  }

  const update = normalizeRecordInput(input, {
    now: new Date(),
    partial: true,
    existingRecord,
  });

  await records.updateOne({ _id: existingRecord._id }, { $set: update });

  const updatedRecord = await records.findOne({ _id: existingRecord._id });
  await removeRecordFromIndex(db, updatedRecord._id);
  await indexRecord(db, updatedRecord);

  return updatedRecord;
}

export async function deleteRecord(db, identifier) {
  const records = db.collection(COLLECTIONS.records);
  const filter = buildIdentifierFilter(identifier);
  const record = await records.findOne(filter);

  if (!record) {
    return null;
  }

  await records.deleteOne({ _id: record._id });
  await removeRecordFromIndex(db, record._id);
  return record;
}

export function normalizeSeedRecord(input) {
  return normalizeRecordInput(input, {
    now: new Date(),
    partial: false,
    seedMode: true,
  });
}

function normalizeRecordInput(input, options) {
  const now = options.now || new Date();
  const output = {
    updatedAt: now,
  };

  assignString(output, input, "title", options.partial);
  assignString(output, input, "summary", options.partial);
  assignString(output, input, "body", options.partial);
  assignString(output, input, "category", options.partial);
  assignString(output, input, "source", options.partial);
  assignString(output, input, "author", true);
  assignString(output, input, "sourceUrl", true);

  if (
    input.externalId !== undefined &&
    input.externalId !== null &&
    input.externalId !== ""
  ) {
    output.externalId = Number(input.externalId);
  }

  if (
    input.tags !== undefined ||
    input.tag1 !== undefined ||
    !options.partial
  ) {
    output.tags = normalizeTags(input);
  }

  if (input.status !== undefined || !options.partial) {
    output.status = normalizeStatus(input.status);
  }

  if (input.publishedAt !== undefined || !options.partial) {
    output.publishedAt = normalizeDate(input.publishedAt);
  }

  if (input.popularity !== undefined || !options.partial) {
    output.popularity = normalizeNumber(input.popularity, 0, 1000);
  }

  if (input.readingMinutes !== undefined || !options.partial) {
    output.readingMinutes = normalizeNumber(input.readingMinutes, 1, 60);
  }

  if (!options.partial) {
    output.createdAt = now;
  }

  const slugSource = output.title || options.existingRecord?.title;
  const slugSuffix =
    output.externalId || options.existingRecord?.externalId || Date.now();

  if (
    slugSource &&
    (!options.partial ||
      input.title !== undefined ||
      input.externalId !== undefined)
  ) {
    output.slug = createSlug(slugSource, slugSuffix);
  }

  return output;
}

function buildRecordFilter(options) {
  const filter = {};

  if (options.status) {
    filter.status = options.status;
  }

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

  for (const field of ["title", "summary", "body", "author", "sourceUrl"]) {
    const value = String(options[field] ?? "").trim();

    if (value) {
      filter[field] = { $regex: escapeRegex(value), $options: "i" };
    }
  }

  if (options.popularity !== undefined && options.popularity !== "") {
    filter.popularity = Number(options.popularity);
  }

  if (options.readingMinutes !== undefined && options.readingMinutes !== "") {
    filter.readingMinutes = Number(options.readingMinutes);
  }

  if (options.publishedAt) {
    const dayStart = new Date(options.publishedAt);
    const dayEnd = new Date(options.publishedAt);

    dayStart.setUTCHours(0, 0, 0, 0);
    dayEnd.setUTCHours(23, 59, 59, 999);
    filter.publishedAt = { $gte: dayStart, $lte: dayEnd };
  } else if (options.from || options.to) {
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

function parseTagsFilter(options) {
  const raw = options.tags ?? options.tag;

  if (!raw) {
    return [];
  }

  const tags = (Array.isArray(raw) ? raw : String(raw).split(","))
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);

  return [...new Set(tags)];
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildIdentifierFilter(identifier) {
  if (ObjectId.isValid(identifier)) {
    return { _id: new ObjectId(identifier) };
  }

  const numericIdentifier = Number(identifier);

  if (Number.isInteger(numericIdentifier)) {
    return { externalId: numericIdentifier };
  }

  return { slug: String(identifier) };
}

function assignString(output, input, field, optional) {
  if (input[field] === undefined) {
    if (!optional) {
      throw new Error(`${field} is required.`);
    }

    return;
  }

  const value = String(input[field] || "").trim();

  if (!value && !optional) {
    throw new Error(`${field} is required.`);
  }

  output[field] = value;
}

function normalizeTags(input) {
  const tags = Array.isArray(input.tags)
    ? input.tags
    : String(input.tags || "")
        .split(",")
        .map((tag) => tag.trim());

  [input.tag1, input.tag2, input.tag3].forEach((tag) => {
    if (tag) {
      tags.push(tag);
    }
  });

  return [
    ...new Set(
      tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean)
    ),
  ];
}

function normalizeStatus(status) {
  const normalizedStatus = String(status || "published").toLowerCase();

  if (!VALID_STATUSES.has(normalizedStatus)) {
    throw new Error("Status must be published, draft, or archived.");
  }

  return normalizedStatus;
}

function normalizeDate(value) {
  const date = value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    throw new Error("publishedAt must be a valid date.");
  }

  return date;
}

function normalizeNumber(value, min, max) {
  const number = Number(value ?? min);

  if (Number.isNaN(number)) {
    return min;
  }

  return Math.max(min, Math.min(number, max));
}

function createSlug(title, suffix) {
  const slugBase = String(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 70);

  return `${slugBase}-${suffix}`;
}
