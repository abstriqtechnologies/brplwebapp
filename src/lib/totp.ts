import speakeasy from "speakeasy";

export function generateTotpSecret(): string {
    return speakeasy.generateSecret({ length: 20 }).base32;
}

export function verifyTotp(secret: string, code: string, window = 1): boolean {
    if (!secret || !/^\d{6}$/.test(code)) return false;
    return speakeasy.totp.verify({
        secret,
        encoding: "base32",
        token: code,
        window,
    });
}

export function otpauthUrl(secret: string, account: string, issuer = "BRPL Admin"): string {
    return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
}
