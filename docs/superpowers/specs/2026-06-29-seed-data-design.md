# Seed Data Script — Design Spec

## Purpose
A one-shot script (`scripts/seed.mjs`) that populates the BRPL admin panel with realistic dummy data for **Users (Players)**, **Coupons**, **Referrals**, **CouponUsage**, and **Payments**, spanning backdated dates so the admin dashboard, players table, coupons page, and referrals page are non-empty and usable for development/demo.

## Approach
Hybrid Mongoose script (Approach 3 — recommended). Connects directly to MongoDB, uses the real models via `mongoose.models` lookup, and freely sets `createdAt`/`usedAt`/`couponAppliedAt` on any document to create backdated records. Follows the existing `scripts/create-test-user.mjs` pattern.

## Data Plan

### Coupons (5 manual + 2 referral-linked)
Manual coupons are created first so users and referrals can reference them.

| Code        | Type    | Value  | Usage Limit | Used | Active | Min Order | Expires        | Source   |
|-------------|---------|--------|-------------|------|--------|-----------|----------------|----------|
| WELCOME20   | percent | 20%    | 100         | 2    | ✅     | ₹500      | +3 months      | manual   |
| SUMMER50    | flat    | ₹500   | 50          | 1    | ✅     | ₹1000     | +1 month       | manual   |
| FLAT200     | flat    | ₹200   | 30          | 2    | ✅     | —         | +2 months      | manual   |
| EARLYBIRD   | percent | 15%    | 10          | 0    | ✅     | ₹300      | +1 month       | manual   |
| EXPIRED50   | percent | 50%    | 100         | 0    | ❌     | —         | 30 days ago    | manual   |
| REF-FRIEND10| percent | 10%    | 50          | 1    | ✅     | —         | +6 months      | referral |
| REF-SOCIAL20| flat    | ₹200   | 50          | 1    | ✅     | —         | +6 months      | referral |

### Referrals (2 — each linked to its coupon above)
| Influencer    | Phone       | Code          | Coupon        | Type    | Amount | Usage Limit | Active | Created       |
|---------------|-------------|---------------|---------------|---------|--------|-------------|--------|---------------|
| Sports Guru   | 9876543210  | REF-FRIEND10  | REF-FRIEND10  | percent | 10     | 50          | ✅     | 45 days ago   |
| Cricket Hub   | 8765432109  | REF-SOCIAL20  | REF-SOCIAL20  | flat    | 200    | 50          | ✅     | 30 days ago   |

### Users (12 players spanning 3 months back)
User `createdAt` is backdated to create a realistic time spread. Coupon/payment fields are aligned to the coupon's `_id` for referential integrity.

| # | Name           | Phone       | State        | City          | Role          | Payment  | Trial | Coupon        | Created       | Amount |
|---|----------------|-------------|--------------|---------------|---------------|----------|-------|---------------|---------------|--------|
| 1 | Rahul Sharma   | 9000000001  | Maharashtra  | Mumbai        | Batsman       | Paid     | Done  | WELCOME20     | 28 days ago   | 1499   |
| 2 | Priya Patel    | 9000000002  | Gujarat      | Ahmedabad     | All-Rounder   | Paid     | Done  | —             | 21 days ago   | 1499   |
| 3 | Amit Singh     | 9000000003  | Uttar Pradesh| Lucknow       | Bowler        | Paid     | Done  | SUMMER50      | 14 days ago   | 999    |
| 4 | Sneha Verma    | 9000000004  | Delhi        | Delhi         | Wicket-Keeper | Pending  | —     | —             | 7 days ago    | —      |
| 5 | Vikram Joshi   | 9000000005  | Rajasthan    | Jaipur        | Batsman       | Paid     | Done  | FLAT200       | 3 days ago    | 1499   |
| 6 | Ananya Reddy   | 9000000006  | Telangana    | Hyderabad     | —             | Pending  | Done  | —             | 2 days ago    | —      |
| 7 | Rohan Deshmukh | 9000000007  | Maharashtra  | Pune          | All-Rounder   | Paid     | Done  | WELCOME20     | 45 days ago   | 999    |
| 8 | Neha Kapoor    | 9000000008  | Punjab       | Chandigarh    | Bowler        | Pending  | —     | —             | 1 day ago     | —      |
| 9 | Arjun Nair     | 9000000009  | Kerala       | Kochi         | Batsman       | Paid     | Done  | FLAT200       | 60 days ago   | 1499   |
|10 | Divya Kaur     | 9000000010  | Haryana      | Gurugram      | —             | Pending  | Done  | —             | 10 days ago   | —      |
|11 | Karan Mehta    | 9000000011  | Gujarat      | Surat         | All-Rounder   | Paid     | —     | REF-FRIEND10  | 5 days ago    | 1499   |
|12 | Pooja Iyer     | 9000000012  | Tamil Nadu   | Chennai       | Wicket-Keeper | Paid     | Done  | REF-SOCIAL20  | 30 days ago   | 1499   |

