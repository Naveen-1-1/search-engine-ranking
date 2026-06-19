import express from "express";
import { connectToDb } from "../db/connection.js";
import {
  createRecord,
  deleteRecord,
  getRecordByIdentifier,
  listRecords,
  updateRecord,
} from "../services/records.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const db = await connectToDb();
    const records = await listRecords(db, req.query);

    res.json(records);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const db = await connectToDb();
    const record = await getRecordByIdentifier(db, req.params.id);

    if (!record) {
      res.status(404).json({ error: "Record not found" });
      return;
    }

    res.json(record);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const db = await connectToDb();
    const record = await createRecord(db, req.body);

    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const db = await connectToDb();
    const record = await updateRecord(db, req.params.id, req.body);

    if (!record) {
      res.status(404).json({ error: "Record not found" });
      return;
    }

    res.json(record);
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const db = await connectToDb();
    const record = await deleteRecord(db, req.params.id);

    if (!record) {
      res.status(404).json({ error: "Record not found" });
      return;
    }

    res.json({ deletedRecord: record });
  } catch (err) {
    next(err);
  }
});

export default router;
