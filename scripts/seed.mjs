// scripts/seed.mjs
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Schema } from "mongoose";

dotenv.config({ path: ".env.local" });

const FORCE = process.argv.includes("--force");
let URI = process.env.MONGODB_URI;

if (!URI || URI.startsWith("dev-placeholder-")) {
  console.error("❌ MONGODB_URI not found or is a placeholder. Check .env.local");
  process.exit(1);
}

// Ensure the URI includes a database name
if (!URI.endsWith("/")) {
  URI = URI.replace(/\/?$/, "/");
}
if (URI.endsWith("/")) {
  URI = URI + "brpl";
}

console.log(`🔌 Connecting to MongoDB...`);
await mongoose.connect(URI, { bufferCommands: false, serverSelectionTimeoutMS: 10000 });
console.log(`✅ Connected. Force mode: ${FORCE}`);

// --------------- Schemas (inline — mirrors src/models/*) ---------------

const couponSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
  description: { type: String, trim: true },
  type: { type: String, enum: ["flat", "percent"], default: "percent" },
  amount: { type: Number, required: true, min: 0 },
  usageLimit: { type: Number, default: 0 },
  usedCount: { type: Number, default: 0 },
  minOrderAmount: { type: Number },
  active: { type: Boolean, default: true },
  source: { type: String, enum: ["manual", "referral"], default: "manual" },
  expiresAt: { type: Date },
}, { timestamps: true });

const referralSchema = new Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  couponId: { type: Schema.Types.ObjectId, ref: "Coupon", required: true },
  couponCode: { type: String, required: true, uppercase: true, trim: true },
  type: { type: String, enum: ["flat", "percent"], default: "percent" },
  amount: { type: Number, required: true, min: 0 },
  usageLimit: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  expiresAt: { type: Date },
  linkOpenCount: { type: Number, default: 0 },
  lastOpenedAt: { type: Date },
}, { timestamps: true });

const userSchema = new Schema({
  phone: { type: String, required: true, unique: true, match: /^\d{10}$/ },
  name: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  role: { type: String, enum: ["batsman", "bowler", "allrounder", "wicketkeeper"] },
  state: { type: String, trim: true },
  city: { type: String, trim: true },
  paymentStatus: { type: String, enum: ["pending", "completed"], default: "pending" },
  Trial_status: { type: String, enum: ["pending", "completed"], default: "pending" },
  paymentId: { type: String },
  orderId: { type: String },
  amount: { type: Number },
  couponId: { type: Schema.Types.ObjectId, ref: "Coupon" },
  couponCode: { type: String, uppercase: true, trim: true },
  couponDiscount: { type: Number },
  couponAppliedAt: { type: Date },
}, { timestamps: true });

const couponUsageSchema = new Schema({
  couponId: { type: Schema.Types.ObjectId, ref: "Coupon", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  code: { type: String, required: true },
  discountApplied: { type: Number, required: true },
  orderId: { type: String },
  usedAt: { type: Date, default: Date.now },
}, { timestamps: false });

const paymentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  paymentId: { type: String, required: true, unique: true },
  orderId: { type: String },
  amount: { type: Number, required: true },
  currency: { type: String, default: "INR" },
  status: { type: String, enum: ["created", "completed", "failed", "refunded"], default: "completed" },
  source: { type: String, enum: ["razorpay", "manual", "coupon"], default: "razorpay" },
  couponId: { type: Schema.Types.ObjectId, ref: "Coupon" },
  couponCode: { type: String, uppercase: true, trim: true },
  couponDiscount: { type: Number },
  method: { type: String },
}, { timestamps: true });

const Coupon = mongoose.model("Coupon", couponSchema);
const Referral = mongoose.model("Referral", referralSchema);
const User = mongoose.model("User", userSchema);
const CouponUsage = mongoose.model("CouponUsage", couponUsageSchema);
const Payment = mongoose.model("Payment", paymentSchema);

// --------------- Helpers ---------------

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

// --------------- Clear existing seed data ---------------

