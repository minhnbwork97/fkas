/**
 * VietQR Payment QR Code Integration
 *
 * Uses VietQR Quick Link service to generate QR codes
 * Compatible with all Vietnamese banking apps
 * No webhooks needed, just manual confirmation
 */

export interface BankInfo {
  bankCode: string; // Required for VietQR - Bank BIN code (e.g., 970422 for MB Bank)
  accountNumber: string;
  accountName: string;
}

export interface PaymentQRParams {
  bankInfo: BankInfo;
  amount: number;
  description: string;
}

/**
 * Get bank info from environment variables
 *
 * Required environment variables for VietQR:
 * - BANK_CODE: Bank BIN code (e.g., "970422" for MB Bank, "970415" for Vietinbank)
 * - BANK_ACCOUNT_NUMBER: Your bank account number
 * - BANK_ACCOUNT_NAME: Account holder name
 *
 * @returns BankInfo if all variables are set, null otherwise
 */
export function getBankInfo(): BankInfo | null {
  const bankCode = process.env.BANK_CODE;
  const accountNumber = process.env.BANK_ACCOUNT_NUMBER;
  const accountName = process.env.BANK_ACCOUNT_NAME;

  // All three fields are required for VietQR
  if (!bankCode || !accountNumber || !accountName) {
    console.warn(
      "VietQR configuration incomplete. Required: BANK_CODE, BANK_ACCOUNT_NUMBER, BANK_ACCOUNT_NAME"
    );
    return null;
  }

  return {
    bankCode,
    accountNumber,
    accountName,
  };
}

/**
 * Generate VietQR Quick Link URL for Vietnamese bank transfer
 *
 * The VietQR Quick Link returns a pre-generated image that already contains
 * a properly formatted QR code that banking apps can scan.
 *
 * Format specification from VietQR.io:
 * https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<DESCRIPTION>&accountName=<ACCOUNT_NAME>
 *
 * Reference: https://vietqr.io/danh-sach-api/link-tao-ma-nhanh/
 *
 * @param params Payment QR parameters
 * @returns VietQR image URL that contains a scannable QR code
 */
export async function generatePaymentQR(
  params: PaymentQRParams
): Promise<string | null> {
  try {
    const { bankInfo, amount, description } = params;

    // BANK_ID: BIN code (e.g., 970415 for Vietinbank, 970422 for MB Bank)
    const bankId = bankInfo.bankCode;
    if (!bankId) {
      throw new Error(
        "Bank code (BANK_CODE) is required for VietQR generation"
      );
    }

    // ACCOUNT_NO: Bank account number (max 19 characters)
    const accountNo = bankInfo.accountNumber;

    // TEMPLATE: Choose compact2 (540x640) - includes QR, logos, and transfer info
    // Other options: compact, qr_only, print
    const template = "compact2";

    // AMOUNT: Positive number, max 13 digits
    const amountStr = amount.toString();

    // DESCRIPTION: Max 50 characters, no special characters
    // URL encode to handle Vietnamese characters
    const addInfo = encodeURIComponent(description);

    // ACCOUNT_NAME: Display name on the QR image
    const accountName = encodeURIComponent(bankInfo.accountName);

    // Generate VietQR Quick Link URL
    // This URL returns an IMAGE that already contains a properly formatted QR code
    // The QR code in this image uses the EMVCo standard that all VN banking apps recognize
    // We return this URL directly to be used as an image source
    const vietQRImageUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${amountStr}&addInfo=${addInfo}&accountName=${accountName}`;

    return vietQRImageUrl;
  } catch (error) {
    console.error("Error generating VietQR URL:", error);
    return null;
  }
}

/**
 * Format description for match payment
 */
export function formatMatchPaymentDescription(
  matchDate: Date,
  matchId?: string,
  playerName?: string
): string {
  const dateStr = matchDate.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // Base: include short match id if available (remove "Tran" per request)
  let base = matchId
    ? `FKAS ${dateStr} ${matchId.substring(0, 8)}`
    : `FKAS ${dateStr}`;

  // Optionally append player name
  if (playerName && playerName.trim().length > 0) {
    // Sanitize to ASCII: remove accents and non-alphanumeric (keep spaces)
    const asciiName = playerName
      .normalize("NFD")
      .replace(/\p{Diacritic}+/gu, "")
      .replace(/[^a-zA-Z0-9 ]+/g, "")
      .trim();
    if (asciiName) {
      base = `${base} - ${asciiName}`;
    }
  }

  // VietQR addInfo recommended max length ~50 chars; truncate defensively
  return base.length > 50 ? base.slice(0, 50) : base;
}
