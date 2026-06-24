"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PaymentClient() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/auth?mode=register&next=/dashboard");
    }, [router]);
    return null;
}
