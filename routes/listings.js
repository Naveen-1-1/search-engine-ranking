import express from "express";
import { connectToDb } from "../db/connection.js";

const router = express.Router();

router.get("/listings", async (req, res) => {
  try {
    const db = await connectToDb();
    const listings = await db.collection("listings").find({}).toArray();

    res.json(listings);
  } catch (err) {
    console.error("Failed to fetch listings:", err);
    res.status(500).json({ error: "Failed to fetch listings" });
  }
});

export default router;
