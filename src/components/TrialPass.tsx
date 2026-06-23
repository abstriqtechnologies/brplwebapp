"use client";
import ReactBarcode from 'react-barcode';
import { useState, useEffect } from 'react';

interface TrialPassProps {
    user?: any;
}

const DEFAULT_AVATAR = '/assets/avtar.webp';

const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

const isExternalUrl = (url: string) =>
    typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'));

const TrialPass = ({ user }: TrialPassProps) => {
    // Support both our {name} shape and the legacy {fname, lname} shape
    const derivedName = user
        ? (user.name?.trim() ||
           `${user.fname || ''} ${user.lname || ''}`.trim() ||
           'Player')
        : 'Player';
    const fullName = derivedName;
    const profileImage = user?.profileImage || user?.avatar || DEFAULT_AVATAR;
    const barcodeValue = String(user?.userId || user?._id || user?.id || '0000000000000');

    // Display: URL or base64. Use base64 when possible so download (html-to-image) works.
    const [imgSrc, setImgSrc] = useState<string>(DEFAULT_AVATAR);
    // Only use crossOrigin for same-origin/base64 so S3 URLs can display without CORS
    const useCrossOrigin = imgSrc.startsWith('data:') || imgSrc.startsWith('/') || imgSrc.startsWith('blob:');

    useEffect(() => {
        if (!profileImage) {
            setImgSrc(DEFAULT_AVATAR);
            return;
        }

        // Already base64 — use directly
        if (profileImage.startsWith('data:')) {
            setImgSrc(profileImage);
            return;
        }

        // Set URL immediately so <img> can display it (without crossOrigin, S3 works)
        setImgSrc(profileImage);

        let isMounted = true;

        const loadImage = async () => {
            // 1. Proxy first for S3/external — avoids CORS; works when bucket doesn't send CORS
            if (isExternalUrl(profileImage)) {
                try {
                    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(profileImage)}`;
                    const res = await fetch(proxyUrl, { cache: 'no-cache' });
                    if (res.ok) {
                        const blob = await res.blob();
                        const base64 = await blobToBase64(blob);
                        if (isMounted) { setImgSrc(base64); return; }
                    }
                } catch (_) {}
            }

            // 2. Direct CORS fetch — for CORS-enabled S3/CDN
            try {
                const res = await fetch(profileImage, { mode: 'cors', cache: 'no-cache' });
                if (res.ok) {
                    const blob = await res.blob();
                    const base64 = await blobToBase64(blob);
                    if (isMounted) { setImgSrc(base64); return; }
                }
            } catch (_) {}

            // 3. Canvas extraction — for same-origin images (e.g. /assets/...)
            try {
                await new Promise<void>((resolve, reject) => {
                    const img = new Image();
                    img.crossOrigin = 'anonymous';
                    img.onload = () => {
                        try {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.naturalWidth || 300;
                            canvas.height = img.naturalHeight || 300;
                            const ctx = canvas.getContext('2d')!;
                            ctx.drawImage(img, 0, 0);
                            const base64 = canvas.toDataURL('image/jpeg', 0.92);
                            if (isMounted) setImgSrc(base64);
                            resolve();
                        } catch (e) { reject(e); }
                    };
                    img.onerror = reject;
                    img.src = profileImage;
                });
                return;
            } catch (_) {}

            // Keep current imgSrc (already set to profileImage above for display)
        };

        loadImage();
        return () => { isMounted = false; };
    }, [profileImage]);

    return (
        <div
            id="brpl-trial-pass"
            className="relative w-full max-w-[400px] aspect-[400/510] shadow-[0_10px_40px_rgba(0,0,0,0.15)] select-none shrink-0 mx-auto overflow-hidden p-0 bg-white"
            style={{
                backgroundImage: 'url(/assets/trail-pass-bg.webp)',
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                fontFamily: '"Inter", sans-serif',
            }}
        >
            <div className="absolute inset-0 z-10 flex flex-col">

                {/* Top header area — reserve ~22% for logo/title/validity */}
                <div style={{ height: '22%' }} />

                {/* Profile Photo */}
                <div className="flex justify-center" style={{ marginTop: '1%' }}>
                    <div
                        className="overflow-hidden bg-[#5c667a]"
                        style={{
                            width: '58%',
                            aspectRatio: '1 / 1',
                            borderRadius: '6%',
                            border: '3px solid #24324a',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        }}
                    >
                        <img
                            src={imgSrc}
                            alt={fullName}
                            {...(useCrossOrigin ? { crossOrigin: 'anonymous' as const } : {})}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
                            onError={() => setImgSrc(DEFAULT_AVATAR)}
                        />
                    </div>
                </div>

                {/* Name */}
                <div className="flex justify-center" style={{ marginTop: '3%' }}>
                    <h2
                        className="text-[#000] font-semibold tracking-wide leading-none text-center"
                        style={{
                            fontFamily: '"Poppins", sans-serif',
                            fontSize: 'clamp(16px, 5.5vw, 28px)',
                        }}
                    >
                        {fullName}
                    </h2>
                </div>

                {/* Barcode */}
                <div className="flex justify-center" style={{ marginTop: '2%', paddingLeft: '15%', paddingRight: '15%' }}>
                    <ReactBarcode
                        value={barcodeValue}
                        width={0.9}
                        height={40}
                        displayValue={false}
                        background="transparent"
                        lineColor="#000000"
                        margin={0}
                    />
                </div>

                {/* Bottom tagline spacer */}
                <div className="flex-1" />
            </div>
        </div>
    );
};

export default TrialPass;