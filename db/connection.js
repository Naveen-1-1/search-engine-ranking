import "dotenv/config";
import { MongoClient, ServerApiVersion } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "searchx";

if (!uri) {
  throw new Error("MONGODB_URI is missing in .env");
}

const client = new MongoClient(uri, {
  // Reuse one MongoClient for the whole long-running Express process.
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db;

export async function connectToDb() {
  if (db) return db;

  await client.connect();
  db = client.db(dbName);

  console.log("Connected to MongoDB");
  return db;
}

export async function closeDb() {
  await client.close();
  db = undefined;
}
