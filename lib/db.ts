import "server-only";
import { MongoClient, type Db } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var _haliMongoClient: MongoClient | undefined;
  // eslint-disable-next-line no-var
  var _haliMongoConnect: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "hali";

if (!uri) {
  throw new Error("MONGODB_URI is not set. Copy atlas-credentials.env → .env.local.");
}

// Timeouts sized for Atlas Free/Shared clusters, which routinely take 8–15s
// to complete initial topology discovery after being idle. The prior 5s
// budget produced repeated MongoServerSelectionError bursts on cold start.
const client =
  globalThis._haliMongoClient ??
  new MongoClient(uri, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 20000,
    connectTimeoutMS: 20000,
    socketTimeoutMS: 30000,
    retryReads: true,
    retryWrites: true,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis._haliMongoClient = client;
}

async function connect(): Promise<MongoClient> {
  if (!globalThis._haliMongoConnect) {
    // If connect rejects, clear the cache so the next request can retry
    // instead of forever awaiting the same failed promise.
    globalThis._haliMongoConnect = client.connect().catch((err) => {
      globalThis._haliMongoConnect = undefined;
      throw err;
    });
  }
  return globalThis._haliMongoConnect;
}

// Eagerly kick off topology discovery at module load so the first HTTP
// request doesn't pay the full cold-start latency. Failures are swallowed
// here — the next getDb() call will surface them and retry.
void connect().catch(() => {});

export async function getDb(): Promise<Db> {
  const c = await connect();
  return c.db(dbName);
}