async function clearSeedData() {
  const seedPrefix = /^pay_seed_/;
  const payments = await Payment.deleteMany({ paymentId: seedPrefix });
  const usage = await CouponUsage.deleteMany({ orderId: /^seed_order_/ });
  const users = await User.deleteMany({ phone: /^90000000/ });
  const referrals = await Referral.deleteMany({ code: /^REF-/ });
  const coupons = await Coupon.deleteMany({ description: /^Seed:|^Referral:/ });
  console.log(`🧹 Cleared: ${coupons.deletedCount} coupons, ${referrals.deletedCount} referrals, ${users.deletedCount} users, ${usage.deletedCount} usage records, ${payments.deletedCount} payments`);
}

// --------------- Seed functions ---------------

async function seedCoupons() {
  const now = new Date();
  const manualCoupons = [
    { code: "WELCOME20",  description: "Seed: 20% off for new players",     type: "percent", amount: 20,  usageLimit: 100, usedCount: 2, minOrderAmount: 500,  active: true,  source: "manual", expiresAt: daysFromNow(90),  createdAt: daysAgo(60) },
    { code: "SUMMER50",   description: "Seed: Flat ₹500 off summer special", type: "flat",    amount: 500, usageLimit: 50,  usedCount: 1, minOrderAmount: 1000, active: true,  source: "manual", expiresAt: daysFromNow(30),  createdAt: daysAgo(45) },
    { code: "FLAT200",    description: "Seed: Flat ₹200 off",               type: "flat",    amount: 200, usageLimit: 30,  usedCount: 2, minOrderAmount: null, active: true,  source: "manual", expiresAt: daysFromNow(60),  createdAt: daysAgo(75) },
    { code: "EARLYBIRD",  description: "Seed: 15% early bird discount",     type: "percent", amount: 15,  usageLimit: 10,  usedCount: 0, minOrderAmount: 300,  active: true,  source: "manual", expiresAt: daysFromNow(30),  createdAt: daysAgo(50) },
    { code: "EXPIRED50",  description: "Seed: 50% off (expired)",           type: "percent", amount: 50,  usageLimit: 100, usedCount: 0, minOrderAmount: null, active: false, source: "manual", expiresAt: daysAgo(30),   createdAt: daysAgo(90) },
  ];

  const created = [];
  for (const data of manualCoupons) {
    const doc = await Coupon.create({ ...data, updatedAt: data.createdAt });
    created.push(doc);
    console.log(`  📦 Coupon ${doc.code}: ${doc._id}`);
  }
  return created;
}

async function seedReferrals() {
  const referralCouponsData = [
    { code: "REF-FRIEND10", description: "Referral: Sports Guru (9876543210)", type: "percent", amount: 10, usageLimit: 50, usedCount: 1, active: true, source: "referral", expiresAt: daysFromNow(180), createdAt: daysAgo(45) },
    { code: "REF-SOCIAL20", description: "Referral: Cricket Hub (8765432109)", type: "flat",    amount: 200, usageLimit: 50, usedCount: 1, active: true, source: "referral", expiresAt: daysFromNow(180), createdAt: daysAgo(30) },
  ];

  const referralDocs = [
    { name: "Sports Guru", phone: "9876543210", code: "REF-FRIEND10", type: "percent", amount: 10, usageLimit: 50, active: true, expiresAt: daysFromNow(180), linkOpenCount: 12, lastOpenedAt: daysAgo(1), createdAt: daysAgo(45) },
    { name: "Cricket Hub", phone: "8765432109", code: "REF-SOCIAL20", type: "flat",    amount: 200, usageLimit: 50, active: true, expiresAt: daysFromNow(180), linkOpenCount: 8,  lastOpenedAt: daysAgo(3), createdAt: daysAgo(30) },
  ];

  const coupons = [];
  const referrals = [];
  for (let i = 0; i < referralCouponsData.length; i++) {
    const cData = referralCouponsData[i];
    const coupon = await Coupon.create({ ...cData, updatedAt: cData.createdAt });
    coupons.push(coupon);

    const rData = referralDocs[i];
    const referral = await Referral.create({
      ...rData,
      couponId: coupon._id,
      couponCode: coupon.code,
      updatedAt: rData.createdAt,
    });
    referrals.push(referral);
    console.log(`  🔗 Referral ${referral.code} (coupon ${coupon.code}): ${referral._id}`);
  }
  return { coupons, referrals };
}

