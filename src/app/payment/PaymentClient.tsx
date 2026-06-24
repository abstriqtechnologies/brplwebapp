"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PaymentClient() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/login?next=/dashboard");
    }, [router]);
    return null;
}
