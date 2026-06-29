"use client";

import { useState } from "react";

interface NamePhoneFormProps {
  onSubmit: (name: string, phone: string) => void;
}

export function NamePhoneForm({ onSubmit }: NamePhoneFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }
    setError("");
    onSubmit(name.trim(), phone.replace(/\D/g, ""));
  };

  return (
    <div className="bg-white h-full flex flex-col">
      <div
        className="px-6 pt-7 pb-5 text-white"
        style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)" }}
      >
        <h3 className="text-xl font-semibold leading-tight">Start a Conversation</h3>
        <p className="text-white/90 text-sm mt-1">
          Please enter your details to chat with us
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 px-6 py-6 bg-white">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Your Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Doe"
          className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
        />

        <label className="block text-sm font-medium text-gray-700 mb-1.5 mt-4">
          Phone Number
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
          placeholder="9876543210"
          className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:border-transparent"
        />

        {error && <p className="text-red-500 text-xs mt-3">{error}</p>}

        <button
          type="submit"
          className="w-full mt-5 py-2.5 text-white font-medium rounded-lg text-sm"
          style={{ background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)" }}
        >
          Start Chat
        </button>
      </form>
    </div>
  );
}