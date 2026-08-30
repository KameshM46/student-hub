// Server-only MongoDB connection.
// Never import this from a route component or any file that ships to the
// client bundle.
import { MongoClient, type Db } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function connect(): Promise<MongoClient> {
  const uri = process.env["MONGODB_URI"];

  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI environment variable. Set it in your .env file.",
    );
  }

  return new MongoClient(uri, {
    family: 4,
    serverSelectionTimeoutMS: 10000,
  }).connect();
}

// Reuse one connection pool during development.
function getClientPromise(): Promise<MongoClient> {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = connect();
  }

  return global._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClientPromise();

  const dbName = process.env["MONGODB_DB"] || "studenthub";

  return client.db(dbName);
}