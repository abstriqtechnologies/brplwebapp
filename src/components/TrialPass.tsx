"use client";
import QRCode from "qrcode";
import { useState, useEffect } from "react";

interface TrialPassProps {
    user?: any;
}

const TrialPass = ({ user }: TrialPassProps) => {
    // Support both our {name} shape and the legacy {fname, lname} shape
    const fullName = user
        ? user.name?.trim() || `${user.fname || ""} ${user.lname || ""}`.trim() || "Player"
        : "Player";

    const qrValue = String(user?.userId || user?._id || user?.id || "0000000000000");
    const trialConducted = user?.Trial_status === "completed";

    // Generate QR code as a data URL so the downloaded PNG includes it cleanly.
    const [qrSrc, setQrSrc] = useState<string>("");
    useEffect(() => {
        let cancelled = false;
        QRCode.toDataURL(qrValue, {
            errorCorrectionLevel: "M",
            margin: 1,
            width: 512,
            color: { dark: "#000000", light: "#ffffff" },
        })
            .then((url) => {
                if (!cancelled) setQrSrc(url);
            })
            .catch(() => {
                if (!cancelled) setQrSrc("");
            });
        return () => {
            cancelled = true;
        };
    }, [qrValue]);

    return (
        <div
            id="Brpl-trial-pass"
            className="relative w-full max-w-[400px] aspect-[400/510] shadow-[0_10px_40px_rgba(0,0,0,0.15)] select-none shrink-0 mx-auto overflow-hidden p-0 bg-white"
            style={{
                backgroundImage: "url(/assets/trail-pass-bg.webp)",
                backgroundSize: "100% 100%",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                fontFamily: '"Inter", sans-serif',
            }}
        >
            <div className={`absolute inset-0 z-10 flex flex-col ${trialConducted ? "blur-[3px]" : ""}`}>
                {/* Top header area — reserve ~22% for logo/title/validity */}
                <div style={{ height: "22%" }} />

                {/* QR Code */}
                <div className="flex justify-center" style={{ marginTop: "6%", paddingLeft: "0" }}>
                    {qrSrc && (
                        <img
                            src={qrSrc}
                            alt={`Brpl QR for ${fullName}`}
                            crossOrigin="anonymous"
                            style={{
                                display: "block",
                                width: "49%",
                                height: "auto",
                                aspectRatio: "1 / 1",
                                margin: "0 auto",
                                background: "linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #db2777 100%)",
                                padding: "6px",
                                borderRadius: "10px",
                                boxShadow:
                                    "0 4px 14px rgba(245, 158, 11, 0.35), inset 0 0 0 1px rgba(255,255,255,0.25)",
                            }}
                        />
                    )}
                </div>

                {/* Name */}
                <div className="flex justify-center" style={{ marginTop: "10%" }}>
                    <h2
                        className="text-[#000] font-semibold tracking-wide leading-none text-center"
                        style={{
                            fontFamily: '"Poppins", sans-serif',
                            fontSize: "clamp(16px, 5.5vw, 28px)",
                        }}
                    >
                        {fullName}
                    </h2>
                </div>

                {/* Bottom tagline spacer */}
                <div className="flex-1" />
            </div>
            {trialConducted && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/35 backdrop-blur-[2px]">
                    <div className="-rotate-12 flex h-60 w-60 items-center justify-center rounded-full border-[10px] border-red-700/90 bg-white/25 text-center shadow-[0_10px_30px_rgba(185,28,28,0.22)] ring-2 ring-red-700/25">
                        <div className="flex h-[189px] w-[189px] items-center justify-center rounded-full border-[3px] border-dashed border-red-700/80 px-4">
                            <p className="text-2xl font-black uppercase leading-none tracking-wider text-red-800 drop-shadow-sm [-webkit-text-stroke:0.7px_currentColor]">
                                Trial
                                <br />
                                conducted
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrialPass;
