/**
 * One-shot migration: rewrite SiteSettings rows whose headerCtaLink or
 * floatingRegisterLink is the old "/registration" path to point at "/login".
 *
 * Idempotent: only touches rows that match. Safe to re-run.
 *
 * Run with: npx tsx scripts/migrate-registration-links.ts
 */
import { connectDB } from "../src/lib/mongodb";
import SiteSettings from "../src/models/SiteSettings";

const NEW = "/login";
const OLD = "/registration";

async function main() {
    await connectDB();

    const filter = {
        $or: [{ headerCtaLink: OLD }, { floatingRegisterLink: OLD }],
    };

    const before = await SiteSettings.find(filter).select("_id headerCtaLink floatingRegisterLink").lean();
    console.log(`Found ${before.length} row(s) with ${OLD}:`);
    for (const row of before) {
        console.log(`  _id=${row._id} headerCtaLink=${row.headerCtaLink} floatingRegisterLink=${row.floatingRegisterLink}`);
    }

    if (before.length === 0) {
        console.log("Nothing to update.");
        return;
    }

    const result = await SiteSettings.updateMany(filter, [
        {
            $set: {
                headerCtaLink: {
                    $cond: [{ $eq: ["$headerCtaLink", OLD] }, NEW, "$headerCtaLink"],
                },
                floatingRegisterLink: {
                    $cond: [{ $eq: ["$floatingRegisterLink", OLD] }, NEW, "$floatingRegisterLink"],
                },
            },
        },
    ]);

    console.log(`Updated ${result.modifiedCount} row(s).`);

    const after = await SiteSettings.find(filter).select("_id headerCtaLink floatingRegisterLink").lean();
    console.log(`Rows still matching ${OLD}: ${after.length}`);
}

main()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Migration failed:", err);
        process.exit(1);
    });