async function seedUsers(allCoupons) {
  const couponMap = new Map(allCoupons.map((c) => [c.code, c]));

  const usersData = [
    { name: "Rahul Sharma",   phone: "9000000001", email: "rahul.sharma@example.com",    role: "batsman",      state: "Maharashtra",  city: "Mumbai",     paymentStatus: "completed", Trial_status: "completed", couponCode: "WELCOME20",    amount: 1499, createdAt: daysAgo(28) },
    { name: "Priya Patel",    phone: "9000000002", email: "priya.patel@example.com",     role: "allrounder",   state: "Gujarat",      city: "Ahmedabad",  paymentStatus: "completed", Trial_status: "completed", couponCode: null,           amount: 1499, createdAt: daysAgo(21) },
    { name: "Amit Singh",     phone: "9000000003", email: "amit.singh@example.com",      role: "bowler",       state: "Uttar Pradesh", city: "Lucknow",    paymentStatus: "completed", Trial_status: "completed", couponCode: "SUMMER50",     amount: 999,  createdAt: daysAgo(14) },
    { name: "Sneha Verma",    phone: "9000000004", email: "sneha.verma@example.com",     role: "wicketkeeper", state: "Delhi",        city: "Delhi",      paymentStatus: "pending",   Trial_status: "pending",   couponCode: null,           amount: null, createdAt: daysAgo(7)  },
    { name: "Vikram Joshi",   phone: "9000000005", email: "vikram.joshi@example.com",    role: "batsman",      state: "Rajasthan",    city: "Jaipur",     paymentStatus: "completed", Trial_status: "completed", couponCode: "FLAT200",      amount: 1499, createdAt: daysAgo(3)  },
    { name: "Ananya Reddy",   phone: "9000000006", email: "ananya.reddy@example.com",    role: null,           state: "Telangana",    city: "Hyderabad",  paymentStatus: "pending",   Trial_status: "completed", couponCode: null,           amount: null, createdAt: daysAgo(2)  },
    { name: "Rohan Deshmukh", phone: "9000000007", email: "rohan.deshmukh@example.com",  role: "allrounder",   state: "Maharashtra",  city: "Pune",       paymentStatus: "completed", Trial_status: "completed", couponCode: "WELCOME20",    amount: 999,  createdAt: daysAgo(45) },
    { name: "Neha Kapoor",    phone: "9000000008", email: "neha.kapoor@example.com",     role: "bowler",       state: "Punjab",       city: "Chandigarh", paymentStatus: "pending",   Trial_status: "pending",   couponCode: null,           amount: null, createdAt: daysAgo(1)  },
    { name: "Arjun Nair",     phone: "9000000009", email: "arjun.nair@example.com",      role: "batsman",      state: "Kerala",       city: "Kochi",      paymentStatus: "completed", Trial_status: "completed", couponCode: "FLAT200",      amount: 1499, createdAt: daysAgo(60) },
    { name: "Divya Kaur",     phone: "9000000010", email: "divya.kaur@example.com",      role: null,           state: "Haryana",      city: "Gurugram",   paymentStatus: "pending",   Trial_status: "completed", couponCode: null,           amount: null, createdAt: daysAgo(10) },
    { name: "Karan Mehta",    phone: "9000000011", email: "karan.mehta@example.com",     role: "allrounder",   state: "Gujarat",      city: "Surat",      paymentStatus: "completed", Trial_status: "pending",   couponCode: "REF-FRIEND10", amount: 1499, createdAt: daysAgo(5)  },
    { name: "Pooja Iyer",     phone: "9000000012", email: "pooja.iyer@example.com",      role: "wicketkeeper", state: "Tamil Nadu",   city: "Chennai",    paymentStatus: "completed", Trial_status: "completed", couponCode: "REF-SOCIAL20", amount: 1499, createdAt: daysAgo(30) },
  ];

  const created = [];
  for (const data of usersData) {
    const coupon = data.couponCode ? couponMap.get(data.couponCode) : null;
    let discount = null;
    let appliedAt = null;
    if (coupon) {
      discount = coupon.type === "percent" ? Math.round((data.amount ?? 0) * coupon.amount / 100) : coupon.amount;
      appliedAt = data.createdAt;
    }

    const user = await User.create({
      phone: data.phone,
      name: data.name,
      email: data.email,
      role: data.role ?? undefined,
      state: data.state,
      city: data.city,
      paymentStatus: data.paymentStatus,
      Trial_status: data.Trial_status,
      amount: data.amount,
      couponId: coupon?._id,
      couponCode: coupon?.code,
      couponDiscount: discount,
      couponAppliedAt: appliedAt,
      createdAt: data.createdAt,
      updatedAt: data.createdAt,
    });
    created.push(user);
    console.log(`  👤 User ${user.name} (${user.phone}): ${user._id}`);
  }
  return created;
}

