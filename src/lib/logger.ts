/**
 * Structured Application Logger for Auth & Security Auditing
 */
export const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${message}`, meta ? JSON.stringify(meta) : "");
  },
  warn: (message: string, meta?: Record<string, any>) => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, meta ? JSON.stringify(meta) : "");
  },
  error: (message: string, meta?: Record<string, any>) => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, meta ? JSON.stringify(meta) : "");
  },
  security: (action: string, phone: string, success: boolean, meta?: Record<string, any>) => {
    console.log(
      `[SECURITY AUDIT] [${new Date().toISOString()}] Action: ${action} | Phone: ${phone} | Status: ${
        success ? "SUCCESS" : "FAILED"
      }`,
      meta ? JSON.stringify(meta) : ""
    );
  },
};
