import { describe, it, expect, beforeAll } from "vitest";
import { POST } from "@/app/api/contact/route";

beforeAll(() => {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI must be set for integration tests");
    }
});

async function call(body: any) {
    const req = new Request("http://localhost/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
    const res = await POST(req);
    const json = await res.json();
    return { status: res.status, body: json };
}

describe("POST /api/contact", () => {
    it("rejects missing required fields", async () => {
        const { status, body } = await call({ source: "contact-form", firstName: "A" });
        expect(status).toBe(400);
        expect(body.success).toBe(false);
    });

    it("rejects invalid email", async () => {
        const { status } = await call({
            source: "contact-form",
            firstName: "A",
            lastName: "B",
            email: "not-an-email",
            mobileNumber: "9876543210",
            message: "Hello world",
        });
        expect(status).toBe(400);
    });

    it("accepts a valid contact-form payload", async () => {
        const { status, body } = await call({
            source: "contact-form",
            firstName: "Anu",
            lastName: "Rag",
            email: "a@b.com",
            mobileNumber: "9876543210",
            message: "Hello world from test",
        });
        expect(status).toBe(200);
        expect(body.success).toBe(true);
        expect(typeof body.id).toBe("string");
    });

    it("accepts a valid partner-form payload", async () => {
        const { status, body } = await call({
            source: "partner-form",
            firstName: "Anu",
            lastName: "Rag",
            email: "a@b.com",
            contactNumber: "9876543210",
            partnershipType: "Sponsorship",
            message: "We would like to sponsor your league",
        });
        expect(status).toBe(200);
        expect(body.success).toBe(true);
    });
});
