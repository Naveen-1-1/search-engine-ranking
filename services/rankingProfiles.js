import { ObjectId } from "mongodb";
import { COLLECTIONS } from "../db/collections.js";
import { DEFAULT_WEIGHTS, normalizeWeights } from "./scorer.js";

const DEFAULT_PROFILES = [
  {
    name: "Default",
    description: "Balanced relevance, popularity, and freshness.",
    weights: DEFAULT_WEIGHTS,
    isActive: true,
  },
  {
    name: "Title Heavy",
    description: "Prioritizes records where query terms appear in the title.",
    weights: {
      ...DEFAULT_WEIGHTS,
      title: 8,
      body: 1,
      recency: 1,
    },
    isActive: false,
  },
  {
    name: "Fresh Content",
    description: "Gives newer records a stronger boost.",
    weights: {
      ...DEFAULT_WEIGHTS,
      title: 4,
      popularity: 1,
      recency: 5,
    },
    isActive: false,
  },
];

export async function ensureDefaultRankingProfiles(db) {
  const profiles = db.collection(COLLECTIONS.rankingProfiles);
  const existingCount = await profiles.countDocuments();

  if (existingCount === 0) {
    const now = new Date();
    await profiles.insertMany(
      DEFAULT_PROFILES.map((profile) => ({
        ...profile,
        createdAt: now,
        updatedAt: now,
      }))
    );
  }
}

export async function getActiveRankingProfile(db) {
  await ensureDefaultRankingProfiles(db);

  const profiles = db.collection(COLLECTIONS.rankingProfiles);
  const activeProfile = await profiles.findOne({ isActive: true });

  if (activeProfile) {
    return activeProfile;
  }

  await profiles.updateOne({ name: "Default" }, { $set: { isActive: true } });
  return profiles.findOne({ name: "Default" });
}

export async function listRankingProfiles(db) {
  await ensureDefaultRankingProfiles(db);

  return db
    .collection(COLLECTIONS.rankingProfiles)
    .find({})
    .sort({ isActive: -1, name: 1 })
    .toArray();
}

export async function createRankingProfile(db, input) {
  const now = new Date();
  const profile = normalizeProfileInput(input, now);
  const profiles = db.collection(COLLECTIONS.rankingProfiles);

  if (profile.isActive) {
    await profiles.updateMany({}, { $set: { isActive: false } });
  }

  const result = await profiles.insertOne(profile);
  return profiles.findOne({ _id: result.insertedId });
}

export async function updateRankingProfile(db, id, input) {
  const _id = parseObjectId(id);
  const profiles = db.collection(COLLECTIONS.rankingProfiles);
  const update = normalizeProfileUpdate(input);

  if (update.isActive) {
    await profiles.updateMany(
      { _id: { $ne: _id } },
      { $set: { isActive: false } }
    );
  }

  await profiles.updateOne({ _id }, { $set: update });
  return profiles.findOne({ _id });
}

export async function deleteRankingProfile(db, id) {
  const _id = parseObjectId(id);
  const profiles = db.collection(COLLECTIONS.rankingProfiles);
  const profile = await profiles.findOne({ _id });

  if (!profile) {
    return null;
  }

  if (profile.isActive) {
    throw new Error("The active ranking profile cannot be deleted.");
  }

  await profiles.deleteOne({ _id });
  return profile;
}

function normalizeProfileInput(input, now = new Date()) {
  const name = String(input.name || "").trim();

  if (!name) {
    throw new Error("Ranking profile name is required.");
  }

  return {
    name,
    description: String(input.description || "").trim(),
    weights: normalizeWeights(input.weights),
    isActive: Boolean(input.isActive),
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeProfileUpdate(input) {
  const update = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) {
    const name = String(input.name).trim();

    if (!name) {
      throw new Error("Ranking profile name is required.");
    }

    update.name = name;
  }

  if (input.description !== undefined) {
    update.description = String(input.description || "").trim();
  }

  if (input.weights !== undefined) {
    update.weights = normalizeWeights(input.weights);
  }

  if (input.isActive !== undefined) {
    update.isActive = Boolean(input.isActive);
  }

  return update;
}

function parseObjectId(id) {
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid ranking profile ID.");
  }

  return new ObjectId(id);
}
