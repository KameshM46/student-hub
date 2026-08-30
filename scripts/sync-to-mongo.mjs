#!/usr/bin/env node
/**
 * Sync Campus Portal data into MongoDB Atlas (browsable in MongoDB Compass).
 *
 * Run this on your own machine — MongoDB needs a raw TCP connection, which the
 * hosted app runtime cannot open, but your laptop and Compass can.
 *
 * One-time setup:
 *   1) npm install mongodb
 *   2) Copy your Atlas connection string from Compass ("Connect").
 *
 * Usage (PowerShell / bash):
 *   MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net" \
 *   PORTAL_URL="https://your-app.lovable.app" \
 *   MONGO_SYNC_TOKEN="<the token stored in your app secrets>" \
 *   node scripts/sync-to-mongo.mjs
 *
 * Re-run it any time (or from Task Scheduler / cron) to refresh Atlas.
 */
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const portalUrl = process.env.PORTAL_URL;
const token = process.env.MONGO_SYNC_TOKEN;
const dbName = process.env.MONGODB_DB || "campus_portal";

for (const [name, value] of Object.entries({ MONGODB_URI: uri, PORTAL_URL: portalUrl, MONGO_SYNC_TOKEN: token })) {
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

const endpoint = new URL("/api/public/mongo-export", portalUrl).toString();
const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` } });

if (!response.ok) {
  console.error(`Export failed (${response.status}): ${await response.text()}`);
  process.exit(1);
}

const { exported_at, collections } = await response.json();
const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(dbName);

  for (const [name, docs] of Object.entries(collections)) {
    const collection = db.collection(name);
    if (!docs.length) {
      console.log(`${name}: nothing to sync`);
      continue;
    }
    const operations = docs.map((doc) => ({
      replaceOne: {
        filter: { _id: doc.id },
        replacement: { ...doc, _id: doc.id, synced_at: exported_at },
        upsert: true,
      },
    }));
    const result = await collection.bulkWrite(operations, { ordered: false });
    console.log(`${name}: ${result.upsertedCount} added, ${result.modifiedCount} updated`);
  }

  console.log(`\nDone. Open "${dbName}" in MongoDB Compass to browse the data.`);
} finally {
  await client.close();
}
