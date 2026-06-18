import express from "express";
import listings from "./listings.json" with { type: "json" };

const router = express.Router();

router.get("/listings", (req, res) => {
  res.json(listings);
});

export default router;