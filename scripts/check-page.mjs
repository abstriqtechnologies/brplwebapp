import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { MongoClient } from "mongodb";
const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db();
const page = await db.collection("sitepages").findOne({ key: "home" });
console.log(JSON.stringify(page, null, 2));
await client.close();