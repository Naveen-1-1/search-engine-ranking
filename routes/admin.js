import express from "express";
import { connectToDb } from "../db/connection.js";
import { getAppMetrics } from "../services/metrics.js";
import {
  createRankingProfile,
  deleteRankingProfile,
  listRankingProfiles,
  updateRankingProfile,
} from "../services/rankingProfiles.js";
import { rebuildSearchIndex } from "../services/indexer.js";

const router = express.Router();

router.post("/admin/reindex", async (req, res, next) => {
  try {
    const db = await connectToDb();
    const result = await rebuildSearchIndex(db);

    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/metrics", async (req, res, next) => {
  try {
    const db = await connectToDb();
    const metrics = await getAppMetrics(db);

    res.json(metrics);
  } catch (err) {
    next(err);
  }
});

router.get("/ranking-profiles", async (req, res, next) => {
  try {
    const db = await connectToDb();
    const profiles = await listRankingProfiles(db);

    res.json({ profiles });
  } catch (err) {
    next(err);
  }
});

router.post("/ranking-profiles", async (req, res, next) => {
  try {
    const db = await connectToDb();
    const profile = await createRankingProfile(db, req.body);

    res.status(201).json(profile);
  } catch (err) {
    next(err);
  }
});

router.put("/ranking-profiles/:id", async (req, res, next) => {
  try {
    const db = await connectToDb();
    const profile = await updateRankingProfile(db, req.params.id, req.body);

    if (!profile) {
      res.status(404).json({ error: "Ranking profile not found" });
      return;
    }

    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.delete("/ranking-profiles/:id", async (req, res, next) => {
  try {
    const db = await connectToDb();
    const profile = await deleteRankingProfile(db, req.params.id);

    if (!profile) {
      res.status(404).json({ error: "Ranking profile not found" });
      return;
    }

    res.json({ deletedProfile: profile });
  } catch (err) {
    next(err);
  }
});

export default router;
