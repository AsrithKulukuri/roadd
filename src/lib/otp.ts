import crypto from "crypto";

/**
 * OTP Cryptographic Utility Service
 * Provides cryptographically secure 6-digit OTP generation, keyed hashing,
 * and constant-time string comparison to prevent timing side-channel attacks.
 */
export class OTPCryptoService {
  private static getHashSecret(): string {
    const secret = process.env.OTP_HASH_SECRET || process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error("OTP_HASH_SECRET or SESSION_SECRET must be configured with at least 32 characters.");
    }
    return secret;
  }

  /**
   * Generates a cryptographically secure random 6-digit OTP (100000 - 999999).
   */
  static generateOTP(): string {
    const otpNumber = crypto.randomInt(100000, 1000000);
    return otpNumber.toString();
  }

  /**
   * Hashes a 6-digit OTP using a server-keyed HMAC.
   * Never store plain text OTPs in the database!
   * 
   * @param otp - 6-digit OTP string
   */
  static hashOTP(otp: string): string {
    return crypto.createHmac("sha256", this.getHashSecret()).update(otp.trim()).digest("hex");
  }

  /**
   * Compares two SHA-256 hashes in constant time to prevent timing attacks.
   * 
   * @param hashA - Submitted OTP hash
   * @param hashB - Stored OTP hash
   */
  static compareHashes(hashA: string, hashB: string): boolean {
    if (!hashA || !hashB || hashA.length !== hashB.length) {
      return false;
    }

    try {
      const bufA = Buffer.from(hashA, "hex");
      const bufB = Buffer.from(hashB, "hex");
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  /**
   * Verifies plain text OTP against a stored SHA-256 hash.
   * 
   * @param plainOTP - User submitted 6-digit OTP
   * @param storedHash - Hash from database
   */
  static verifyOTP(plainOTP: string, storedHash: string): boolean {
    const submittedHash = this.hashOTP(plainOTP);
    return this.compareHashes(submittedHash, storedHash);
  }
}
