import mongoose from "mongoose";
import { env } from "./env";

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially.
 */
type MongooseGlobal = typeof globalThis & {
    mongoose?: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
};

const globalForMongoose = global as MongooseGlobal;
const cached = globalForMongoose.mongoose ?? (globalForMongoose.mongoose = { conn: null, promise: null });

export async function connectDB(): Promise<typeof mongoose> {
    const uri = env.MONGODB_URI;
    if (!uri || uri.startsWith("dev-placeholder-")) {
        throw new Error("Please define MONGODB_URI in .env.local");
    }
    if (cached.conn) return cached.conn;
    if (!cached.promise) {
        cached.promise = mongoose.connect(uri, {
            bufferCommands: false,
            serverSelectionTimeoutMS: 10000,
        });
    }
    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        // eslint-disable-next-line no-console
        console.error("[mongodb] Connection failed — verify MONGODB_URI and Atlas IP allowlist", e instanceof Error ? e.message : e);
        throw e;
    }
    return cached.conn;
}
