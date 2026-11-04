"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Autocomplete } from "@/components/ui/autocomplete";

const PIN_KEY = "fkas_admin_pin";
const pin = () => localStorage.getItem(PIN_KEY) || "";

type Account = {
  zaloUserId: string;
  displayName: string;
  isAdmin: boolean;
  linkedAt: string | null;
  player: { id: string; name: string } | null;
  lastMessage: { text: string; chatType: string; createdAt: string } | null;
};
type Player = { id: string; name: string; phone: string | null; linked: boolean };
type Group = { chatId: string; notify: boolean; lastSeenAt: string };
type Turn = {
  messageId: string;
  who: string;
  chatType: string;
  text: string;
  reply: string | null;
  steps: { tools?: { name: string }[]; confirmed?: string }[] | null;
  inputTokens: number | null;
  outputTokens: number | null;
  durationMs: number | null;
  error: string | null;
  createdAt: string;
};
type Data = {
  configured: Record<"bot" | "openai" | "jev" | "cron", boolean>;
  accounts: Account[];
  players: Player[];
  groups: Group[];
  turns: Turn[];
};

const time = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });

export default function ZaloBotPage() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/zalo/admin?adminPin=${encodeURIComponent(pin())}`);
    const d = await res.json();
    if (!res.ok) setError(d.error || `Lỗi ${res.status}`);
    else setData(d);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem(PIN_KEY)) {
      router.replace("/organizer/login");
      return;
    }
    load();
  }, [load, router]);

  const act = async (body: object, success: string) => {
    const res = await fetch("/api/zalo/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminPin: pin(), ...body }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(d.error || `Lỗi ${res.status}`);
      return null;
    }
    toast.success(success);
    await load();
    return d;
  };

  if (error) return <main className="max-w-3xl mx-auto p-6 text-sm text-red-600">{error}</main>;
  if (!data) {
    return (
      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </main>
    );
  }

  const linked = data.accounts.filter((a) => a.player);
  const unlinked = data.accounts.filter((a) => !a.player);
  const freePlayers = data.players.filter((p) => !p.linked);
  const link = async (a: Account, playerId: string) => {
    const name = data.players.find((p) => p.id === playerId)?.name;
    if (await act({ action: "link", zaloUserId: a.zaloUserId, playerId }, `Đã gán ${a.displayName} → ${name}`)) {
      setEditing(null);
    }
  };
  const missing = Object.entries(data.configured).filter(([, ok]) => !ok).map(([k]) => k);

  return (
    <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Bot Zalo</h1>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            const r = await act({ action: "runReminders" }, "Đã chạy nhắc nhở");
            if (r) {
              toast.message(
                `Nhóm: ${r.groupPosts} · Nhắc điểm danh: ${r.attendanceNudges} · Nhắc nợ: ${r.paymentReminders}`
              );
            }
          }}
        >
          Chạy nhắc nhở ngay
        </Button>
      </div>

      {missing.length > 0 && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Chưa cấu hình: {missing.join(", ")}.{" "}
          {missing.includes("jev") && "Thiếu Jev thì bot dùng OpenAI để hiểu câu xác nhận. "}
          {missing.includes("cron") && "Thiếu CRON_SECRET thì nhắc nhở hằng ngày không chạy."}
        </p>
      )}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          Chưa liên kết <span className="text-gray-500 font-normal">({unlinked.length})</span>
        </h2>
        <p className="text-sm text-gray-500">
          Những người đã nhắn cho bot nhưng chưa gắn với cầu thủ. Chọn cầu thủ tương ứng để liên kết.
        </p>
        <ul className="rounded-xl border bg-white divide-y">
          {unlinked.length === 0 && (
            <li className="p-4 text-sm text-gray-500">Không có ai đang chờ liên kết.</li>
          )}
          {unlinked.map((a) => (
            <li key={a.zaloUserId} className="space-y-2 px-4 py-3">
              <div>
                <p className="font-medium">{a.displayName}</p>
                {a.lastMessage && (
                  <p className="truncate text-xs text-gray-500">
                    {a.lastMessage.chatType === "GROUP" ? "Trong nhóm" : "Nhắn riêng"} lúc{" "}
                    {time(a.lastMessage.createdAt)}: “{a.lastMessage.text}”
                  </p>
                )}
              </div>
              <PlayerPicker players={freePlayers} onPick={(id) => link(a, id)} />
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          Tài khoản đã liên kết <span className="text-gray-500 font-normal">({linked.length})</span>
        </h2>
        <ul className="rounded-xl border bg-white divide-y">
          {linked.length === 0 && (
            <li className="p-4 text-sm text-gray-500">
              Chưa có ai. Cầu thủ nhắn riêng cho bot số điện thoại để liên kết.
            </li>
          )}
          {linked.map((a) => (
            <li key={a.zaloUserId} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{a.player!.name}</p>
                <p className="truncate text-xs text-gray-500">Zalo: {a.displayName}</p>
              </div>
              {editing === a.zaloUserId ? (
                <div className="w-full space-y-1">
                  <PlayerPicker players={freePlayers} onPick={(id) => link(a, id)} />
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    Huỷ
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setEditing(a.zaloUserId)}>
                  Đổi cầu thủ
                </Button>
              )}
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={a.isAdmin}
                  onChange={(e) =>
                    act(
                      { action: "setAdmin", zaloUserId: a.zaloUserId, isAdmin: e.target.checked },
                      e.target.checked ? "Đã cấp quyền admin" : "Đã bỏ quyền admin"
                    )
                  }
                />
                Admin
              </label>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600"
                onClick={() => {
                  if (window.confirm(`Huỷ liên kết Zalo của ${a.player!.name}?`)) {
                    act({ action: "unlink", zaloUserId: a.zaloUserId }, "Đã huỷ liên kết");
                  }
                }}
              >
                Huỷ liên kết
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Nhóm Zalo</h2>
        <ul className="rounded-xl border bg-white divide-y">
          {data.groups.length === 0 && (
            <li className="p-4 text-sm text-gray-500">
              Chưa có nhóm nào. Thêm bot vào nhóm rồi @nhắc bot một lần.
            </li>
          )}
          {data.groups.map((g) => (
            <li key={g.chatId} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm">{g.chatId}</p>
                <p className="text-xs text-gray-500">Hoạt động lần cuối {time(g.lastSeenAt)}</p>
              </div>
              <label className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={g.notify}
                  onChange={(e) =>
                    act(
                      { action: "setGroupNotify", chatId: g.chatId, notify: e.target.checked },
                      e.target.checked ? "Nhóm sẽ nhận thông báo" : "Đã tắt thông báo"
                    )
                  }
                />
                Nhận thông báo
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Hội thoại gần đây</h2>
        <ul className="rounded-xl border bg-white divide-y text-sm">
          {data.turns.length === 0 && <li className="p-4 text-gray-500">Chưa có tin nhắn nào.</li>}
          {data.turns.map((t) => {
            const tools = (t.steps ?? []).flatMap((s) =>
              s.confirmed ? [`xác nhận:${s.confirmed}`] : (s.tools ?? []).map((x) => x.name)
            );
            return (
              <li key={t.messageId} className="space-y-1 px-4 py-3">
                <p className="text-xs text-gray-500">
                  {time(t.createdAt)} · {t.who} · {t.chatType === "GROUP" ? "nhóm" : "riêng"}
                  {t.durationMs !== null && ` · ${(t.durationMs / 1000).toFixed(1)}s`}
                  {t.inputTokens !== null && ` · ${t.inputTokens + (t.outputTokens ?? 0)} token`}
                </p>
                <p>
                  <span className="text-gray-500">Hỏi:</span> {t.text}
                </p>
                {t.reply && (
                  <p className="whitespace-pre-line">
                    <span className="text-gray-500">Bot:</span> {t.reply}
                  </p>
                )}
                {tools.length > 0 && (
                  <p className="font-mono text-xs text-gray-500">{tools.join(" → ")}</p>
                )}
                {t.error && <p className="text-xs text-red-600">Lỗi: {t.error}</p>}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}

/** Search a team member who isn't linked to Zalo yet, then confirm */
function PlayerPicker({
  players,
  onPick,
}: {
  players: Player[];
  onPick: (playerId: string) => void;
}) {
  const [playerId, setPlayerId] = useState("");
  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <Autocomplete
          options={players.map((p) => ({
            value: p.id,
            label: p.name,
            secondary: p.phone ?? undefined,
          }))}
          value={playerId}
          onValueChange={setPlayerId}
          placeholder="Tìm cầu thủ chưa liên kết..."
        />
      </div>
      <Button size="sm" disabled={!playerId} onClick={() => onPick(playerId)}>
        Gán
      </Button>
    </div>
  );
}
