import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { MongoClient } from "mongodb";
const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db();
const docs = await db.collection("otprecords").find().sort({ createdAt: -1 }).limit(2).toArray();
console.log(JSON.stringify(docs, null, 2));
await client.close();