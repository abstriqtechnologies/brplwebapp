"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface ImageUploadProps {
    value: string;
    onChange: (url: string) => void;
    label?: string;
}

/**
 * Image upload component that uploads files to the VPS via /api/admin/upload.
 * Returns the URL path served by Next.js static files.
 */
export function ImageUpload({ value, onChange, label }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
        if (!allowed.includes(file.type)) {
            setError("Invalid file type. Allowed: JPG, PNG, WebP, GIF.");
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            setError("File too large. Maximum size is 50 MB.");
            return;
        }

        setError(null);
        setUploading(true);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/admin/upload", {
                method: "POST",
                body: formData,
                credentials: "same-origin",
            });

            const json = await res.json();

            if (json.ok && json.data?.url) {
                onChange(json.data.url);
            } else {
                setError(json.error || "Upload failed");
            }
        } catch {
            setError("Failed to upload file");
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    const handleRemove = () => {
        onChange("");
        setError(null);
    };

    return (
        <div className="space-y-1.5">
            {label && (
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {label}
                </Label>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
                Max size: 50 MB. JPG, PNG or WebP recommended.
            </p>

            {error && (
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
            )}

            <div
                className={cn(
                    "relative flex items-center justify-center rounded-lg border-2 border-dashed transition-colors",
                    value
                        ? "border-emerald-300 dark:border-emerald-700"
                        : "border-slate-300 dark:border-slate-600 hover:border-amber-400 dark:hover:border-amber-500",
                )}
            >
                {value ? (
                    <div className="relative w-full group">
                        <img
                            src={value.startsWith("http") || value.startsWith("/") ? value : `/${value}`}
                            alt="Preview"
                            className="w-full h-48 object-cover rounded-lg"
                        />
                        <button
                            type="button"
                            onClick={handleRemove}
                            className={cn(
                                "absolute top-2 right-2 h-7 w-7 rounded-full",
                                "bg-black/50 hover:bg-black/70 text-white",
                                "flex items-center justify-center",
                                "opacity-0 group-hover:opacity-100 transition-opacity",
                            )}
                            aria-label="Remove image"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={uploading}
                        className={cn(
                            "w-full h-32 flex flex-col items-center justify-center gap-1.5",
                            "text-slate-400 dark:text-slate-500",
                            "hover:text-slate-600 dark:hover:text-slate-300",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            "transition-colors rounded-lg",
                        )}
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
                                <span className="text-xs">Uploading…</span>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-1.5">
                                    <Upload className="h-5 w-5" />
                                    <ImageIcon className="h-5 w-5" />
                                </div>
                                <span className="text-xs font-medium">Click to upload</span>
                            </>
                        )}
                    </button>
                )}
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFile}
                className="hidden"
                aria-label="Upload image"
            />
        </div>
    );
}
