import Link from "next/link";
import { getSiteContext } from "@/lib/siteContext";
import { SiteContextProvider } from "@/components/SiteContextProvider";

export const dynamic = "force-dynamic";

export default async function NotFound() {
    const ctx = await getSiteContext();
    return (
        <SiteContextProvider value={ctx}>
            <div className="flex-grow flex flex-col items-center justify-center relative overflow-hidden py-20 px-4">
                {/* Background decorative elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
                    <div className="absolute top-10 left-10 w-32 h-32 bg-[#FFC928] rounded-full blur-[80px]"></div>
                    <div className="absolute bottom-10 right-10 w-40 h-40 bg-blue-200 rounded-full blur-[100px]"></div>
                </div>

                {/* Animation Container */}
                <div className="relative w-[300px] h-[200px] sm:w-[400px] sm:h-[250px] mb-10 select-none">
                    {/* Style for the animation */}
                    <style>
                        {`
                            @keyframes bowlBall {
                            0% { left: -50px; top: 40%; transform: rotate(0deg); }
                            45% { left: 45%; top: 50%; transform: rotate(360deg); }
                            100% { left: 120%; top: 20%; transform: rotate(720deg); opacity: 0; }
                            }
                            @keyframes stumpLeft {
                            0%, 45% { transform: rotate(0deg) translate(0, 0); }
                            100% { transform: rotate(-45deg) translate(-20px, -10px); opacity: 0; }
                            }
                            @keyframes stumpMiddle {
                            0%, 45% { transform: rotate(0deg) translate(0, 0); }
                            100% { transform: rotate(10deg) translate(5px, -30px); opacity: 0; }
                            }
                            @keyframes stumpRight {
                            0%, 45% { transform: rotate(0deg) translate(0, 0); }
                            100% { transform: rotate(60deg) translate(30px, 10px); opacity: 0; }
                            }
                            @keyframes bailFly {
                            0%, 45% { transform: translate(0, 0) rotate(0); opacity: 1; }
                            100% { transform: translate(20px, -50px) rotate(180deg); opacity: 0; }
                            }

                            .animate-bowl { animation: bowlBall 2.5s infinite linear; }
                            .animate-stump-l { animation: stumpLeft 2.5s infinite ease-out; }
                            .animate-stump-m { animation: stumpMiddle 2.5s infinite ease-out; }
                            .animate-stump-r { animation: stumpRight 2.5s infinite ease-out; }
                            .animate-bail { animation: bailFly 2.5s infinite ease-out; }
                        `}
                    </style>

                    {/* Stumps Container (Centered) */}
                    <div className="absolute left-1/2 bottom-0 -translate-x-1/2 flex items-end justify-center w-20 h-32">
                        {/* Stump Left */}
                        <div className="w-2 h-32 bg-[#8B4513] mx-1 relative rounded-t-sm shadow-xl animate-stump-l border-r border-[#A0522D]"></div>
                        {/* Stump Middle */}
                        <div className="w-2 h-32 bg-[#8B4513] mx-1 relative rounded-t-sm shadow-xl animate-stump-m border-r border-[#A0522D]"></div>
                        {/* Stump Right */}
                        <div className="w-2 h-32 bg-[#8B4513] mx-1 relative rounded-t-sm shadow-xl animate-stump-r border-r border-[#A0522D]"></div>

                        {/* Bails */}
                        <div className="absolute top-0 w-full flex justify-center -mt-1">
                            <div className="w-6 h-1 bg-[#DEB887] rounded-full animate-bail shadow-sm"></div>
                        </div>
                    </div>

                    {/* Ball */}
                    <div className="absolute w-10 h-10 sm:w-12 sm:h-12 z-10 animate-bowl">
                        <img src="/tenis-ball.webp" alt="Tennis Ball" className="w-full h-full object-contain drop-shadow-xl" style={{ mixBlendMode: 'multiply' }} loading="lazy" decoding="async" />
                    </div>
                </div>

                {/* Text Content */}
                <div className="relative z-10 text-center space-y-6 max-w-2xl mx-auto">
                    <div>
                        <h1 className="text-8xl md:text-9xl font-extrabold text-[#111a45] drop-shadow-sm tracking-tighter">
                            404
                        </h1>
                        <div className="bg-[#FFC928] h-1.5 w-24 mx-auto mt-2 rounded-full"></div>
                    </div>

                    <h2 className="text-3xl md:text-5xl font-bold text-[#111a45] tracking-tight">
                        HOWZAT! <span className="text-[#d00000]">YOU'RE OUT!</span>
                    </h2>

                    <p className="text-lg md:text-xl text-gray-600 leading-relaxed font-medium">
                        The page you are looking for has been clean bowled. <br className="hidden sm:block" />
                        It looks like you've moved outside the playing field.
                    </p>

                    <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link
                            href="/"
                            className="group relative inline-flex items-center justify-center px-8 py-3 font-bold text-white transition-all duration-200 bg-[#111a45] font-pj rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-[#111a45] hover:bg-[#1a265e] hover:scale-105 shadow-lg"
                        >
                            <span className="mr-2">Return to Pavilion</span>
                            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                            </svg>
                        </Link>
                    </div>
                </div>
            </div>
        </SiteContextProvider>
    );
}