import { prisma } from "./prisma";

/**
 * Execute a Prisma transaction with better error handling and timeout
 * @param fn The transaction function to execute
 * @param timeoutMs Timeout in milliseconds (default: 30000)
 * @returns Promise that resolves to the transaction result
 */
export async function executeTransaction<T>(
  fn: (
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
  ) => Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Transaction timeout - operation took too long"));
    }, timeoutMs);

    try {
      const result = await prisma.$transaction(fn, {
        timeout: timeoutMs,
        isolationLevel: "ReadCommitted",
      });
      clearTimeout(timeout);
      resolve(result);
    } catch (error) {
      clearTimeout(timeout);

      // Handle specific Prisma transaction errors
      if (error instanceof Error) {
        if (error.message.includes("Transaction not found")) {
          reject(new Error("Transaction expired - please try again"));
        } else if (error.message.includes("Connection")) {
          reject(new Error("Database connection error - please try again"));
        } else if (error.message.includes("timeout")) {
          reject(new Error("Operation timed out - please try again"));
        } else {
          reject(error);
        }
      } else {
        reject(new Error("Unknown database error"));
      }
    }
  });
}
