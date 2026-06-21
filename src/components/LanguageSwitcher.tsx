"use client";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";

export const LanguageSwitcher = () => {
    const { i18n } = useTranslation();

    const languages = [
        { code: "en", name: "English" },
        { code: "hi", name: "हिंदी (Hindi)" },
        { code: "mr", name: "मराठी (Marathi)" },
        { code: "gu", name: "ગુજરાતી (Gujarati)" },
        { code: "ta", name: "தமிழ் (Tamil)" },
        { code: "te", name: "తెలుగు (Telugu)" },
        { code: "kn", name: "ಕನ್ನಡ (Kannada)" },
        { code: "bn", name: "বাংলা (Bengali)" },
        { code: "ml", name: "മലയാളം (Malayalam)" },
        { code: "pa", name: "ਪੰਜਾਬੀ (Punjabi)" },
    ];

    const changeLanguage = (value: string) => {
        i18n.changeLanguage(value);
    };

    return (
        <Select value={i18n.language} onValueChange={changeLanguage}>
            <SelectTrigger className="w-[140px] h-9 gap-2">
                <Languages className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
                {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};
