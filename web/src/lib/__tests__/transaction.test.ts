import { executeTransaction } from "../transaction";
import { prisma } from "../prisma";

// Mock prisma for testing
jest.mock("../prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

describe("executeTransaction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should execute transaction successfully", async () => {
    const mockResult = { id: "test-id" };
    (prisma.$transaction as jest.Mock).mockResolvedValue(mockResult);

    const result = await executeTransaction(async (tx) => {
      return mockResult;
    });

    expect(result).toEqual(mockResult);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 30000,
      isolationLevel: "ReadCommitted",
    });
  });

  it("should handle transaction timeout", async () => {
    (prisma.$transaction as jest.Mock).mockRejectedValue(
      new Error("Transaction timeout")
    );

    await expect(
      executeTransaction(async (tx) => {
        return {};
      }, 1000) // 1 second timeout
    ).rejects.toThrow("Transaction timeout");
  });

  it("should handle 'Transaction not found' error", async () => {
    (prisma.$transaction as jest.Mock).mockRejectedValue(
      new Error("Transaction not found")
    );

    await expect(
      executeTransaction(async (tx) => {
        return {};
      })
    ).rejects.toThrow("Transaction expired - please try again");
  });

  it("should handle connection errors", async () => {
    (prisma.$transaction as jest.Mock).mockRejectedValue(
      new Error("Connection lost")
    );

    await expect(
      executeTransaction(async (tx) => {
        return {};
      })
    ).rejects.toThrow("Database connection error - please try again");
  });
});
