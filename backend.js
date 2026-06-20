import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import adminRouter from "./routes/admin.js";
import recordsRouter from "./routes/records.js";
import searchRouter from "./routes/search.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("Initializing the backend...");
const PORT = process.env.PORT || 3000;

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json({ limit: "1mb" }));
app.use(express.static("frontend"));
app.use("/favicon", express.static(path.join(__dirname, "assets/favicon")));
app.get("/favicon.ico", (_req, res) => {
  res.sendFile(path.join(__dirname, "assets/favicon/favicon.ico"));
});

app.use("/api/records", recordsRouter);
app.use("/api", searchRouter);
app.use("/api", adminRouter);

app.use((err, req, res, next) => {
  void req;
  void next;

  const status = err.message?.includes("not be deleted") ? 400 : 500;

  console.error(err);
  res.status(status).json({
    error: err.message || "Unexpected server error",
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
