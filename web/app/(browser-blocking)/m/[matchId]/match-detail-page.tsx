"use client";
import { PitchMarkings } from "@/components/PitchMarkings";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { getDeviceId } from "@/src/lib/deviceFingerprint";
import { toast } from "sonner";

type AttendanceStatus = "Attending" | "NotGoing" | "Tentative";

export const MatchAttendance: React.FC = () => {
  const params = useParams<{ matchId: string }>();
  const matchId = useMemo(
    () => (Array.isArray(params.matchId) ? params.matchId[0] : params.matchId),
    [params.matchId]
  );

  const [playerId, setPlayerId] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [phoneChecked, setPhoneChecked] = useState<boolean>(false);
  const [needName, setNeedName] = useState<boolean>(false);
  const [isLookingUpPhone, setIsLookingUpPhone] = useState<boolean>(false);
  // device recognition: find player via deviceId or fall back to phone flow
  useEffect(() => {
    const loadPlayerInfo = async () => {
      try {
        const deviceId = getDeviceId();
        if (deviceId) {
          const res = await fetch(`/api/device/${deviceId}/player`);
          if (res.ok) {
            const data = await res.json();
            setPlayerId(data.playerId);
            setPlayerName(data.name);
            setResult(`Chào mừng ${data.name}! Bạn đã được nhận diện tự động.`);
            setTimeout(() => setResult(""), 3000);
          } else {
            // Not recognized by device; require phone lookup
            setPhoneChecked(false);
          }
        } else {
          // No deviceId; require phone lookup
          setPhoneChecked(false);
        }
      } catch (error) {
        console.log("No device binding found; fallback to phone lookup");
        setPhoneChecked(false);
      }
    };

    loadPlayerInfo();
  }, []);
  const [status, setStatus] = useState<AttendanceStatus>("Attending");

  // Reset late status when not attending
  const handleStatusChange = (newStatus: AttendanceStatus) => {
    setStatus(newStatus);
    if (newStatus !== "Attending") {
      setIsLate(false);
    }
  };

  // Function to refresh all page data
  const refreshPageData = async (overridePlayerId?: string) => {
    try {
      setIsRefreshing(true);

      // Refresh current attendance data
      const attendanceRes = await fetch(
        `/api/matches/${matchId}/current-attendance`
      );
      if (attendanceRes.ok) {
        const attendanceData = await attendanceRes.json();
        setCurrentAttendance(attendanceData);
      }

      // Check if player's attendance status has changed
      const idToUse = overridePlayerId || playerId;
      if (idToUse) {
        const playerRes = await fetch(
          `/api/matches/${matchId}/player-attendance?playerId=${idToUse}`
        );
        if (playerRes.ok) {
          const playerData = await playerRes.json();

          if (playerData.hasAttendance) {
            setHasExistingAttendance(true);
            setExistingAttendance({
              status: playerData.attendance.status,
              guestCount: playerData.attendance.guestCount,
              isLate: playerData.attendance.isLate,
              note: playerData.attendance.note,
              updatedAt: playerData.attendance.updatedAt,
            });
          } else {
            setHasExistingAttendance(false);
            setExistingAttendance(null);
          }
        }
      }
    } catch (error) {
      console.error("Error refreshing page data:", error);
    } finally {
      setIsRefreshing(false);
    }
  };
  const [guestCount, setGuestCount] = useState<number>(0);
  const [isLate, setIsLate] = useState<boolean>(false);
  const [note, setNote] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [matchInfo, setMatchInfo] = useState<{
    dateTime: string;
    type: string;
  } | null>(null);
  const [currentAttendance, setCurrentAttendance] = useState<{
    attendance: Array<{
      playerName: string;
      status: string;
      guestCount: number;
      isLate: boolean;
      note: string | null;
      updatedAt: string;
    }>;
    summary: {
      totalPlayers: number;
      totalGuests: number;
      totalAttending: number;
      undecided: number;
      notGoing: number;
    };
  } | null>(null);
  const [isAttendanceExpanded, setIsAttendanceExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAttendanceDisabled, setIsAttendanceDisabled] = useState(false);
  const [isLateSubmission, setIsLateSubmission] = useState(false);
  const [hasExistingAttendance, setHasExistingAttendance] = useState(false);

  // Check attendance timing logic
  // Note: There are two different "late" concepts:
  // 1. isLateSubmission = Player submitting attendance after deadline (penalty applies)
  // 2. isLate = Player will arrive late to match (user's choice, no penalty for submission timing)
  const checkAttendanceTiming = (matchDateTime: string) => {
    const matchTime = new Date(matchDateTime);
    const now = new Date();
    const officialDeadline = new Date(matchTime.getTime() - 9 * 60 * 60 * 1000); // 9 hours before match

    // Check if match has already started
    if (now >= matchTime) {
      setIsAttendanceDisabled(true);
      return { disabled: true, reason: "match_started" };
    }

    // Check if submission is late (after official deadline)
    if (now > officialDeadline) {
      setIsLateSubmission(true);
      return { disabled: false, reason: "late_submission" };
    }

    return { disabled: false, reason: "on_time" };
  };
  const [existingAttendance, setExistingAttendance] = useState<{
    status: AttendanceStatus;
    guestCount: number;
    isLate: boolean;
    note: string | null;
    updatedAt: string;
  } | null>(null);

  useEffect(() => {
    if (!matchId) return;

    // Fetch match information and current attendance
    const loadMatchData = async () => {
      try {
        setIsLoading(true);

        // Fetch match info
        const matchRes = await fetch(`/api/matches/${matchId}`);
        if (matchRes.ok) {
          const matchData = await matchRes.json();
          setMatchInfo({
            dateTime: matchData.dateTime,
            type: matchData.type,
          });

          // Check attendance timing
          checkAttendanceTiming(matchData.dateTime);

          // Not settled, allow normal render
        }

        // Fetch current attendance
        const attendanceRes = await fetch(
          `/api/matches/${matchId}/current-attendance`
        );
        if (attendanceRes.ok) {
          const attendanceData = await attendanceRes.json();
          setCurrentAttendance(attendanceData);
        }
      } catch (error) {
        console.error("Error loading match data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadMatchData();
  }, [matchId]);

  // Do not render anything until match status check completes to avoid UI flash
  // no client-side redirect gate; server layout handles payment redirect

  // Debounced phone lookup flow when user finishes typing phone number
  useEffect(() => {
    if (playerId) return; // already identified
    const trimmed = phone.trim();
    if (!trimmed) {
      setPhoneChecked(false);
      setNeedName(false);
      return;
    }

    const handler = setTimeout(async () => {
      // Basic guard to reduce unnecessary calls for very short numbers
      if (trimmed.length < 8) {
        setPhoneChecked(false);
        setNeedName(false);
        return;
      }
      try {
        setIsLookingUpPhone(true);
        const r = await fetch(
          `/api/players/by-phone?phone=${encodeURIComponent(trimmed)}`
        );
        setPhoneChecked(true);
        if (r.ok) {
          const d = await r.json();
          if (d?.player?.id) {
            setPlayerId(d.player.id);
            setPlayerName(d.player.name || "");
            setNeedName(false);
            toast.success(`Đã tìm thấy: ${d.player.name || "Cầu thủ"}`);
          } else {
            setNeedName(true);
          }
        } else {
          setNeedName(true);
        }
      } catch {
        setNeedName(true);
      } finally {
        setIsLookingUpPhone(false);
      }
    }, 500);

    return () => clearTimeout(handler);
  }, [phone, playerId]);

  // Check for existing attendance when playerId is available (after status check)
  useEffect(() => {
    if (!playerId || !matchId) return;

    const checkExistingAttendance = async () => {
      try {
        const res = await fetch(
          `/api/matches/${matchId}/player-attendance?playerId=${playerId}`
        );
        if (res.ok) {
          const data = await res.json();

          if (data.hasAttendance) {
            setHasExistingAttendance(true);
            setExistingAttendance({
              status: data.attendance.status,
              guestCount: data.attendance.guestCount,
              isLate: data.attendance.isLate,
              note: data.attendance.note,
              updatedAt: data.attendance.updatedAt,
            });

            // Pre-fill form with existing data
            handleStatusChange(data.attendance.status);
            setGuestCount(data.attendance.guestCount);
            setIsLate(data.attendance.isLate);
            setNote(data.attendance.note || "");
          }
        }
      } catch (error) {
        console.error("Error checking existing attendance:", error);
      }
    };

    checkExistingAttendance();
  }, [playerId, matchId, playerName]);

  // Load previous selections when playerId is available (after status check)
  useEffect(() => {
    if (!playerId) return;

    // Load previous selections
    try {
      const key = `fkas_prev_${playerId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const prev = JSON.parse(raw) as {
          status?: AttendanceStatus;
          guestCount?: number;
          isLate?: boolean;
          note?: string;
        };
        if (prev.status) setStatus(prev.status);
        if (typeof prev.guestCount === "number") setGuestCount(prev.guestCount);
        if (typeof prev.isLate === "boolean") setIsLate(prev.isLate);
        if (typeof prev.note === "string") setNote(prev.note);
      }
    } catch {}
  }, [playerId]);

  async function submit() {
    // Check if attendance is disabled
    if (isAttendanceDisabled) {
      toast.error("Điểm danh đã bị vô hiệu hóa vì trận đấu đã bắt đầu!");
      return;
    }

    // Ensure we have a player; create one if needed using phone+name
    let effectivePlayerId = playerId;
    if (!effectivePlayerId) {
      if (!phone.trim()) {
        toast.error("Vui lòng nhập số điện thoại");
        return;
      }
      if (!playerName.trim()) {
        toast.error("Vui lòng nhập tên");
        return;
      }
      try {
        const createRes = await fetch(`/api/players`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: playerName.trim(),
            phone: phone.trim(),
          }),
        });
        if (createRes.ok) {
          const d = await createRes.json();
          effectivePlayerId = d.player.id as string;
          setPlayerId(effectivePlayerId);
        } else {
          const err = await createRes.json().catch(() => ({}));
          toast.error(err.error || "Không thể tạo tài khoản cầu thủ");
          return;
        }
      } catch (e) {
        toast.error("Lỗi kết nối khi tạo tài khoản");
        return;
      }
    }

    setIsSubmitting(true);
    setResult("Đang gửi...");

    try {
      const res = await fetch(`/api/matches/${matchId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: effectivePlayerId,
          status,
          isLate: isLate, // This is for "will arrive late to match" - user's choice
          note,
          guestCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errorMsg = `Lỗi: ${data.error || res.status}`;
        setResult(errorMsg);
        toast.error(errorMsg);
        return;
      }
      const successMessage = hasExistingAttendance
        ? "Đã cập nhật điểm danh!"
        : "Đã lưu điểm danh!";
      const lateSubmissionMessage = isLateSubmission
        ? " (Điểm danh sau giờ quy định)"
        : "";

      setResult(successMessage + lateSubmissionMessage);

      // Show toast notification
      toast.success(successMessage + lateSubmissionMessage);

      try {
        localStorage.setItem("fkas_player_id", effectivePlayerId);
      } catch {}

      // persist current selection
      try {
        if (effectivePlayerId) {
          const key = `fkas_prev_${effectivePlayerId}`;
          localStorage.setItem(
            key,
            JSON.stringify({ status, guestCount, isLate, note })
          );
        }
      } catch {}

      // Refresh all page data to reflect the latest state
      await refreshPageData(effectivePlayerId);
    } catch (error) {
      setResult("Lỗi kết nối. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Loading skeleton component
  const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
  );

  // No longer redirecting to join; inline phone/name flow instead

  if (isLoading) {
    return (
      <main className="max-w-xl mx-auto p-4 sm:p-5 space-y-3 sm:space-y-4">
        <h1 className="text-xl sm:text-2xl font-semibold">
          Điểm Danh Trận Đấu
        </h1>

        {/* Match Info Skeleton */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
          <div className="space-y-1">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>

        {/* Player Recognition Skeleton */}
        <div className="space-y-2">
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <Skeleton className="h-4 w-24" />
          </div>
        </div>

        {/* Attendance Form Skeleton */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 space-y-3 sm:space-y-4">
          {/* Form Header */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>

          {/* Radio Button Status Selection Skeleton */}
          <div className="space-y-3">
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="h-4 w-4 rounded-full bg-gray-200"></div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grid Layout for Guest Count and Late Checkbox */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex items-center gap-2 sm:mt-8">
              <div className="h-4 w-4 rounded bg-gray-200"></div>
              <Skeleton className="h-4 w-24" />
            </div>
          </div>

          {/* Notes Section Skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-16 w-full" />
          </div>

          {/* Submit Button Skeleton */}
          <Skeleton className="h-12 w-full" />
        </div>

        {/* Quick Guide Skeleton */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <Skeleton className="h-4 w-24 mb-2" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>

        {/* Deadline Info Skeleton */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <Skeleton className="h-4 w-32 mb-3" />
          <div className="space-y-2">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-48" />
            </div>
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        </div>

        {/* Penalty Info Skeleton */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
          <Skeleton className="h-4 w-24 mb-3" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>

        {/* Attendance Status Skeleton */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg">
          <div className="p-3 sm:p-4">
            <Skeleton className="h-4 w-32 mb-1" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto p-4 sm:p-5 space-y-3 sm:space-y-4">
      <h1 className="text-xl sm:text-2xl font-semibold">Điểm Danh Trận Đấu</h1>

      {/* Match Information - Priority 1 */}
      {matchInfo && (
        <div className="pitch-surface relative overflow-hidden rounded-xl border-b-4 border-floodlight px-4 py-4 sm:px-5 sm:py-5 shadow-[0_10px_24px_-14px_oklch(0.27_0.06_162/0.6)]">
          <PitchMarkings className="text-white/20" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="kit-label text-floodlight">Thời gian</p>
              <p className="scoreboard text-[1.7rem] sm:text-3xl leading-tight text-white whitespace-nowrap">
                {new Date(matchInfo.dateTime).toLocaleString("vi-VN")}
              </p>
            </div>
            <div className="sm:text-right">
              <p className="kit-label text-floodlight">Loại trận</p>
              <p className="text-sm font-semibold text-white">
                {matchInfo.type === "Internal" ? "Nội bộ" : "Đấu với đội khác"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Player Recognition - Priority 2 */}
      {playerName && (
        <div className="space-y-2">
          <div className="p-3 bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pitch font-display text-lg font-bold text-floodlight ring-2 ring-floodlight/60"
              >
                {playerName.trim().charAt(0).toUpperCase()}
              </span>
              <span className="font-semibold text-gray-900 text-base">
                {playerName}
              </span>
            </div>
          </div>
        </div>
      )}
      {!playerId && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-[0_1px_0_var(--color-gray-200),0_8px_20px_-14px_oklch(0.27_0.06_162/0.3)] space-y-3 sm:space-y-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            Xác Nhận Danh Tính
          </h2>
          <div className="space-y-2">
            <Label className="text-sm sm:text-base">Số Điện Thoại</Label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setPhoneChecked(false);
                setNeedName(false);
                setPlayerId("");
                setPlayerName("");
              }}
              placeholder="Ví dụ: 0912345678"
              className="text-base"
              style={{ fontSize: "16px" }}
            />
            {isLookingUpPhone && (
              <p className="text-xs text-gray-600">
                Đang kiểm tra số điện thoại...
              </p>
            )}
          </div>
          {phoneChecked && !playerId && (
            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Tên</Label>
              <Input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Nhập tên của bạn"
                className="text-base"
                style={{ fontSize: "16px" }}
              />
              <p className="text-xs text-gray-600">
                Vui lòng nhập tên sau đó tiếp tục điểm danh.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Attendance Form - Priority 3 (Main Content) */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 shadow-[0_1px_0_var(--color-gray-200),0_8px_20px_-14px_oklch(0.27_0.06_162/0.3)] space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            {hasExistingAttendance ? "Cập Nhật Điểm Danh" : "Điểm Danh"}
          </h2>
          {hasExistingAttendance && existingAttendance && (
            <div className="text-xs sm:text-sm text-gray-500">
              Cập nhật lần cuối:{" "}
              {new Date(existingAttendance.updatedAt).toLocaleString("vi-VN")}
            </div>
          )}
        </div>

        {hasExistingAttendance && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-blue-800">
                Đã ghi nhận điểm danh.
              </span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {(["Attending", "NotGoing", "Tentative"] as AttendanceStatus[]).map(
              (s) => (
                <div key={s} className="relative">
                  <input
                    type="radio"
                    id={`status-${s}`}
                    name="attendance-status"
                    value={s}
                    checked={status === s}
                    onChange={() => handleStatusChange(s)}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`status-${s}`}
                    className={`flex h-full min-h-[88px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 px-1.5 py-3 text-center text-[0.8rem] sm:text-sm font-semibold leading-tight transition-all peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50 active:scale-[0.98] ${
                      status === s
                        ? s === "Attending"
                          ? "border-green-600 bg-green-50 text-green-800 shadow-[inset_0_-4px_0_var(--color-green-600)]"
                          : s === "NotGoing"
                          ? "border-red-500 bg-red-50 text-red-700 shadow-[inset_0_-4px_0_var(--color-red-500)]"
                          : "border-amber-400 bg-amber-50 text-amber-800 shadow-[inset_0_-4px_0_var(--color-amber-400)]"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span
                      className={`font-display text-3xl font-bold leading-none ${
                        s === "Attending"
                          ? "text-green-600"
                          : s === "NotGoing"
                          ? "text-red-600"
                          : "text-amber-500"
                      }`}
                    >
                      {s === "Attending" ? "✓" : s === "NotGoing" ? "✗" : "?"}
                    </span>
                    {s === "Attending"
                      ? "Tham Gia"
                      : s === "NotGoing"
                      ? "Không Tham Gia"
                      : "Chưa Quyết Định"}
                  </Label>
                </div>
              )
            )}
          </div>
        </div>

        <div className="grid grid-cols-1">
          <div className="space-y-2">
            <Label className="text-sm sm:text-base">Thêm Bạn Bè</Label>
            <Input
              type="number"
              min={0}
              value={guestCount}
              onChange={(e) =>
                setGuestCount(Math.max(0, Number(e.target.value) || 0))
              }
              placeholder="0"
              className="text-base"
              style={{ fontSize: "16px" }}
            />
          </div>

          {status === "Attending" && (
            <div className="flex items-center gap-2 mt-4">
              <Checkbox
                id="late"
                checked={isLate}
                onCheckedChange={(v: boolean) => setIsLate(Boolean(v))}
                className="h-4 w-4"
              />
              <Label htmlFor="late" className="text-sm sm:text-base">
                Tôi sẽ đến muộn
              </Label>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm sm:text-base">Ghi Chú</Label>
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú thêm (tùy chọn)..."
            className="text-base resize-none"
            style={{ fontSize: "16px" }}
          />
        </div>

        {/* Late submission warning */}
        {isLateSubmission && !isAttendanceDisabled && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="text-yellow-600">⚠️</div>
              <span className="text-sm font-medium text-yellow-800">
                Bạn đang điểm danh sau giờ quy định.
              </span>
            </div>
          </div>
        )}

        {/* Attendance disabled message */}
        {isAttendanceDisabled && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <div className="text-red-600">🚫</div>
              <span className="text-sm font-medium text-red-800">
                Điểm danh đã bị vô hiệu hóa vì trận đấu đã bắt đầu.
              </span>
            </div>
          </div>
        )}

        <Button
          onClick={submit}
          disabled={
            (!playerId && (!phone.trim() || !playerName.trim())) ||
            isSubmitting ||
            isAttendanceDisabled
          }
          className="w-full h-12 bg-floodlight font-display text-lg uppercase tracking-wide text-pitch-deep shadow-[inset_0_-3px_0_rgb(0_0_0/0.12)] hover:bg-floodlight/90"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pitch-deep"></div>
              {hasExistingAttendance ? "Đang cập nhật..." : "Đang lưu..."}
            </div>
          ) : isAttendanceDisabled ? (
            "Điểm Danh Đã Bị Vô Hiệu Hóa"
          ) : hasExistingAttendance ? (
            "Cập Nhật Điểm Danh"
          ) : (
            "Lưu Điểm Danh"
          )}
        </Button>
      </div>

      {/* Quick Guide - Secondary Info */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="kit-label text-blue-700 mb-2">
          Hướng Dẫn Nhanh
        </h2>
        <div className="text-xs sm:text-sm text-gray-700 space-y-1.5 [&_strong]:text-gray-900">
          <p>
            <strong>1 (Tham Gia):</strong> Tôi sẽ đến chơi
          </p>
          <p>
            <strong>0.5 (Chưa Quyết Định):</strong> Chưa chắc chắn
          </p>
          <p>
            <strong>0 (Không Tham Gia):</strong> Không thể tham gia
          </p>
          <p>
            <strong>+N Bạn Bè:</strong> Mang theo bạn bè (họ được tính vào số
            lượng đội)
          </p>
          <p>
            <strong>Muộn:</strong> Sẽ đến sau{" "}
            {matchInfo
              ? new Date(matchInfo.dateTime).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "19:00"}
          </p>
        </div>
      </div>

      {/* Attendance Rules - Important Info */}
      {matchInfo && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="kit-label text-blue-700 mb-3">
            Thời Hạn Điểm Danh
          </h2>
          <div className="text-xs sm:text-sm text-gray-700 space-y-2">
            {(() => {
              const matchTime = new Date(matchInfo.dateTime);
              const officialDeadline = new Date(
                matchTime.getTime() - 9 * 60 * 60 * 1000
              );
              const lateNotificationDeadline = new Date(
                matchTime.getTime() - 1 * 60 * 60 * 1000
              );

              return (
                <div className="space-y-2">
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <p className="font-semibold text-blue-900 mb-1">
                      ⏰ Điểm danh chính thức
                    </p>
                    <p className="text-blue-800">
                      Trước:{" "}
                      {officialDeadline.toLocaleString("vi-VN", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <p className="font-semibold text-blue-900 mb-1">
                      📢 Thông báo đến muộn
                    </p>
                    <p className="text-blue-800">
                      Trước:{" "}
                      {lateNotificationDeadline.toLocaleString("vi-VN", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Penalty Information - Separate Section */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <h2 className="kit-label text-blue-700 mb-3 flex items-center gap-2">
          <span aria-hidden="true" className="flex gap-0.5">
            <span className="inline-block h-4 w-3 -rotate-6 rounded-[2px] bg-yellow-400 shadow-sm" />
            <span className="inline-block h-4 w-3 rotate-6 rounded-[2px] bg-red-600 shadow-sm" />
          </span>
          Quy Định Phạt
        </h2>
        <div className="text-xs sm:text-sm text-gray-700 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="font-semibold text-gray-900 flex items-center gap-2">
                <span aria-hidden="true" className="inline-block h-3.5 w-2.5 rounded-[2px] bg-yellow-400" />
                Phạt thời gian:
              </p>
              <p>• Điểm danh muộn: 10.000 VND</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-gray-900 flex items-center gap-2">
                <span aria-hidden="true" className="inline-block h-3.5 w-2.5 rounded-[2px] bg-red-600" />
                Phạt vi phạm:
              </p>
              <p>• Báo tham gia nhưng không đi: 50.000 VND</p>
              <p>• Đi muộn: 1.000 VND/phút</p>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Attendance Status - Secondary Info */}
      {currentAttendance && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setIsAttendanceExpanded(!isAttendanceExpanded)}
            className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors touch-manipulation"
          >
            <div>
              <h2 className="font-bold text-gray-900 text-lg">
                Tình Hình Điểm Danh
                {isRefreshing && (
                  <span className="ml-2 text-xs text-blue-600">
                    (đang cập nhật...)
                  </span>
                )}
              </h2>
              <p className="text-xs sm:text-sm text-gray-600">
                {currentAttendance.summary.totalAttending} người tham gia •{" "}
                {currentAttendance.summary.totalPlayers} cầu thủ
              </p>
            </div>
            <div
              className={`transform transition-transform ${
                isAttendanceExpanded ? "rotate-180" : ""
              }`}
            >
              <svg
                className="w-4 h-4 sm:w-5 sm:h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </button>

          {isAttendanceExpanded && (
            <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
              {/* Summary Stats */}
              <div className="scoreboard-panel grid grid-cols-3 gap-2 sm:gap-4 rounded-lg p-3 text-center">
                <div className="p-1">
                  <div className="text-3xl font-bold text-green-600">
                    {currentAttendance.summary.totalPlayers}
                  </div>
                  <div className="kit-label text-white/70">Cầu Thủ</div>
                </div>
                <div className="p-1 border-x border-white/10">
                  <div className="text-3xl font-bold text-blue-600">
                    {currentAttendance.summary.totalGuests}
                  </div>
                  <div className="kit-label text-white/70">Khách</div>
                </div>
                <div className="p-1">
                  <div className="text-3xl font-bold text-floodlight">
                    {currentAttendance.summary.totalAttending}
                  </div>
                  <div className="kit-label text-white/70">Tổng</div>
                </div>
              </div>

              {/* Confirmed Attendees List */}
              {currentAttendance.attendance.filter(
                (p) => p.status === "Attending"
              ).length > 0 && (
                <div className="space-y-2">
                  <h3 className="kit-label text-gray-600">
                    Danh Sách Tham Gia:
                  </h3>
                  <div className="max-h-48 sm:max-h-56 overflow-y-auto space-y-1">
                    {currentAttendance.attendance
                      .filter((player) => player.status === "Attending")
                      .map((player, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between text-sm bg-gray-50 rounded-md px-3 py-2 border border-gray-100"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="scoreboard w-5 shrink-0 text-center text-blue-700">
                              {index + 1}
                            </span>
                            <span className="font-medium truncate">
                              {player.playerName}
                            </span>
                            {player.guestCount > 0 && (
                              <span className="text-gray-600 text-xs flex-shrink-0">
                                +{player.guestCount}
                              </span>
                            )}
                            {player.isLate && (
                              <span className="text-orange-600 text-xs flex-shrink-0">
                                (muộn)
                              </span>
                            )}
                          </div>
                          <span className="text-gray-500 text-xs flex-shrink-0 ml-2">
                            {new Date(player.updatedAt).toLocaleTimeString(
                              "vi-VN",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
};
