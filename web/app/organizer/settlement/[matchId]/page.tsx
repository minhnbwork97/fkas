"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AutocompleteOption } from "@/components/ui/autocomplete";

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
    Array<{
      id: string;
      name: string;
      guestCount: number;
      isExistingPlayer?: boolean;
      playerId?: string;
    }>
  >([]);
  const [participantInput, setParticipantInput] = useState<string>("");
  const [availablePlayers, setAvailablePlayers] = useState<
    AutocompleteOption[]
  >([]);
  const [isLoadingPlayers, setIsLoadingPlayers] = useState(false);
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
                            playerId?: string;
                          }) => ({
                            id: x.id,
                            name: x.name,
                            guestCount: x.guestCount || 0,
                            isExistingPlayer: !!x.playerId,
                            playerId: x.playerId || undefined,
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

              // Load available players for autocomplete
              loadAvailablePlayers();
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
  }, [attendance, customParticipants, summary?.fieldCost, summary]); // Include summary to fix dependency warning

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
    calculateSummary,
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
            isExistingPlayer: p.isExistingPlayer,
            playerId: p.playerId,
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

    // Determine custom vs player from transaction (reliable even if not in attendance list)
    const isCustom = currentTransaction.isCustom === true;

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

        // Reload custom participants to maintain the list
        try {
          const pin = localStorage.getItem(PIN_KEY) || "";
          const customRes = await fetch(
            `/api/matches/${matchId}/custom-attendees?adminPin=${encodeURIComponent(
              pin
            )}`
          );
          if (customRes.ok) {
            const customData = await customRes.json();
            if (Array.isArray(customData.items)) {
              setCustomParticipants(
                customData.items.map(
                  (item: {
                    id: string;
                    name: string;
                    guestCount: number;
                    playerId?: string;
                  }) => ({
                    id: item.id,
                    name: item.name,
                    guestCount: item.guestCount || 0,
                    isExistingPlayer: !!item.playerId, // True if has playerId
                    playerId: item.playerId || undefined,
                  })
                )
              );
            }
          }
        } catch (error) {
          console.error("Failed to reload custom participants:", error);
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

  // Load available players for autocomplete
  const loadAvailablePlayers = async () => {
    const pin = localStorage.getItem(PIN_KEY);
    if (!pin) return;

    setIsLoadingPlayers(true);
    try {
      const response = await fetch(
        `/api/players?adminPin=${encodeURIComponent(pin)}`
      );
      if (response.ok) {
        const data = await response.json();
        const playerOptions: AutocompleteOption[] = data.players.map(
          (player: { id: string; name: string; phone?: string }) => ({
            value: player.id,
            label: player.name,
            secondary: player.phone ? `SĐT: ${player.phone}` : undefined,
          })
        );
        setAvailablePlayers(playerOptions);
      }
    } catch (error) {
      console.error("Failed to load players:", error);
    } finally {
      setIsLoadingPlayers(false);
    }
  };

  function addParticipant() {
    if (!participantInput.trim()) return;

    // Check if input matches an existing player (by ID or name)
    const existingPlayer = availablePlayers.find(
      (p) =>
        p.value === participantInput.trim() ||
        p.label.toLowerCase() === participantInput.trim().toLowerCase()
    );

    if (existingPlayer) {
      // Add existing player
      const isAlreadyAdded = customParticipants.some(
        (p) => p.playerId === existingPlayer.value
      );
      if (isAlreadyAdded) {
        setMsg("Cầu thủ này đã được thêm vào danh sách");
        return;
      }

      const newParticipant = {
        id: `player_${existingPlayer.value}`,
        name: existingPlayer.label,
        guestCount: 0,
        isExistingPlayer: true,
        playerId: existingPlayer.value,
      };

      setCustomParticipants((prev) => [...prev, newParticipant]);
    } else {
      // Add new custom participant
      const newParticipant = {
        id: `custom_${Date.now()}`,
        name: participantInput.trim(),
        guestCount: 0,
        isExistingPlayer: false,
      };

      setCustomParticipants((prev) => [...prev, newParticipant]);
    }

    setParticipantInput("");
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
    <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-start sm:items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-semibold">Thanh Toán Trận Đấu</h1>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button
            size="sm"
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
          <CardTitle className="text-lg sm:text-xl">Chi Phí Sân</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Chi phí sân:</span>
              <span className="text-lg font-semibold text-blue-600">
                {fieldCost.toLocaleString("vi-VN")} VND
              </span>
              {matchStatus === "Settled" && (
                <Badge variant="default" className="ml-0 sm:ml-2 bg-green-600">✓ Đã xác nhận thanh toán</Badge>
              )}
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <Button
                size="sm"
                onClick={calculateSummary}
                disabled={isLoadingSettlement || matchStatus === "Settled"}
              >
                {isLoadingSettlement ? "Đang tính..." : "Tính Toán"}
              </Button>
              {summary && matchStatus !== "Settled" && (
                <Button
                  size="sm"
                  onClick={confirmSettlement}
                  disabled={isConfirmingSettlement}
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isConfirmingSettlement ? "Đang xác nhận..." : "Xác Nhận Thanh Toán"}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Danh Sách Tham Gia Thực Tế</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {attendance.map((item) => (
              <div
                key={item.playerId}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 border rounded-lg gap-2"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium">{item.playerName}</span>
                    <Badge variant={item.status === "Attending" ? "default" : "secondary"}>
                      {item.status === "Attending" ? "Đã Xác Nhận" : "Không Xác Nhận"}
                    </Badge>
                    {item.isLate && <Badge variant="outline">Muộn</Badge>}
                  </div>

                  {/* Member Attendance Control - 2-State Button */}
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-medium">Thành viên tham gia:</span>
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
                        updateGuestsAttended(item.playerId, parseInt(e.target.value) || 0)
                      }
                      className="w-16 h-8 text-sm"
                    />
                    {item.guestsAttended > 0 && (
                      <Badge variant="default" className="text-xs">✓ {item.guestsAttended} khách</Badge>
                    )}
                  </div>

                  {item.note && <p className="text-sm text-gray-600 mt-1">{item.note}</p>}
                </div>
                <div className="text-left sm:text-right mt-2 sm:mt-0">
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>{item.memberAttended ? "✓ Thành viên có mặt" : "✗ Thành viên vắng mặt"}</div>
                    {item.guestsAttended > 0 && (
                      <div className="text-xs text-blue-600">+{item.guestsAttended} khách tham gia</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Guests Without Host Section */}
          {attendance.some((item) => !item.memberAttended && item.guestsAttended > 0) && (
            <div className="mt-6 pt-4 border-t">
              <h3 className="font-medium mb-3 text-orange-700">Khách Tham Gia Không Có Chủ</h3>
              <div className="space-y-2">
                {attendance
                  .filter((item) => !item.memberAttended && item.guestsAttended > 0)
                  .map((item) => (
                    <div
                      key={item.playerId}
                      className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-orange-800">{item.playerName} (không tham gia)</span>
                            <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800">Chủ không tham gia</Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-orange-700">Nhưng {item.guestsAttended} khách vẫn tham gia</span>
                            <Badge variant="default" className="text-xs">✓ {item.guestsAttended} khách</Badge>
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
            <h3 className="font-medium mb-3">Danh Sách Tham Gia Tùy Chỉnh</h3>

            {/* Unified Participant Input */}
            <div className="mb-4">
              <Label className="text-sm font-medium mb-2 block">Thêm người tham gia:</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Input
                    type="text"
                    value={participantInput}
                    onChange={(e) => setParticipantInput(e.target.value)}
                    placeholder="Tìm kiếm cầu thủ hoặc nhập tên mới..."
                    disabled={isLoadingPlayers}
                    onKeyDown={(e) => e.key === "Enter" && addParticipant()}
                    className="w-full"
                  />
                  {/* Custom dropdown for player suggestions */}
                  {participantInput.trim() && availablePlayers.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                      {availablePlayers
                        .filter((player) =>
                          player.label.toLowerCase().includes(participantInput.toLowerCase())
                        )
                        .slice(0, 10)
                        .map((player) => (
                          <button
                            key={player.value}
                            type="button"
                            onClick={() => {
                              setParticipantInput(player.label);
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                          >
                            <div className="flex flex-col">
                              <span>{player.label}</span>
                              {player.secondary && (
                                <span className="text-xs text-gray-500">{player.secondary}</span>
                              )}
                            </div>
                          </button>
                        ))}
                      {/* Option to add as new participant */}
                      {!availablePlayers.some(
                        (player) => player.label.toLowerCase() === participantInput.toLowerCase()
                      ) && (
                        <button
                          type="button"
                          onClick={() => addParticipant()}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-t border-gray-200"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-blue-600">+</span>
                            <span>Thêm &quot;{participantInput}&quot; làm người tham gia mới</span>
                          </div>
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <Button onClick={addParticipant} size="sm" disabled={!participantInput.trim() || isLoadingPlayers}>
                  {isLoadingPlayers ? "Đang tải..." : "Thêm"}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Tìm kiếm cầu thủ có sẵn hoặc nhập tên mới để thêm người tham gia</p>
            </div>

            {/* Custom Participants List */}
            {customParticipants.length > 0 && (
              <div className="space-y-2">
                {customParticipants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">{participant.name}</span>
                          <Badge
                            variant={participant.isExistingPlayer ? "default" : "outline"}
                            className="text-xs"
                          >
                            {participant.isExistingPlayer ? "Cầu thủ" : "Tùy chỉnh"}
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
                            <Badge variant="secondary" className="text-xs">+{participant.guestCount} khách</Badge>
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
            <CardTitle className="text-lg sm:text-xl">Tóm Tắt Thanh Toán</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-blue-600">{summary.totalAttended}</p>
                <p className="text-xs sm:text-sm text-gray-600">Tổng Tham Gia</p>
              </div>
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  {summary.fieldCost.toLocaleString("vi-VN")} VND
                </p>
                <p className="text-xs sm:text-sm text-gray-600">Chi Phí Sân</p>
              </div>
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-purple-600">
                  {summary.perPersonCost.toLocaleString("vi-VN")} VND
                </p>
                <p className="text-xs sm:text-sm text-gray-600">Mỗi Người</p>
              </div>
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold text-orange-600">
                  {summary.remainder.toLocaleString("vi-VN")} VND
                </p>
                <p className="text-xs sm:text-sm text-gray-600">Số Dư</p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-medium">Chi Tiết Thanh Toán:</h3>
              {summary.transactions.map((tx) => (
                <div
                  key={tx.playerId}
                  className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-gray-50 rounded-lg border gap-2"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={`paid-${tx.playerId}`}
                      checked={tx.paid}
                      onChange={() => togglePaymentStatus(tx.playerId)}
                      className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                    />
                    <label htmlFor={`paid-${tx.playerId}`} className="text-sm font-medium">
                      {tx.playerName}
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{tx.amount.toLocaleString("vi-VN")} VND</span>
                    {tx.paid && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">✓ Đã thanh toán</span>
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
