import crypto from "crypto";

/**
 * OTP Cryptographic Utility Service
 * Provides cryptographically secure 6-digit OTP generation, SHA-256 hashing,
 * and constant-time string comparison to prevent timing side-channel attacks.
 */
export class OTPCryptoService {
  /**
   * Generates a cryptographically secure random 6-digit OTP (100000 - 999999).
   */
  static generateOTP(): string {
    const otpNumber = crypto.randomInt(100000, 1000000);
    return otpNumber.toString();
  }

  /**
   * Hashes a 6-digit OTP using SHA-256.
   * Never store plain text OTPs in the database!
   * 
   * @param otp - 6-digit OTP string
   */
  static hashOTP(otp: string): string {
    return crypto.createHash("sha256").update(otp.trim()).digest("hex");
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
      const bufA = Buffer.from(hashA, "utf8");
      const bufB = Buffer.from(hashB, "utf8");
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
