import type { KitSize } from "@prisma/client";

export const KIT_SIZES: KitSize[] = ["S", "M", "L", "XL", "XXL", "Other"];

export const KIT_SIZE_LABEL: Record<KitSize, string> = {
  S: "S",
  M: "M",
  L: "L",
  XL: "XL",
  XXL: "XXL",
  Other: "Khác",
};

export const KIT_ORDER_STATUS_LABEL = {
  Collecting: "Đang nhận đăng ký",
  Ordered: "Đã đặt may",
  Delivered: "Đã phát áo",
} as const;

type SummaryItem = {
  size: KitSize | null;
  sizeNote: string | null;
  number: number | null;
  amount: number;
  paid: boolean;
  selfReportedAt: Date | string | null;
};

export type KitOrderSummary = {
  itemCount: number;
  totalDue: number;
  totalPaid: number;
  totalRemaining: number;
  paidCount: number;
  unpaidCount: number;
  /** Chưa xác nhận nhưng cầu thủ báo đã chuyển khoản */
  pendingConfirmCount: number;
  /** Áo mua mới theo size; áo chỉ in không có size */
  sizeCounts: Record<KitSize, number>;
  printOnlyCount: number;
  /** Size "Khác" gom theo ghi chú, VD { "3XL": 2 } */
  otherSizeCounts: Record<string, number>;
  duplicateNumbers: number[];
};

export function summarizeKitOrder(items: SummaryItem[]): KitOrderSummary {
  const sizeCounts = Object.fromEntries(KIT_SIZES.map((s) => [s, 0])) as Record<
    KitSize,
    number
  >;
  const otherSizeCounts: Record<string, number> = {};
  const numberCounts = new Map<number, number>();
  let totalDue = 0;
  let totalPaid = 0;
  let paidCount = 0;
  let pendingConfirmCount = 0;
  let printOnlyCount = 0;

  for (const item of items) {
    totalDue += item.amount;
    if (item.paid) {
      totalPaid += item.amount;
      paidCount++;
    } else if (item.selfReportedAt) {
      pendingConfirmCount++;
    }
    if (!item.size) {
      printOnlyCount++;
    } else {
      sizeCounts[item.size]++;
    }
    if (item.size === "Other") {
      const key = item.sizeNote?.trim() || "?";
      otherSizeCounts[key] = (otherSizeCounts[key] ?? 0) + 1;
    }
    if (item.number !== null) {
      numberCounts.set(item.number, (numberCounts.get(item.number) ?? 0) + 1);
    }
  }

  return {
    itemCount: items.length,
    totalDue,
    totalPaid,
    totalRemaining: totalDue - totalPaid,
    paidCount,
    unpaidCount: items.length - paidCount,
    pendingConfirmCount,
    sizeCounts,
    printOnlyCount,
    otherSizeCounts,
    duplicateNumbers: [...numberCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([n]) => n)
      .sort((a, b) => a - b),
  };
}

export type KitItemFields = {
  size: KitSize | null;
  sizeNote: string | null;
  printName: string | null;
  number: number | null;
  printOnly: boolean;
};

const trimOrNull = (v: unknown): string | null =>
  typeof v === "string" && v.trim() ? v.trim() : null;

/**
 * Validate the shirt fields shared by organizer and self-registration.
 * Returns an error message, or the cleaned fields.
 */
export function parseKitItemFields(
  body: Record<string, unknown>
): { error: string } | { fields: KitItemFields } {
  // Print-only shirts are brought by the player, so they have no size
  const printOnly = body.printOnly === true;
  const size = printOnly ? null : (body.size as KitSize);
  if (size !== null && !KIT_SIZES.includes(size)) {
    return { error: "Vui lòng chọn size" };
  }
  const sizeNote = trimOrNull(body.sizeNote);
  if (size === "Other" && !sizeNote) {
    return { error: "Vui lòng ghi rõ size khi chọn Khác" };
  }

  let number: number | null = null;
  if (body.number !== null && body.number !== undefined && body.number !== "") {
    number = Number(body.number);
    if (!Number.isInteger(number) || number < 0 || number > 99) {
      return { error: "Số áo phải từ 0 đến 99" };
    }
  }

  const printName = trimOrNull(body.printName);
  if (printName && printName.length > 30) {
    return { error: "Tên in tối đa 30 ký tự" };
  }

  return {
    fields: {
      size,
      sizeNote: size === "Other" ? sizeNote : null,
      printName,
      number,
      printOnly,
    },
  };
}

export function priceFor(
  order: { defaultPrice: number; printOnlyPrice: number | null },
  printOnly: boolean
): number {
  return printOnly && order.printOnlyPrice !== null
    ? order.printOnlyPrice
    : order.defaultPrice;
}

const isPast = (deadline: Date | string | null) =>
  deadline !== null && new Date(deadline).getTime() <= Date.now();

/** Self-registration is open while collecting and before the deadline */
export function isRegistrationOpen(order: {
  status: string;
  deadline: Date | string | null;
}): boolean {
  return order.status === "Collecting" && !isPast(order.deadline);
}

