import PageBanner from "@/components/PageBanner";
import SEO from "@/components/SEO";
import Link from "next/link";
import { decodeHtmlEntities } from "@/utils/htmlHelper";
import { SafeHtml } from "@/components/SafeHtml";

const PrivacyPolicy = () => {
    const renderStaticContent = () => (
        <>
            <h1 className="text-3xl md:text-4xl font-bold font-display text-[#111a45] mb-8">Privacy Policy</h1>
            <div className="space-y-6 text-sm md:text-[1.05rem] leading-relaxed text-slate-600">
                <p>
                    Greetings from <span className="font-bold text-slate-900">Beyond Reach Premier League (BRPL)</span> (hereinafter referred to as the "<span className="font-bold">Website</span>"). The Website is owned and operated by <span className="font-bold text-slate-900">BRPL PVT. LTD.</span>, having its registered address at Ground Floor, Suite G-01, Procapitus Business Park, D-247/4A, D Block, Sector 63, Noida, Uttar Pradesh 201309.
                </p>
                <p>
                    By accessing or using the Website through any computer, laptop, mobile phone, tablet, or any other electronic device, you expressly agree to be bound by this <Link href="/privacy-policy" className="font-bold text-blue-600 hover:underline">Privacy Policy</Link> (hereinafter referred to as the "<Link href="/privacy-policy" className="font-bold text-blue-600 hover:underline">Privacy Policy</Link>").
                </p>
                <p>
                    We value the privacy of our users and the confidentiality of the information they share with us. This Privacy Policy demonstrates our commitment to protecting your information. It outlines the types of information we collect, the purpose for which it is used, how it is stored and handled, and under what circumstances it may be disclosed.
                </p>
                <p>
                    We encourage you to read this Privacy Policy carefully when: <br />(i) accessing or using our Website through any device; or <br />(ii) availing of any products or services offered by or through the Website. <br />By continuing to use the Website, you acknowledge and consent to the practices described herein.
                </p>
            </div>

            <div className="mt-12 space-y-10">
                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">1. Information We Collect</h2>
                    <p className="text-slate-600 mb-4 text-[1.05rem] leading-relaxed">When you use the Website, we may collect both <span className="font-bold">personal</span> and <span className="font-bold">non-personal</span> information.</p>
                    <div className="space-y-6 pl-4 border-l-2 border-slate-100">
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">(a) Personal Information</h3>
                            <p className="text-slate-600 leading-relaxed">This refers to data that can directly identify you, such as your name, contact details (email, address, and phone number), or other identifiers. We may also collect payment-related information (credit/debit card or bank account details) when you purchase products or services from the Website.</p>
                            <p className="text-slate-600 mt-2 leading-relaxed">You may also have the option to store payment details for faster transactions in the future.</p>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">(b) Non-Personal Information</h3>
                            <p className="text-slate-600 leading-relaxed">We may collect non-identifiable data, including but not limited to, your IP address, device ID, browser type, operating system, access time, geographic location, and referring website information.</p>
                            <p className="text-slate-600 mt-2 leading-relaxed">We may use <span className="font-bold">cookies, web beacons</span>, and other similar technologies to understand your usage patterns, enhance your browsing experience, and provide personalized services.</p>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">(c) Location Data</h3>
                            <p className="text-slate-600 leading-relaxed">If you permit, the Website may collect location data from your device to enhance user experience and improve services.</p>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 mb-2 text-lg font-display">(d) Minors</h3>
                            <p className="text-slate-600 leading-relaxed">We do not knowingly collect any information from individuals under the age of <span className="font-bold">18 years</span>. If you are below 18 or considered a minor under your jurisdiction, please refrain from submitting any personal information. If we become aware that a minor has provided us with such data, we will take steps to delete that information and terminate any associated account.</p>
                        </div>
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">2. How We Use the Information</h2>
                    <p className="text-slate-600 mb-4 text-[1.05rem]">We may use the collected information to:</p>
                    <ul className="list-disc pl-6 space-y-3 text-slate-600 leading-relaxed">
                        <li>Deliver, operate, and improve our products and services.</li>
                        <li>Manage user accounts and provide customer support.</li>
                        <li>Conduct research and analysis to enhance user experience.</li>
                        <li>Communicate with users via email, phone, or other channels about updates, offers, or services that may interest them.</li>
                        <li>Develop, display, and personalize content and advertisements based on user preferences.</li>
                        <li>Perform analytics and monitor website performance.</li>
                        <li>Enforce or exercise any rights under our <Link href="/terms-and-conditions" className="font-bold text-blue-600 hover:underline">Terms & Conditions</Link> available at <Link href="/terms-and-conditions" className="text-blue-600 hover:underline">Terms & Conditions</Link>.</li>
                        <li>Detect and prevent fraud, abuse, or other unauthorized activities.</li>
                        <li>Resolve disputes or troubleshoot issues.</li>
                        <li>Perform other functions described to users at the time of data collection.</li>
                    </ul>
                </section>

                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">3. Sharing of Information</h2>
                    <p className="text-slate-600 mb-4 text-[1.05rem]">We do not sell or rent your personal information. However, we may share information in the following circumstances:</p>
                    <ul className="list-disc pl-6 space-y-3 text-slate-600 leading-relaxed">
                        <li><span className="font-bold text-slate-900">With Service Providers:</span> To facilitate operations such as payment processing, marketing, analytics, or logistics – under confidentiality agreements.</li>
                        <li><span className="font-bold text-slate-900">For Legal Compliance:</span> To comply with applicable laws, court orders, or requests from government or law enforcement agencies.</li>
                        <li><span className="font-bold text-slate-900">For Protection:</span> To enforce our Terms & Conditions, protect our rights or property, or prevent potential fraud or illegal activity.</li>
                        <li><span className="font-bold text-slate-900">Corporate Transactions:</span> In the event of a merger, acquisition, sale of business, or reorganization, user data may form part of the transferred assets.</li>
                    </ul>
                    <p className="text-slate-600 mt-4 leading-relaxed">We may share <span className="font-bold">non-personal information</span> (aggregated or anonymized data) with third parties such as advertisers, partners, and investors for business or analytical purposes.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">4. Access and Control of Your Information</h2>
                    <p className="text-slate-600 mb-4 text-[1.05rem]">If you have created an account on our Website, you can review, update, or correct your personal information in your profile settings.</p>
                    <p className="text-slate-600 mb-4 leading-relaxed">You may also choose to opt out of receiving promotional communications or limit the sharing of your information by adjusting your account preferences.</p>
                    <p className="text-slate-600 mb-4 leading-relaxed">If you close your account, we may retain certain information as required by law or for legitimate business purposes such as fraud prevention, recordkeeping, or dispute resolution.</p>
                    <p className="text-slate-600 leading-relaxed">Information already shared with third parties will be governed by their respective privacy policies.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">5. Data Security</h2>
                    <p className="text-slate-600 mb-4 text-[1.05rem]">We adopt <span className="font-bold">reasonable security practices and technical measures</span> to protect your personal information from unauthorized access, alteration, disclosure, or destruction.</p>
                    <p className="text-slate-600 mb-4 leading-relaxed">However, no online platform or data transmission can guarantee complete security. You acknowledge that while we strive to protect your data, <span className="font-bold">we cannot ensure absolute security</span>, and you share your information at your own risk.</p>
                    <p className="text-slate-600 leading-relaxed">We recommend exercising caution when sharing sensitive information online.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">6. Children&apos;s Privacy</h2>
                    <p className="text-slate-600 leading-relaxed text-[1.05rem]">Our Website is intended for users aged <span className="font-bold">18 years and above</span>. We do not knowingly collect, store, or use personal information from children under this age. If such data is inadvertently collected, it will be deleted upon discovery.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">7. Updates to This Privacy Policy</h2>
                    <p className="text-slate-600 mb-2 leading-relaxed text-[1.05rem]">We may update or modify this Privacy Policy periodically. Any changes will be reflected with a revised &quot;Last Updated&quot; date at the top of this page.</p>
                    <p className="text-slate-600 leading-relaxed">We encourage users to review this page periodically to stay informed about our privacy practices.</p>
                </section>

                <section>
                    <h2 className="text-2xl font-bold font-display text-[#111a45] mb-5">8. Contact Us</h2>
                    <p className="text-slate-600 leading-relaxed text-[1.05rem] bg-blue-50 p-6 rounded-xl border border-blue-100">For any questions, concerns, or feedback regarding this Privacy Policy or the Website, you may contact us at: <a href="mailto:support@brpl.net" className="text-blue-600 hover:underline font-semibold">support@brpl.net</a></p>
                </section>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-gray-50/50 font-sans text-slate-800">
            <SEO title="Privacy Policy" description="Privacy Policy of Beyond Reach Premier League (BRPL)." />
            <PageBanner pageKey="privacyPolicy" title="Privacy Policy" currentPage="Privacy Policy" />

            <div className="max-w-8xl mx-auto px-4 md:px-8 py-12 lg:py-16">
                <div className="p-8 md:p-12 rounded-3xl shadow-lg border border-gray-100 bg-white">
                    {renderStaticContent()}
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
