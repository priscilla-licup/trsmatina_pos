import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable in .env.local");
}

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// Initialize the global cache if it doesn't exist yet
if (!global.mongooseCache) {
  global.mongooseCache = { conn: null, promise: null };
}

const cached = global.mongooseCache as MongooseCache;

export async function connectToDatabase() {
  // If we already have a live connection, just reuse it
  if (cached.conn) {
    return cached.conn;
  }

  // Otherwise, if a connection is in progress, reuse that promise
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI);
  }

  // Wait for the connection to resolve and cache it
  cached.conn = await cached.promise;
  return cached.conn;
}