### CouponUsage Records (one per user who used a coupon)
| User            | Coupon        | Discount Applied | Used At           |
|-----------------|---------------|------------------|-------------------|
| Rahul Sharma    | WELCOME20     | 300 (20% of 1499)| 28 days ago       |
| Amit Singh      | SUMMER50      | 500              | 14 days ago       |
| Vikram Joshi    | FLAT200       | 200              | 3 days ago        |
| Rohan Deshmukh  | WELCOME20     | 200 (20% of 999) | 45 days ago       |
| Arjun Nair      | FLAT200       | 200              | 60 days ago       |
| Karan Mehta     | REF-FRIEND10  | 150 (10% of 1499)| 5 days ago        |
| Pooja Iyer      | REF-SOCIAL20  | 200              | 30 days ago       |

### Payments (one per paid user)
| User            | Amount | Coupon Discount | Payment ID          | Status    | Source     | Created       |
|-----------------|--------|-----------------|---------------------|-----------|------------|---------------|
| Rahul Sharma    | 1499   | 300             | pay_seed_fake_01    | completed | coupon     | 28 days ago   |
| Priya Patel     | 1499   | 0               | pay_seed_fake_02    | completed | manual     | 21 days ago   |
| Amit Singh      | 999    | 500             | pay_seed_fake_03    | completed | coupon     | 14 days ago   |
| Vikram Joshi    | 1499   | 200             | pay_seed_fake_04    | completed | coupon     | 3 days ago    |
| Rohan Deshmukh  | 999    | 200             | pay_seed_fake_05    | completed | coupon     | 45 days ago   |
| Arjun Nair      | 1499   | 200             | pay_seed_fake_06    | completed | coupon     | 60 days ago   |
| Karan Mehta     | 1499   | 150             | pay_seed_fake_07    | completed | coupon     | 5 days ago    |
| Pooja Iyer      | 1499   | 200             | pay_seed_fake_08    | completed | coupon     | 30 days ago   |

## Script Architecture

```
scripts/seed.mjs
├── 1. Parse CLI args (--force flag)
├── 2. Connect to MongoDB
├── 3. If --force, clear existing seed data (by seeded-id-prefix markers)
├── 4. Create manual coupons (backdated createdAt)
├── 5. Create referral coupons + referrals (backdated createdAt)
├── 6. Create users (backdated createdAt, link to coupons/referrals)
├── 7. Create coupon usage records (backdated usedAt)
├── 8. Create payment records (backdated createdAt)
├── 9. Verify: log summary of each collection's new count
└── 10. Disconnect
```

### Idempotency
The script uses a deterministic `_id` scheme with recognizable markers so `--force` can target only seed-created documents. On re-run without `--force`, seed data is skipped if already present. This prevents accidental double-insertion while allowing incremental updates.

### Running
```bash
node scripts/seed.mjs            # insert seed data
node scripts/seed.mjs --force    # clear + re-insert
```

### Dependencies
- `dotenv` (already in devDependencies) — load .env.local
- `mongoose` (already in dependencies) — MongoDB ODM
- Models: `User`, `Coupon`, `Referral`, `CouponUsage`, `Payment`

## Edge Cases / Notes
- The `phone` field on users must be unique — seed phones use `9000000001..0012` range.
- Coupon codes are uppercase-unique — codes are designed not to collide.
- Referral `code` is uppercase-unique — same design.
- Backdated `CouponUsage` records do NOT use `timestamps: false` in the schema (it's already `{ timestamps: false }`), so `createdAt` must be set via `new CouponUsage({...})` + `$__` bypass or raw `insertMany`.
- The `User.couponId` field links to the Coupon `_id` — must be a real ObjectId.
- Payment `orderId` is indexed but not unique — duplicates are fine.
- All `paymentId` values use a clear `pay_seed_*` prefix for identification.
