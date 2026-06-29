import mongoose from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) { console.error("MONGODB_URI not set"); process.exit(1); }

await mongoose.connect(uri);
const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }));

// Find or create a test user
let user = await User.findOne({ phone: "9999999999" });
if (!user) {
    user = await User.create({
        phone: "9999999999",
        name: "Test Player",
        email: "test@Brpl.net",
        role: "batsman",
        state: "Maharashtra",
        city: "Mumbai",
        paymentStatus: "completed",
        paymentId: "pay_TEST123",
        orderId: "order_TEST123",
        amount: 1499,
    });
    console.log("Created test user:", user._id.toString());
} else {
    console.log("Test user already exists:", user._id.toString());
}

await mongoose.disconnect();
