import { createHmac, timingSafeEqual } from 'node:crypto';

// HS256 over a short payload. The QR token format is `${claimCode}.${sig}`
// where sig is base64url(hmac_sha256(claimCode, HMAC_SECRET)) truncated to
// 16 chars for QR density (~96 bits of entropy — sufficient when paired
// with the random claimCode itself).
//
// Verification is constant-time via timingSafeEqual to avoid signature
// oracle attacks. Required env var: HMAC_SECRET (>= 32 chars recommended).

function getSecret(): string {
  const s = process.env.HMAC_SECRET;
  if (!s || s.length < 16) {
    throw new Error('HMAC_SECRET is missing or too short (need >= 16 chars)');
  }
  return s;
}

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function signClaimCode(claimCode: string): string {
  const sig = base64url(createHmac('sha256', getSecret()).update(claimCode).digest()).slice(0, 16);
  return `${claimCode}.${sig}`;
}

// Returns the verified claimCode if the token is well-formed and signed.
// Returns null when the token is unsigned (legacy raw claimCode) — callers
// decide whether to accept unsigned input. Throws when the token IS signed
// but the signature is wrong (tamper attempt).
export function verifySignedCode(token: string): { claimCode: string; signed: boolean } {
  const dot = token.lastIndexOf('.');
  if (dot < 0) {
    // No dot → raw claimCode, no signature to verify.
    return { claimCode: token, signed: false };
  }
  const claimCode = token.slice(0, dot);
  const provided = token.slice(dot + 1);
  if (!claimCode || !provided) {
    throw new Error('Malformed signed code');
  }
  const expected = base64url(createHmac('sha256', getSecret()).update(claimCode).digest()).slice(0, 16);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('Invalid signature');
  }
  return { claimCode, signed: true };
}
