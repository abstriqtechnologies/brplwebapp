"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Library, Upload, X, Film } from "lucide-react";
import { MediaPicker, type MediaPickerResult } from "./MediaPicker";

export interface MediaUploadFieldProps {
    label?: string;
    value: string;
    onChange: (url: string) => void;
    kind?: "image" | "video";
    accept?: string;
    /** Required label star (display only) */
    required?: boolean;
    /** Helper text shown under the field */
    hint?: string;
}

export function MediaUploadField({
    label,
    value,
    onChange,
    kind = "image",
    accept,
    required,
    hint,
}: MediaUploadFieldProps) {
    const [pickerOpen, setPickerOpen] = useState(false);
    const [mode, setMode] = useState<"library" | "upload">("library");

    const openPicker = (m: "library" | "upload") => {
        setMode(m);
        setPickerOpen(true);
    };

    const onSelect = (r: MediaPickerResult) => {
        onChange(r.url);
    };

    const isExternal = value && !value.startsWith("/uploads/") && !value.startsWith("data:");

    return (
        <div className="space-y-2">
            {label && (
                <Label className="block">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </Label>
            )}

            {value && kind === "image" && (
                <div className="border rounded-md p-2 bg-slate-50 dark:bg-slate-900 inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={value}
                        alt=""
                        className="max-h-32 max-w-xs object-contain"
                        onError={(e) => { (e.currentTarget.style.display = "none"); }}
                    />
                </div>
            )}
            {value && kind === "video" && (
                <div className="border rounded-md p-2 bg-slate-50 dark:bg-slate-900 inline-flex items-center gap-2 text-sm text-slate-600">
                    <Film className="w-4 h-4" />
                    <span className="truncate max-w-xs">{value.split("/").pop()}</span>
                </div>
            )}

            <div className="flex gap-2">
                <Input
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Paste a URL or upload below"
                    className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={() => openPicker("upload")}>
                    <Upload className="w-4 h-4 mr-1" /> Upload
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => openPicker("library")}>
                    <Library className="w-4 h-4 mr-1" /> Library
                </Button>
                {value && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => onChange("")} title="Clear">
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {isExternal && (
                <p className="text-xs text-slate-500">External URL — not stored in the media library.</p>
            )}
            {hint && <p className="text-xs text-slate-500">{hint}</p>}

            <MediaPicker
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                onSelect={onSelect}
                kind={kind}
                accept={accept}
            />
        </div>
    );
}