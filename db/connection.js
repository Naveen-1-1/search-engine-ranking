import 'dotenv/config';
import { MongoClient, ServerApiVersion } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('MONGODB_URI is missing in .env');
}

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    await client.db('admin').command({ ping: 1 });

    console.log('Successfully connected to MongoDB!');
  } catch (err) {
    console.error('MongoDB connection failed:', err);
  } finally {
    await client.close();
  }
}

run();
