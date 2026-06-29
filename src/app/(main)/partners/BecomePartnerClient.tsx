"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import PageBanner from "@/components/PageBanner";
import SEO from "@/components/SEO";
import { CheckCircle2 } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import api from "@/apihelper/api";
import { toast } from "@/components/ui/use-toast";

const partnerFormSchema = z.object({
    firstName: z.string().min(2, { message: "First name must be at least 2 characters." }),
    lastName: z.string().min(2, { message: "Last name must be at least 2 characters." }),
    companyName: z.string().optional(),
    email: z.string().email({ message: "Please enter a valid email address." }),
    contactNumber: z.string().min(10, { message: "Contact number must be at least 10 digits." }),
    partnershipType: z.enum(["Sponsorship", "Franchise"], {
        required_error: "Please select a partnership type.",
    }),
    message: z.string().min(10, { message: "Message must be at least 10 characters." }),
});

const BecomePartnerClient = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);

    const form = useForm<z.infer<typeof partnerFormSchema>>({
        resolver: zodResolver(partnerFormSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            companyName: "",
            email: "",
            contactNumber: "",
            partnershipType: undefined,
            message: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof partnerFormSchema>) => {
        setIsSubmitting(true);
        try {
            const res = await api.post<{ success: boolean; id?: string; error?: string }>("/api/contact", {
                source: "partner-form",
                ...values,
            });
            if (!res.ok) {
                toast({ variant: "destructive", title: "Failed", description: res.error || "Try again later" });
                return;
            }
            setShowSuccessDialog(true);
            form.reset();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Network error", description: err?.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <SEO
                title="Become a Partner"
                description="Join us as a partner and grow with Brpl."
            />
            <PageBanner pageKey="becomePartner" title="Become a Partner" currentPage="Become a Partner" />

            <section className="container mx-auto px-4 py-16">
                <div className="max-w-4xl mx-auto">
                    {/* Centered Form */}
                    <div className="border border-gray-200 rounded-[32px] p-6 md:p-10 lg:p-12 bg-white shadow-sm">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-[#0b2a5b] mb-3">
                                Connect With Us
                            </h2>
                            <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto">
                                We're here to collaborate. Whether you are looking for sponsorship, co-branding, we are ready to connect.
                            </p>
                        </div>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="firstName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                        placeholder="First Name"
                                                        className="w-full  bg-[#e4ebf5] px-6 py-4 h-auto text-base text-gray-800 placeholder:text-gray-500 border-0 focus-visible:ring-2 focus-visible:ring-[#0b2a5b]/40 focus-visible:ring-offset-0 shadow-none transition-all"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="lastName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Last Name"
                                                        className="w-full  bg-[#e4ebf5] px-6 py-4 h-auto text-base text-gray-800 placeholder:text-gray-500 border-0 focus-visible:ring-2 focus-visible:ring-[#0b2a5b]/40 focus-visible:ring-offset-0 shadow-none transition-all"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="companyName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    placeholder="Company Name (Optional)"
                                                    className="w-full bg-[#e4ebf5] px-6 py-4 h-auto text-base text-gray-800 placeholder:text-gray-500 border-0 focus-visible:ring-2 focus-visible:ring-[#0b2a5b]/40 focus-visible:ring-offset-0 shadow-none transition-all"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="contactNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Contact Number"
                                                        className="w-full  bg-[#e4ebf5] px-6 py-4 h-auto text-base text-gray-800 placeholder:text-gray-500 border-0 focus-visible:ring-2 focus-visible:ring-[#0b2a5b]/40 focus-visible:ring-offset-0 shadow-none transition-all"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Email Address"
                                                        type="email"
                                                        className="w-full  bg-[#e4ebf5] px-6 py-4 h-auto text-base text-gray-800 placeholder:text-gray-500 border-0 focus-visible:ring-2 focus-visible:ring-[#0b2a5b]/40 focus-visible:ring-offset-0 shadow-none transition-all"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="partnershipType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="w-full  bg-[#e4ebf5] px-6 py-4 h-auto text-base text-gray-800 border-0 focus:ring-2 focus:ring-[#0b2a5b]/40 shadow-none data-[placeholder]:text-gray-500 transition-all">
                                                        <SelectValue placeholder="Type Of Partnership" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="Sponsorship">Sponsorship</SelectItem>
                                                    <SelectItem value="Franchise">Franchise</SelectItem>
                                                    {/* <SelectItem value="None of the above">None of the above (Please mention below)</SelectItem> */}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="message"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Message"
                                                    rows={5}
                                                    className="w-full rounded-3xl bg-[#e4ebf5] px-6 py-4 text-base text-gray-800 placeholder:text-gray-500 border-0 focus-visible:ring-2 focus-visible:ring-[#0b2a5b]/40 focus-visible:ring-offset-0 resize-none shadow-none transition-all"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="pt-6 text-center">
                                    <Button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full md:w-auto min-w-[200px]  bg-[#063772] py-6 text-base font-semibold text-white tracking-wide hover:bg-[#042b5c] transition-colors shadow-none px-12"
                                    >
                                        {isSubmitting ? "Submitting..." : "Submit Message"}
                                    </Button>
                                </div>
                            </form>
                        </Form>
                    </div>
                </div>
            </section>

            <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
                <AlertDialogContent className="max-w-md rounded-2xl">
                    <AlertDialogHeader className="flex flex-col items-center text-center">
                        <div className="w-16 h-16  bg-green-100 flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-10 h-10 text-green-600" />
                        </div>
                        <AlertDialogTitle className="text-2xl font-bold text-[#0b2a5b]">Mail Delivered</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-600 mt-2">
                            Thank you for your interest! We have received your inquiry and will get back to you shortly.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="sm:justify-center mt-6">
                        <AlertDialogAction
                            onClick={() => setShowSuccessDialog(false)}
                            className="bg-[#0b2a5b] hover:bg-[#063772] text-white px-8 "
                        >
                            Close
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default BecomePartnerClient;
