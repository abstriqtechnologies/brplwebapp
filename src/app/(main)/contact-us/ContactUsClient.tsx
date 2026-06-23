"use client";

import React, { useState } from "react";
import Link from "next/link";
import PageBanner from "@/components/PageBanner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, Mail, MapPin, Phone } from "lucide-react";
import SEO from "@/components/SEO";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const ContactUsClient = () => {
    const { settings } = useSiteSettings();
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        mobileNumber: "",
        email: "",
        message: ""
    });
    const [loading, setLoading] = useState(false);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.firstName || !formData.lastName || !formData.email || !formData.mobileNumber || !formData.message) {
            return;
        }

        setLoading(true);
        // Simulate submission
        setTimeout(() => {
            setShowSuccessDialog(true);
            setFormData({
                firstName: "",
                lastName: "",
                mobileNumber: "",
                email: "",
                message: ""
            });
            setLoading(false);
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <SEO
                title="Contact Us"
                description="Get in touch with Beyond Reach Premier League. We are here to help you with expert guidance and support."
            />
            <PageBanner pageKey="contactUs" title="Contact us" currentPage="Contact us" />

            <section className="container mx-auto px-4 py-16">
                <div>
                    <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-10 lg:gap-12 items-start">
                        {/* Left: Form */}
                        <div className="border border-gray-200 rounded-[32px] p-6 md:p-10 lg:p-12">
                            <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-[#0b2a5b] mb-3">
                                Get In Touch With Us
                            </h2>
                            <p className="text-sm md:text-base text-gray-600 mb-8 max-w-2xl">
                                We&apos;re here to help you every step of the way. Whether you need expert guidance,
                                technical support, or details about our solutions, our team is always ready to connect.
                            </p>

                            <form className="space-y-4" onSubmit={handleSubmit}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        placeholder="First Name"
                                        className="w-full rounded-full bg-[#e4ebf5] px-5 py-3 text-sm md:text-base text-gray-800 placeholder:text-gray-500 border-0 focus:outline-none focus:ring-2 focus:ring-[#0b2a5b]/40"
                                    />
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        placeholder="Last Name"
                                        className="w-full rounded-full bg-[#e4ebf5] px-5 py-3 text-sm md:text-base text-gray-800 placeholder:text-gray-500 border-0 focus:outline-none focus:ring-2 focus:ring-[#0b2a5b]/40"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        type="tel"
                                        name="mobileNumber"
                                        value={formData.mobileNumber}
                                        onChange={handleChange}
                                        placeholder="Mobile Number"
                                        className="w-full rounded-full bg-[#e4ebf5] px-5 py-3 text-sm md:text-base text-gray-800 placeholder:text-gray-500 border-0 focus:outline-none focus:ring-2 focus:ring-[#0b2a5b]/40"
                                    />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="Email Address"
                                        className="w-full rounded-full bg-[#e4ebf5] px-5 py-3 text-sm md:text-base text-gray-800 placeholder:text-gray-500 border-0 focus:outline-none focus:ring-2 focus:ring-[#0b2a5b]/40"
                                    />
                                </div>

                                <div>
                                    <textarea
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        rows={4}
                                        placeholder="Message"
                                        className="w-full rounded-3xl bg-[#e4ebf5] px-5 py-4 text-sm md:text-base text-gray-800 placeholder:text-gray-500 border-0 focus:outline-none focus:ring-2 focus:ring-[#0b2a5b]/40 resize-none"
                                    />
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full rounded-full bg-[#063772] py-4 text-sm md:text-base font-semibold text-white tracking-wide hover:bg-[#042b5c] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {loading ? "Sending..." : "Submit Message"}
                                    </button>
                                </div>
                            </form>

                            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Customer Support */}
                                <div className="border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow bg-blue-50/30">
                                    <h4 className="font-bold text-[#0b2a5b] text-lg mb-4">Customer Support</h4>
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-[#e4ebf5] flex items-center justify-center flex-shrink-0">
                                            <Phone className="w-5 h-5 text-[#0b2a5b]" />
                                        </div>
                                        <div className="flex flex-col gap-1.5 text-gray-600">
                                            <a href={`tel:${settings.contactPhone.replace(/\D/g, "").replace(/^/, "+")}`} className="hover:text-[#0b2a5b] transition-colors font-medium">{settings.contactPhone}</a>
                                            {settings.contactPhoneSecondary && (
                                                <a href={`tel:${settings.contactPhoneSecondary.replace(/\D/g, "").replace(/^/, "+")}`} className="hover:text-[#0b2a5b] transition-colors font-medium">{settings.contactPhoneSecondary}</a>
                                            )}
                                            <span className="text-white text-sm font-semibold bg-[#0b2a5b] px-3 py-1.5 rounded-full border border-[#0b2a5b] inline-block w-fit mt-1 shadow-md">10 AM to 7 PM</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Sales Head */}
                                <div className="border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow bg-blue-50/30">
                                    <h4 className="font-bold text-[#0b2a5b] text-lg mb-4">Sales Head</h4>
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 rounded-full bg-[#e4ebf5] flex items-center justify-center flex-shrink-0">
                                            <Phone className="w-5 h-5 text-[#0b2a5b]" />
                                        </div>
                                        <div className="flex flex-col gap-1.5 text-gray-600">
                                            <span className="font-semibold text-gray-800">Naval Verma</span>
                                        </div>
                                    </div>
                                </div>
                                {/* Sponsorship & Partnership */}
                                <div className="border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow bg-blue-50/30 md:col-span-2">
                                    <h4 className="font-bold text-[#0b2a5b] text-lg mb-4">Sponsorship & Partnership</h4>
                                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                        <p className="text-gray-600 font-medium">Write For Sponsorship and Partnership inquiries</p>
                                        <Link
                                            href="/partners"
                                            className="bg-[#0b2a5b] hover:bg-[#063772] text-white px-6 py-2.5 rounded-full font-semibold transition-all shadow-md hover:shadow-lg whitespace-nowrap"
                                        >
                                            Click Here
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Help card and map */}
                        <div className="space-y-6">
                            <div className="bg-[#0b2a5b] text-white rounded-3xl px-6 py-7 md:px-7 md:py-8 flex flex-col gap-4">
                                <h3 className="text-xl md:text-2xl font-extrabold mb-1">Need a Help</h3>
                                <p className="text-sm md:text-base text-white/80 mb-2">
                                    Have question about our service or need immediate assistance?
                                </p>

                                <div className="space-y-6 text-sm md:text-base">


                                    <div className="flex items-start gap-3">
                                        <Mail className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                        <a href={`mailto:${settings.contactEmail}`} className="hover:underline">{settings.contactEmail}</a>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" />
                                        <span>{settings.contactAddress}</span>
                                    </div>
                                </div>
                            </div>

                            {settings.mapEmbedUrl && (
                                <div className="rounded-3xl overflow-hidden h-52 md:h-60 lg:h-64 bg-gray-200">
                                    <iframe
                                        title="BRPL Office Location"
                                        src={settings.mapEmbedUrl}
                                        width="100%"
                                        height="100%"
                                        style={{ border: 0 }}
                                        loading="lazy"
                                        allowFullScreen
                                        referrerPolicy="no-referrer-when-downgrade"
                                    ></iframe>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
                <AlertDialogContent className="max-w-md rounded-2xl">
                    <AlertDialogHeader className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-10 h-10 text-green-600" />
                        </div>
                        <AlertDialogTitle className="text-2xl font-bold text-[#0b2a5b]">Message Sent!</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-600 mt-2">
                            Thank you for contacting us. We have received your message and will get back to you shortly.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-center mt-6">
                        <AlertDialogAction
                            onClick={() => setShowSuccessDialog(false)}
                            className="bg-[#0b2a5b] hover:bg-[#063772] text-white px-8 rounded-full"
                        >
                            Close
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default ContactUsClient;
