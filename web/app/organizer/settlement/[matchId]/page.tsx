"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const PIN_KEY = "fkas_admin_pin";

type AttendanceActual = {
  playerId: string;
  playerName: string;
  status: string;
  isLate: boolean;
  note: string;
  memberAttended: boolean; // Whether the member themselves attended
  guestsAttended: number; // How many guests actually attended
};

type SettlementSummary = {
  totalAttended: number;
  fieldCost: number;
  perPersonCost: number;
  remainder: number;
  totalAmount: number;
  paidAmount: number;
  transactions: Array<{
    playerId: string;
    playerName: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    paid: boolean;
    isCustom?: boolean;
  }>;
};

export default function SettlementPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = useMemo(
    () => (Array.isArray(params.matchId) ? params.matchId[0] : params.matchId),
    [params.matchId]
  );
  const router = useRouter();

  const [attendance, setAttendance] = useState<AttendanceActual[]>([]);
  const [fieldCost, setFieldCost] = useState<number>(600000);
  const [summary, setSummary] = useState<SettlementSummary | null>(null);
  const [msg, setMsg] = useState("");
  const [isLoadingSettlement, setIsLoadingSettlement] = useState(false);
  const [isConfirmingSettlement, setIsConfirmingSettlement] = useState(false);
  const [matchStatus, setMatchStatus] = useState<string>("");
  const [customParticipants, setCustomParticipants] = useState<
    Array<{ id: string; name: string; guestCount: number }>
  >([]);
  const [newCustomName, setNewCustomName] = useState<string>("");
  const [hasAutoCalculated, setHasAutoCalculated] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    const pin = localStorage.getItem(PIN_KEY);
    if (!pin) {
      router.replace("/organizer/login");
      return;
    }

    // Load attendance data
    if (matchId) {
      const pin = localStorage.getItem(PIN_KEY);
      if (pin) {
        fetch(
          `/api/matches/${matchId}/attendance-list?adminPin=${encodeURIComponent(
            pin
          )}`
        )
          .then(async (r) => {
            if (r.ok) {
              const data = await r.json();
              const attendanceData = (data.attendance || []).map(
                (item: {
                  playerId: string;
                  playerName: string;
                  status: string;
                  guestCount: number;
                  isLate: boolean;
                  note: string;
                  memberAttended?: boolean;
                  guestsAttended?: number;
                }) => ({
                  ...item,
                  // Use actual attendance data if available, otherwise fall back to intent-based defaults
                  memberAttended:
                    item.memberAttended ?? item.status === "Attending",
                  guestsAttended:
                    item.guestsAttended ??
                    (item.status === "Attending" ? item.guestCount : 0),
                })
              );
              setAttendance(attendanceData);
            }
          })
          .catch(() => {});

        // Load match field cost and existing settlements/custom attendees
        fetch(`/api/matches/${matchId}`)
          .then(async (r) => {
            if (r.ok) {
              const data = await r.json();
              setFieldCost(data.fieldCost || 600000);
              setMatchStatus(data.status || "");

              // Load existing settlement data (try regardless of match status)
              setIsLoadingSettlement(true);
              fetch(
                `/api/matches/${matchId}/settlement?adminPin=${encodeURIComponent(
                  pin
                )}`
              )
                .then(async (settlementRes) => {
                  if (settlementRes.ok) {
                    const settlementData = await settlementRes.json();
                    if (
                      settlementData.settlements &&
                      settlementData.settlements.length > 0
                    ) {
                      // Create summary from existing settlement data (support player or custom attendee)
                      const transactions = settlementData.settlements.map(
                        (s: {
                          playerId?: string | null;
                          customId?: string | null;
                          player?: { name: string } | null;
                          custom?: { name: string } | null;
                          amount: number;
                          paid: boolean;
                        }) => ({
                          playerId: s.playerId ?? s.customId ?? "",
                          playerName: s.player?.name ?? s.custom?.name ?? "",
                          amount: s.amount,
                          paid: s.paid,
                        })
                      );

                      const totalAmount = transactions.reduce(
                        (sum: number, t: { amount: number }) => sum + t.amount,
                        0
                      );
                      const paidAmount = transactions.reduce(
                        (sum: number, t: { amount: number; paid: boolean }) =>
                          sum + (t.paid ? t.amount : 0),
                        0
                      );

                      setSummary({
                        totalAttended: transactions.length, // This will be recalculated properly when attendance data is available
                        fieldCost: data.fieldCost || 0,
                        perPersonCost: Math.floor(
                          (data.fieldCost || 0) / transactions.length
                        ),
                        remainder:
                          (data.fieldCost || 0) -
                          Math.floor(
                            (data.fieldCost || 0) / transactions.length
                          ) *
                            transactions.length,
                        totalAmount,
                        paidAmount,
                        transactions,
                      });
                    }
                  } else {
                    console.log(
                      "Settlement API error:",
                      settlementRes.status,
                      await settlementRes.text()
                    );
                  }
                })
                .catch((error) => {
                  console.log("Settlement loading error:", error);
                })
                .finally(() => {
                  setIsLoadingSettlement(false);
                });

              // Load existing custom attendees to prefill customParticipants list
              fetch(
                `/api/matches/${matchId}/custom-attendees?adminPin=${encodeURIComponent(
                  pin
                )}`
              )
                .then(async (res) => {
                  if (res.ok) {
                    const d = await res.json();
                    if (Array.isArray(d.items)) {
                      setCustomParticipants(
                        d.items.map(
                          (x: {
                            id: string;
                            name: string;
                            guestCount: number;
                          }) => ({
                            id: x.id,
                            name: x.name,
                            guestCount: x.guestCount || 0,
                          })
                        )
                      );
                    }
                  }
                })
                .catch(() => {})
                .finally(() => {
                  // Mark data as loaded after all initial data fetches are complete
                  setIsDataLoaded(true);
                });
            }
          })
          .catch(() => {});
      }
    }
  }, [router, matchId]);

  // Recalculate summary when attendance data changes (fixes initial load calculation bug)
  useEffect(() => {
    if (summary && attendance.length > 0) {
      // Recalculate total attended properly using actual attendance data
      const totalAttendedFromData =
        attendance.filter((a) => a.memberAttended).length + // Members who actually attended
        attendance.reduce((sum, a) => sum + a.guestsAttended, 0) + // Their actual guests who attended
        customParticipants.length + // Custom participants
        customParticipants.reduce((sum, a) => sum + a.guestCount, 0); // Custom participants' guests

      const actualTotalAttended = Math.max(totalAttendedFromData, 1); // Ensure at least 1

      // Only update if the calculation is different from current summary
      if (actualTotalAttended !== summary.totalAttended) {
        setSummary((prev) =>
          prev
            ? {
                ...prev,
                totalAttended: actualTotalAttended,
                perPersonCost: Math.floor(prev.fieldCost / actualTotalAttended),
                remainder:
                  prev.fieldCost -
                  Math.floor(prev.fieldCost / actualTotalAttended) *
                    actualTotalAttended,
              }
            : null
        );
      }
    }
  }, [attendance, customParticipants, summary?.fieldCost]); // Don't include summary to avoid infinite loop

  // Auto-calculate settlement on initial page load
  useEffect(() => {
    if (
      !hasAutoCalculated &&
      isDataLoaded &&
      attendance.length > 0 &&
      !summary &&
      !isLoadingSettlement
    ) {
      // Auto-calculate only once when all data is loaded and no existing settlement
      setHasAutoCalculated(true);
      calculateSummary();
    }
  }, [
    hasAutoCalculated,
    isDataLoaded,
    attendance.length,
    summary,
    isLoadingSettlement,
  ]);

  async function calculateSummary() {
    const customAttended = customParticipants; // All custom participants are considered attended

    // Calculate total attended: members who attended + their actual guests + custom participants + their guests
    const totalAttended =
      attendance.filter((a) => a.memberAttended).length + // Members who actually attended
      attendance.reduce((sum, a) => sum + a.guestsAttended, 0) + // Their actual guests who attended
      customAttended.length + // Custom participants
      customAttended.reduce((sum, a) => sum + a.guestCount, 0); // Custom participants' guests

    const perPersonCost = Math.floor(fieldCost / totalAttended);
    const remainder = fieldCost - perPersonCost * totalAttended;

    const transactions = [
      ...attendance.map((player) => ({
        playerId: player.playerId,
        playerName: player.playerName,
        amount:
          (player.memberAttended ? perPersonCost : 0) +
          player.guestsAttended * perPersonCost, // Member cost only if they attended, plus actual guests
        balanceBefore: 0, // Will be loaded from API
        balanceAfter: 0,
        paid: false, // Add payment tracking
      })),
      ...customAttended.map((participant) => ({
        playerId: participant.id,
        playerName: participant.name,
        amount: perPersonCost + participant.guestCount * perPersonCost,
        balanceBefore: 0,
        balanceAfter: 0,
        paid: false, // Add payment tracking
      })),
    ];

    // Auto-save attendance data
    setMsg("Đang lưu danh sách tham gia...");
    try {
      const pin = localStorage.getItem(PIN_KEY) || "";
      const res = await fetch(`/api/matches/${matchId}/settlement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminPin: pin,
          actualAttendees: attendance
            .filter((a) => a.memberAttended)
            .map((a) => a.playerId),
          fieldCost: fieldCost,
          totalAttended: totalAttended,
          attendanceData: attendance.map((a) => ({
            playerId: a.playerId,
            memberAttended: a.memberAttended,
            guestsAttended: a.guestsAttended,
          })),
          customParticipants: customAttended.map((p) => ({
            tempId: p.id,
            name: p.name,
            guestCount: p.guestCount,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || `Lỗi ${res.status}`);
        return;
      }

      setMsg("Đã lưu danh sách tham gia!");
      setTimeout(() => setMsg(""), 3000);
    } catch {
      setMsg("Lỗi kết nối. Vui lòng thử lại.");
      return;
    }

    // Prefer backend-calculated summary (ensures custom participants mapped to real playerIds)
    try {
      const pin = localStorage.getItem(PIN_KEY) || "";
      const res = await fetch(
        `/api/matches/${matchId}/settlement?adminPin=${encodeURIComponent(pin)}`
      );
      if (res.ok) {
        const s = await res.json();
        if (s.settlements) {
          const tx = s.settlements.map(
            (x: {
              playerId?: string | null;
              customId?: string | null;
              player?: { name: string } | null;
              custom?: { name: string } | null;
              amount: number;
              paid: boolean;
            }) => ({
              playerId: x.playerId ?? x.customId ?? "",
              playerName: x.player?.name ?? x.custom?.name ?? "",
              amount: x.amount,
              balanceBefore: 0,
              balanceAfter: 0,
              paid: x.paid,
              isCustom: !!x.customId,
            })
          );
          const totalAmount = tx.reduce(
            (sum: number, t: { amount: number }) => sum + t.amount,
            0
          );
          const paidAmount = tx.reduce(
            (sum: number, t: { amount: number; paid: boolean }) =>
              sum + (t.paid ? t.amount : 0),
            0
          );
          setSummary({
            totalAttended,
            fieldCost,
            perPersonCost,
            remainder,
            totalAmount,
            paidAmount,
            transactions: tx,
          });
          return;
        }
      }
    } catch {}

    // Fallback to local computation if backend fetch fails immediately
    {
      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
      const paidAmount = transactions.reduce(
        (sum, t) => sum + (t.paid ? t.amount : 0),
        0
      );

      setSummary({
        totalAttended,
        fieldCost,
        perPersonCost,
        remainder,
        totalAmount,
        paidAmount,
        transactions,
      });
    }
  }

  const togglePaymentStatus = async (playerId: string) => {
    if (!summary) return;

    const currentTransaction = summary.transactions.find(
      (t) => t.playerId === playerId
    );
    if (!currentTransaction) return;

    const newPaidStatus = !currentTransaction.paid;

    // Determine whether this is a custom attendee (id not in attendance list)
    const isCustom = !attendance.some((a) => a.playerId === playerId);

    try {
      const pin = localStorage.getItem(PIN_KEY) || "";
      const res = await fetch(`/api/matches/${matchId}/settlement/payment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminPin: pin,
          playerId: isCustom ? undefined : playerId,
          customId: isCustom ? playerId : undefined,
          paid: newPaidStatus,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setMsg(data.error || `Lỗi ${res.status}`);
        return;
      }

      // Update local state only after successful API call
      setSummary((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          transactions: prev.transactions.map((t) =>
            t.playerId === playerId ? { ...t, paid: newPaidStatus } : t
          ),
        };
      });
    } catch {
      setMsg("Lỗi khi cập nhật trạng thái thanh toán");
    }
  };

  const confirmSettlement = async () => {
    if (matchStatus === "Settled") {
      setMsg("Trận đấu đã được xác nhận thanh toán rồi");
      return;
    }

    if (!summary) {
      setMsg("Vui lòng tính toán trước khi xác nhận thanh toán");
      return;
    }

    setIsConfirmingSettlement(true);
    setMsg("");

    try {
      const pin = localStorage.getItem(PIN_KEY) || "";
      const response = await fetch(
        `/api/matches/${matchId}/confirm-settlement`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ adminPin: pin }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMatchStatus("Settled");
        const autoMarkedPaid = data.autoMarkedPaid || 0;
        const remainingUnpaid = data.remainingUnpaid || 0;
        setMsg(
          `✅ Đã xác nhận thanh toán trận đấu thành công!${
            autoMarkedPaid > 0
              ? ` Đã tự động đánh dấu thanh toán và trừ quỹ cho ${autoMarkedPaid} cầu thủ.`
              : ""
          }${
            remainingUnpaid > 0
              ? ` Còn ${remainingUnpaid} cầu thủ chưa có quỹ cần thanh toán thủ công.`
              : ""
          }`
        );

        // Reload settlements from backend to get accurate paid status
        try {
          const pin = localStorage.getItem(PIN_KEY) || "";
          const res = await fetch(
            `/api/matches/${matchId}/settlement?adminPin=${encodeURIComponent(
              pin
            )}`
          );
          if (res.ok) {
            const s = await res.json();
            if (s.settlements) {
              const tx = s.settlements.map(
                (x: {
                  playerId?: string | null;
                  customId?: string | null;
                  player?: { name: string } | null;
                  custom?: { name: string } | null;
                  amount: number;
                  paid: boolean;
                }) => ({
                  playerId: x.playerId ?? x.customId ?? "",
                  playerName: x.player?.name ?? x.custom?.name ?? "",
                  amount: x.amount,
                  balanceBefore: 0,
                  balanceAfter: 0,
                  paid: x.paid, // Use actual paid status from backend
                  isCustom: !!x.customId,
                })
              );
              const paidAmount = tx.reduce(
                (sum: number, t: { amount: number; paid: boolean }) =>
                  sum + (t.paid ? t.amount : 0),
                0
              );
              setSummary((prev) =>
                prev
                  ? {
                      ...prev,
                      transactions: tx,
                      paidAmount,
                    }
                  : null
              );
            }
          }
        } catch (error) {
          console.error("Error reloading settlements:", error);
        }
      } else {
        setMsg(data.error || "Có lỗi xảy ra khi xác nhận thanh toán");
      }
    } catch (error) {
      console.error("Error confirming settlement:", error);
      setMsg("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setIsConfirmingSettlement(false);
    }
  };

  function toggleMemberAttended(playerId: string) {
    setAttendance((prev) =>
      prev.map((a) =>
        a.playerId === playerId
          ? { ...a, memberAttended: !a.memberAttended }
          : a
      )
    );
    setSummary(null);
  }

  function updateGuestsAttended(playerId: string, newGuestsAttended: number) {
    setAttendance((prev) =>
      prev.map((a) =>
        a.playerId === playerId
          ? {
              ...a,
              guestsAttended: Math.max(0, newGuestsAttended),
            }
          : a
      )
    );
    setSummary(null);
  }

  function addCustomParticipant() {
    if (!newCustomName.trim()) return;

    const newParticipant = {
      id: `custom_${Date.now()}`,
      name: newCustomName.trim(),
      guestCount: 0,
    };

    setCustomParticipants((prev) => [...prev, newParticipant]);
    setNewCustomName("");
    setSummary(null);
  }

  function removeCustomParticipant(id: string) {
    setCustomParticipants((prev) => prev.filter((p) => p.id !== id));
    setSummary(null);
  }

  function updateCustomParticipantGuestCount(id: string, guestCount: number) {
    setCustomParticipants((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, guestCount: Math.max(0, guestCount) } : p
      )
    );
    setSummary(null);
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Thanh Toán Trận Đấu</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/organizer/matches/${matchId}`)}
          >
            Quay Lại
          </Button>
        </div>
      </div>

      {/* Field Cost Display */}
      <Card>
        <CardHeader>
          <CardTitle>Chi Phí Sân</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                Chi phí sân:
              </span>
              <span className="text-lg font-semibold text-blue-600">
                {fieldCost.toLocaleString("vi-VN")} VND
              </span>
              {matchStatus === "Settled" && (
                <Badge variant="default" className="ml-2 bg-green-600">
                  ✓ Đã xác nhận thanh toán
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={calculateSummary}
                disabled={isLoadingSettlement || matchStatus === "Settled"}
              >
                {isLoadingSettlement ? "Đang tính..." : "Tính Toán"}
              </Button>
              {summary && matchStatus !== "Settled" && (
                <Button
                  onClick={confirmSettlement}
                  disabled={isConfirmingSettlement}
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isConfirmingSettlement
                    ? "Đang xác nhận..."
                    : "Xác Nhận Thanh Toán"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance List */}
      <Card>
        <CardHeader>
          <CardTitle>Danh Sách Tham Gia Thực Tế</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {attendance.map((item) => (
              <div
                key={item.playerId}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">{item.playerName}</span>
                    <Badge
                      variant={
                        item.status === "Attending" ? "default" : "secondary"
                      }
                    >
                      {item.status === "Attending"
                        ? "Đã Xác Nhận"
                        : "Không Xác Nhận"}
                    </Badge>
                    {item.isLate && <Badge variant="outline">Muộn</Badge>}
                  </div>

                  {/* Member Attendance Control - 2-State Button */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-medium">
                      Thành viên tham gia:
                    </span>
                    <Button
                      variant={item.memberAttended ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleMemberAttended(item.playerId)}
                      className={`min-w-[100px] ${
                        item.memberAttended
                          ? "bg-green-600 hover:bg-green-700 text-white"
                          : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                    >
                      {item.memberAttended ? "✓ Có mặt" : "✗ Vắng mặt"}
                    </Button>
                  </div>

                  {/* Guest Control - Only one input for actual guests attended */}
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Số khách tham gia:</Label>
                    <Input
                      type="number"
                      min="0"
                      value={item.guestsAttended}
                      onChange={(e) =>
                        updateGuestsAttended(
                          item.playerId,
                          parseInt(e.target.value) || 0
                        )
                      }
                      className="w-16 h-8 text-sm"
                    />
                    {item.guestsAttended > 0 && (
                      <Badge variant="default" className="text-xs">
                        ✓ {item.guestsAttended} khách
                      </Badge>
                    )}
                  </div>

                  {item.note && (
                    <p className="text-sm text-gray-600 mt-1">{item.note}</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      {item.memberAttended
                        ? "✓ Thành viên có mặt"
                        : "✗ Thành viên vắng mặt"}
                    </div>
                    {item.guestsAttended > 0 && (
                      <div className="text-xs text-blue-600">
                        +{item.guestsAttended} khách tham gia
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Guests Without Host Section */}
          {attendance.some(
            (item) => !item.memberAttended && item.guestsAttended > 0
          ) && (
            <div className="mt-6 pt-4 border-t">
              <h3 className="font-medium mb-3 text-orange-700">
                Khách Tham Gia Không Có Chủ
              </h3>
              <div className="space-y-2">
                {attendance
                  .filter(
                    (item) => !item.memberAttended && item.guestsAttended > 0
                  )
                  .map((item) => (
                    <div
                      key={item.playerId}
                      className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-orange-800">
                              {item.playerName} (không tham gia)
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs bg-orange-100 text-orange-800"
                            >
                              Chủ không tham gia
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-orange-700">
                              Nhưng {item.guestsAttended} khách vẫn tham gia
                            </span>
                            <Badge variant="default" className="text-xs">
                              ✓ {item.guestsAttended} khách
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Custom Participants Section */}
          <div className="mt-6 pt-4 border-t">
            <h3 className="font-medium mb-3">Thêm Người Tham Gia Tùy Chỉnh</h3>

            {/* Add Custom Participant */}
            <div className="flex items-center gap-2 mb-4">
              <Input
                placeholder="Tên người tham gia..."
                value={newCustomName}
                onChange={(e) => setNewCustomName(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && addCustomParticipant()}
              />
              <Button onClick={addCustomParticipant} size="sm">
                Thêm
              </Button>
            </div>

            {/* Custom Participants List */}
            {customParticipants.length > 0 && (
              <div className="space-y-2">
                {customParticipants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">
                            {participant.name}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            Tùy chỉnh
                          </Badge>
                        </div>

                        {/* Guest Count Control for Custom Participant */}
                        <div className="flex items-center gap-2">
                          <Label className="text-sm">Số khách:</Label>
                          <Input
                            type="number"
                            min="0"
                            value={participant.guestCount}
                            onChange={(e) =>
                              updateCustomParticipantGuestCount(
                                participant.id,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-16 h-8 text-sm"
                          />
                          {participant.guestCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              +{participant.guestCount} khách
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeCustomParticipant(participant.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Xóa
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Settlement Summary */}
      {isLoadingSettlement && (
        <Card>
          <CardHeader>
            <CardTitle>Tóm Tắt Thanh Toán</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <p className="text-gray-600">Đang tải chi tiết thanh toán...</p>
            </div>
          </CardContent>
        </Card>
      )}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Tóm Tắt Thanh Toán</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {summary.totalAttended}
                </p>
                <p className="text-sm text-gray-600">Tổng Tham Gia</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {summary.fieldCost.toLocaleString("vi-VN")} VND
                </p>
                <p className="text-sm text-gray-600">Chi Phí Sân</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {summary.perPersonCost.toLocaleString("vi-VN")} VND
                </p>
                <p className="text-sm text-gray-600">Mỗi Người</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {summary.remainder.toLocaleString("vi-VN")} VND
                </p>
                <p className="text-sm text-gray-600">Số Dư</p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Chi Tiết Thanh Toán:</h3>
              {summary.transactions.map((tx) => (
                <div
                  key={tx.playerId}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={`paid-${tx.playerId}`}
                      checked={tx.paid}
                      onChange={() => togglePaymentStatus(tx.playerId)}
                      className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                    />
                    <label
                      htmlFor={`paid-${tx.playerId}`}
                      className="text-sm font-medium"
                    >
                      {tx.playerName}
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">
                      {tx.amount.toLocaleString("vi-VN")} VND
                    </span>
                    {tx.paid && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        ✓ Đã thanh toán
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {msg && <p className="text-sm text-gray-600">{msg}</p>}
    </main>
  );
}