async function seedCouponUsage(users, allCoupons) {
  const couponMap = new Map(allCoupons.map((c) => [c.code, c]));
  const usageRecords = [];

  // Map each user with a coupon to a usage record
  const couponUsers = users.filter((u) => u.couponCode);
  let orderIdx = 1;
  for (const user of couponUsers) {
    const coupon = couponMap.get(user.couponCode);
    if (!coupon) continue;
    const discount = user.couponDiscount ?? 0;
    usageRecords.push({
      couponId: coupon._id,
      userId: user._id,
      code: coupon.code,
      discountApplied: discount,
      orderId: `seed_order_${String(orderIdx).padStart(2, "0")}`,
      usedAt: user.couponAppliedAt ?? user.createdAt,
    });
    orderIdx++;
  }

  const created = await CouponUsage.insertMany(usageRecords);
  for (const doc of created) {
    console.log(`  📋 Usage ${doc.code} for user ${doc.userId}: ${doc._id}`);
  }
  return created;
}

async function seedPayments(users) {
  const paidUsers = users.filter((u) => u.paymentStatus === "completed" && u.amount != null);
  const paymentRecords = [];

  for (let i = 0; i < paidUsers.length; i++) {
    const user = paidUsers[i];
    const paymentId = `pay_seed_fake_${String(i + 1).padStart(2, "0")}`;
    const discount = user.couponDiscount ?? 0;
    paymentRecords.push({
      userId: user._id,
      paymentId,
      orderId: user.couponCode ? `seed_order_${String(i + 1).padStart(2, "0")}` : undefined,
      amount: user.amount,
      currency: "INR",
      status: "completed",
      source: user.couponCode ? "coupon" : "manual",
      couponId: user.couponId,
      couponCode: user.couponCode,
      couponDiscount: discount,
      method: "razorpay",
      createdAt: user.createdAt,
      updatedAt: user.createdAt,
    });
  }

  const created = [];
  for (const data of paymentRecords) {
    const doc = await Payment.create(data);
    created.push(doc);
    console.log(`  💰 Payment ${doc.paymentId}: ₹${doc.amount} (${doc._id})`);
  }
  return created;
}

// --------------- Main ---------------

async function main() {
  const skipExisting = !FORCE && (await Coupon.countDocuments({ source: "manual" })) >= 5;
  if (skipExisting) {
    console.log("ℹ️  Seed data already exists. Use --force to re-seed.");
    await mongoose.disconnect();
    return;
  }

  if (FORCE) {
    await clearSeedData();
  }

  console.log("\n📦 Creating coupons...");
  const manualCoupons = await seedCoupons();

  console.log("\n🔗 Creating referral coupons + referrals...");
  const { coupons: referralCoupons, referrals } = await seedReferrals();

  const allCoupons = [...manualCoupons, ...referralCoupons];

  console.log("\n👤 Creating users...");
  const users = await seedUsers(allCoupons);

  console.log("\n📋 Creating coupon usage records...");
  await seedCouponUsage(users, allCoupons);

  console.log("\n💰 Creating payment records...");
  await seedPayments(users);

  // Summary
  const counts = {
    Coupons: await Coupon.countDocuments({}),
    Referrals: await Referral.countDocuments({}),
    Users: await User.countDocuments({}),
    "Coupon Usage": await CouponUsage.countDocuments({}),
    Payments: await Payment.countDocuments({}),
  };
  console.log("\n✅ Seeding complete!");
  console.table(counts);

  await mongoose.disconnect();
  console.log("🔌 Disconnected.");
}

await main();
