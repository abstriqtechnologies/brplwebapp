/**
 * Visual helper components used by /auth page. Kept in a separate file
 * so AuthClient.tsx focuses on flow and state.
 */

import { useRef } from "react";
import { Loader2, Phone } from "lucide-react";

/* ---------- helpers (visual) ---------- */

export function AuthShell({ children }: { children: React.ReactNode }) {
    return <div className="auth-shell">{children}</div>;
}

export function AuthCard({ children }: { children: React.ReactNode }) {
    return <div className="auth-card">{children}</div>;
}

export function StepPill({ label }: { label: string }) {
    return (
        <div className="auth-step-pill">
            <span className="auth-step-dot" />
            {label}
        </div>
    );
}

export function AuthField({
    label,
    htmlFor,
    children,
}: {
    label: string;
    htmlFor: string;
    children: React.ReactNode;
}) {
    return (
        <div className="auth-field">
            <label htmlFor={htmlFor} className="auth-field-label">
                {label}
            </label>
            {children}
        </div>
    );
}

export function PhoneInput({
    id,
    value,
    onChange,
    disabled,
    autoFocus,
}: {
    id: string;
    value: string;
    onChange: (v: string) => void;
    disabled?: boolean;
    autoFocus?: boolean;
}) {
    return (
        <div className="auth-phone-wrap">
            <span className="auth-phone-prefix">
                <Phone size={13} /> +91
            </span>
            <input
                id={id}
                type="tel"
                inputMode="numeric"
                maxLength={10}
                autoComplete="tel"
                autoFocus={autoFocus}
                disabled={disabled}
                className="auth-field-input auth-phone-input"
                value={value}
                onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 10))}
            />
        </div>
    );
}

export function OtpInput({
    value,
    onChange,
    disabled,
}: {
    value: ReadonlyArray<string>;
    onChange: (next: string[]) => void;
    disabled?: boolean;
}) {
    const refs = useRef<(HTMLInputElement | null)[]>([]);
    const update = (i: number, v: string) => {
        const digit = v.replace(/\D/g, "").slice(-1);
        const next = [...value];
        next[i] = digit;
        onChange(next);
        if (digit && i < 5) refs.current[i + 1]?.focus();
        if (!digit && i > 0) refs.current[i - 1]?.focus();
    };
    return (
        <div className="auth-otp-row">
            {value.map((d, i) => (
                <input
                    key={i}
                    ref={(el) => {
                        refs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    aria-label={`Digit ${i + 1}`}
                    disabled={disabled}
                    className={`auth-otp-cell ${d ? "filled" : ""}`}
                    value={d}
                    onChange={(e) => update(i, e.target.value)}
                    autoFocus={i === 0}
                />
            ))}
        </div>
    );
}

export function PrimaryButton({
    busy,
    busyLabel,
    children,
    disabled,
    type = "button",
    onClick,
}: {
    busy: boolean;
    busyLabel: string;
    children: React.ReactNode;
    disabled?: boolean;
    type?: "button" | "submit";
    onClick?: () => void;
}) {
    return (
        <button
            type={type}
            className="auth-submit"
            disabled={busy || disabled}
            aria-busy={busy}
            onClick={onClick}
        >
            {busy ? (
                <>
                    <Loader2 size={16} className="animate-spin" /> {busyLabel}
                </>
            ) : (
                children
            )}
        </button>
    );
}