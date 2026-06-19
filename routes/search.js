import express from "express";
import { connectToDb } from "../db/connection.js";
import {
  getAutocompleteSuggestions,
  searchRecords,
} from "../services/search.js";

const router = express.Router();

router.get("/search", async (req, res, next) => {
  try {
    const db = await connectToDb();
    const results = await searchRecords(db, req.query);

    res.json(results);
  } catch (err) {
    next(err);
  }
});

router.get("/autocomplete", async (req, res, next) => {
  try {
    const db = await connectToDb();
    const suggestions = await getAutocompleteSuggestions(
      db,
      req.query.q,
      req.query.limit
    );

    res.json({ suggestions });
  } catch (err) {
    next(err);
  }
});

export default router;
