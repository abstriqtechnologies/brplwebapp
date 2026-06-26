# End-to-End Tests

Playwright-driven tests that exercise the full registration flow against a real Razorpay test-mode order.

## Prerequisites

- Dev server can boot: `npm run dev` works on port 3000.
- `.env.local` has `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` (real test-mode keys, present in `.env.example`).
- MongoDB is reachable at `MONGODB_URI`. The test uses a real phone number; reset the user record before each run.

## Running

```bash
npm run test:e2e
```

Playwright auto-starts the dev server via the `webServer` config block. The suite uses Razorpay's hosted test card:

- Card: `4111 1111 1111 1111`
- Expiry: any future date
- CVV: any 3 digits

## What it asserts

- Console: zero errors during the entire run.
- Network: zero requests with status >= 400.
- URL: lands on `/dashboard`.
- Database: `User.paymentStatus === "completed"`.

## Resetting state between runs

The test creates a real user record. To re-run, delete the test user from MongoDB:

```js
db.users.deleteOne({ phone: "9999999999" })
```