/**
 * Status to show: "Expired" is derived (collecting but past the deadline),
 * never stored, so extending the deadline reopens registration by itself.
 */
export function displayStatus(order: {
  status: "Collecting" | "Ordered" | "Delivered";
  deadline: Date | string | null;
}): keyof typeof KIT_ORDER_DISPLAY_STATUS_LABEL {
  return order.status === "Collecting" && isPast(order.deadline)
    ? "Expired"
    : order.status;
}

export const KIT_ORDER_DISPLAY_STATUS_LABEL = {
  ...KIT_ORDER_STATUS_LABEL,
  Expired: "Hết hạn đăng ký",
} as const;

/**
 * Validate a deadline from a request body. Blank clears it. A new or
 * changed deadline must be in the future; an unchanged one may be past,
 * so other fields of an expired order can still be edited.
 */
export function parseDeadline(
  value: unknown,
  previous: Date | null = null
): { error: string } | { deadline: Date | null } {
  if (isBlank(value)) return { deadline: null };
  const deadline = new Date(value as string);
  if (typeof value !== "string" || Number.isNaN(deadline.getTime())) {
    return { error: "Hạn đăng ký không hợp lệ" };
  }
  const unchanged = previous !== null && previous.getTime() === deadline.getTime();
  if (!unchanged && isPast(deadline)) {
    return { error: "Hạn đăng ký phải sau thời điểm hiện tại" };
  }
  return { deadline };
}

/** "20:00 23/10/2026" */
export function formatDeadline(deadline: Date | string): string {
  const d = new Date(deadline);
  const time = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return `${time} ${d.toLocaleDateString("vi-VN")}`;
}

/** VietQR addInfo: ASCII only, max 50 chars */
export function formatKitPaymentDescription(
  orderName: string,
  playerName: string
): string {
  const ascii = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}+/gu, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^a-zA-Z0-9 ]+/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const text = `FKAS AO ${ascii(playerName)} ${ascii(orderName)}`.trim();
  return text.length > 50 ? text.slice(0, 50) : text;
}

export const isBlank = (v: unknown) => v === null || v === undefined || v === "";

/** Non-negative integer VND amount, or null when invalid */
export function parseMoney(v: unknown): number | null {
  if (isBlank(v)) return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

/** "L", "3XL" for size Khác, or "Chỉ in" */
export function sizeText(item: {
  size: KitSize | null;
  sizeNote: string | null;
}): string {
  if (!item.size) return "Chỉ in";
  return item.size === "Other" ? item.sizeNote ?? "Khác" : item.size;
}

/** Prisma include + display name shared by the organizer item endpoints */
export const kitItemInclude = {
  player: { select: { id: true, name: true, phone: true } },
} as const;

export function displayName(item: {
  guestName: string | null;
  player: { name: string } | null;
}): string {
  return item.player?.name ?? item.guestName ?? "?";
}

/** Image metadata only: never select `data` when listing */
export const kitImageSelect = {
  id: true,
  kind: true,
} as const;

export const MAX_KIT_IMAGE_BYTES = 3 * 1024 * 1024;
export const MAX_KIT_PREVIEW_IMAGES = 10;

export const kitImageUrl = (kitOrderId: string, imageId: string) =>
  `/api/kit-orders/${kitOrderId}/images/${imageId}`;

/** Value for an <input type="datetime-local"> in the browser's timezone */
export function toDateTimeLocal(value: Date | string | null): string {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

type OrderStatus = "Collecting" | "Ordered" | "Delivered";
const ORDER_STATUSES: OrderStatus[] = ["Collecting", "Ordered", "Delivered"];

/**
 * Work out the new status and deadline for an order edit.
 * - A new deadline must be valid and in the future (see parseDeadline).
 * - Changing the deadline (extending or removing it) reopens registration,
 *   unless the same request sets the status explicitly.
 * - "Collecting" can't be chosen while the deadline is past: extend it first.
 */
export function updateSchedule(
  existing: { status: OrderStatus; deadline: Date | null },
  body: Record<string, unknown>
):
  | { error: string }
  | { status: OrderStatus; deadline: Date | null; reopened: boolean } {
  let deadline = existing.deadline;
  if ("deadline" in body) {
    const parsed = parseDeadline(body.deadline, existing.deadline);
    if ("error" in parsed) return parsed;
    deadline = parsed.deadline;
  }

  let status = existing.status;
  if ("status" in body) {
    if (!ORDER_STATUSES.includes(body.status as OrderStatus)) {
      return { error: "Trạng thái không hợp lệ" };
    }
    status = body.status as OrderStatus;
  }

  const deadlineChanged =
    (deadline?.getTime() ?? null) !== (existing.deadline?.getTime() ?? null);
  if (deadlineChanged && !("status" in body)) status = "Collecting";

  if (
    status === "Collecting" &&
    (deadlineChanged || "status" in body) &&
    !isRegistrationOpen({ status, deadline })
  ) {
    return { error: "Hạn đăng ký đã qua, hãy gia hạn để mở lại đăng ký" };
  }

  return {
    status,
    deadline,
    reopened:
      !isRegistrationOpen(existing) && isRegistrationOpen({ status, deadline }),
  };
}
