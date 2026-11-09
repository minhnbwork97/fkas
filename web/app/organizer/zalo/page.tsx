"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BellRing, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { PitchMarkings } from "@/components/PitchMarkings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Autocomplete } from "@/components/ui/autocomplete";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

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
type Data = {
  configured: Record<"bot" | "openai" | "jev" | "cron", boolean>;
  accounts: Account[];
  players: Player[];
  groups: Group[];
};
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

const CONFIG_LABEL: Record<keyof Data["configured"], string> = {
  bot: "Bot Zalo",
  openai: "OpenAI",
  jev: "Jev",
  cron: "Nhắc tự động",
};

const time = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });

async function postAdmin(body: object) {
  const res = await fetch("/api/zalo/admin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminPin: pin(), ...body }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Lỗi ${res.status}`);
  return data;
}

export default function ZaloBotPage() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");

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
    try {
      const result = await postAdmin(body);
      toast.success(success);
      await load();
      return result;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Có lỗi xảy ra");
      return null;
    }
  };

  if (error) return <main className="max-w-3xl mx-auto p-6 text-sm text-red-600">{error}</main>;
  if (!data) {
    return (
      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </main>
    );
  }

  const linked = data.accounts.filter((a) => a.player);
  const pending = data.accounts.filter((a) => !a.player);
  const freePlayers = data.players.filter((p) => !p.linked);
  const link = (a: Account, playerId: string) => {
    const name = data.players.find((p) => p.id === playerId)?.name;
    return act({ action: "link", zaloUserId: a.zaloUserId, playerId }, `Đã liên kết ${a.displayName} với ${name}`);
  };

  return (
    <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
      <header className="pitch-surface relative overflow-hidden rounded-2xl border-b-4 border-floodlight px-5 py-5 sm:px-6">
        <PitchMarkings className="text-white/15" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="kit-label text-floodlight">Quản lý</p>
            <h1 className="text-3xl uppercase !text-white">Bot Zalo</h1>
            <p className="mt-1 text-sm text-white/80">
              {linked.length} thành viên đã liên kết · {pending.length} chờ liên kết ·{" "}
              {data.groups.filter((g) => g.notify).length}/{data.groups.length} nhóm nhận thông báo
            </p>
          </div>
          <Button
            size="sm"
            className="bg-floodlight text-pitch-deep hover:bg-floodlight/90"
            onClick={async () => {
              const r = await act({ action: "runReminders" }, "Đã chạy nhắc nhở");
              if (r) {
                toast.message(
                  `Đăng nhóm: ${r.groupPosts} · Nhắc điểm danh: ${r.attendanceNudges} · Nhắc nợ: ${r.paymentReminders}`
                );
              }
            }}
          >
            <BellRing /> Chạy nhắc nhở
          </Button>
        </div>
        <ul className="relative mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/85">
          {(Object.keys(CONFIG_LABEL) as (keyof Data["configured"])[]).map((k) => (
            <li key={k} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "size-2 rounded-full",
                  data.configured[k] ? "bg-emerald-300" : "bg-floodlight animate-pulse motion-reduce:animate-none"
                )}
              />
              {CONFIG_LABEL[k]}
              {!data.configured[k] && <span className="text-floodlight">chưa cài</span>}
            </li>
          ))}
        </ul>
      </header>

      <Tabs defaultValue={pending.length > 0 ? "pending" : "members"}>
        <TabsList className="w-full overflow-x-auto">
          <TabsTrigger value="pending">
            Chờ liên kết <Count n={pending.length} highlight={pending.length > 0} />
          </TabsTrigger>
          <TabsTrigger value="members">
            Thành viên <Count n={linked.length} />
          </TabsTrigger>
          <TabsTrigger value="groups">
            Nhóm <Count n={data.groups.length} />
          </TabsTrigger>
          <TabsTrigger value="log">Hội thoại</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 pt-2">
          <p className="text-sm text-gray-600">
            Người đã nhắn bot nhưng chưa gắn với cầu thủ. Chọn đúng cầu thủ để họ dùng được bot.
          </p>
          {pending.length === 0 ? (
            <Empty>
              Không có ai đang chờ. Ai nhắn riêng cho bot hoặc @nhắc bot trong nhóm sẽ hiện ở đây.
            </Empty>
          ) : (
            <ul className="space-y-3">
              {pending.map((a) => (
                <li key={a.zaloUserId} className="rounded-xl border bg-white p-4 space-y-3">
                  <div className="flex gap-3">
                    <Avatar name={a.displayName} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{a.displayName}</p>
                      {a.lastMessage ? (
                        <p className="text-sm text-gray-600">
                          <span className="text-gray-400">
                            {a.lastMessage.chatType === "GROUP" ? "Trong nhóm" : "Nhắn riêng"},{" "}
                            {time(a.lastMessage.createdAt)}:
                          </span>{" "}
                          “{a.lastMessage.text}”
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400">Chưa có tin nhắn nào được lưu</p>
                      )}
                    </div>
                  </div>
                  <PlayerPicker players={freePlayers} onPick={(id) => link(a, id)} />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="members" className="pt-2">
          <Members
            accounts={linked}
            freePlayers={freePlayers}
            onLink={link}
            onAdmin={(a, isAdmin) =>
              act(
                { action: "setAdmin", zaloUserId: a.zaloUserId, isAdmin },
                isAdmin ? `${a.player!.name} là admin` : `${a.player!.name} không còn là admin`
              )
            }
            onUnlink={(a) => {
              if (window.confirm(`Huỷ liên kết Zalo của ${a.player!.name}?`)) {
                act({ action: "unlink", zaloUserId: a.zaloUserId }, "Đã huỷ liên kết");
              }
            }}
          />
        </TabsContent>

        <TabsContent value="groups" className="space-y-3 pt-2">
          <p className="text-sm text-gray-600">
            Nhóm bật thông báo sẽ nhận tin trận mới và lời nhắc sáng ngày đá.
          </p>
          {data.groups.length === 0 ? (
            <Empty>Chưa có nhóm nào. Thêm bot vào nhóm rồi @nhắc bot một lần.</Empty>
          ) : (
            <ul className="rounded-xl border bg-white divide-y">
              {data.groups.map((g) => (
                <li key={g.chatId} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm">{g.chatId}</p>
                    <p className="text-xs text-gray-500">Hoạt động lần cuối {time(g.lastSeenAt)}</p>
                  </div>
                  <Toggle
                    label="Nhận thông báo"
                    checked={g.notify}
                    onChange={(notify) =>
                      act(
                        { action: "setGroupNotify", chatId: g.chatId, notify },
                        notify ? "Nhóm sẽ nhận thông báo" : "Đã tắt thông báo của nhóm"
                      )
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="log" className="pt-2">
          <ConversationLog />
        </TabsContent>
      </Tabs>
    </main>
  );
}

function Count({ n, highlight = false }: { n: number; highlight?: boolean }) {
  return (
    <span
      className={cn(
        "ml-1.5 rounded-full px-1.5 text-xs tabular-nums",
        highlight ? "bg-floodlight text-pitch-deep" : "bg-gray-200 text-gray-600"
      )}
    >
      {n}
    </span>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pitch font-display text-lg font-bold text-floodlight"
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed bg-white/60 px-4 py-8 text-center text-sm text-gray-500">
      {children}
    </p>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex shrink-0 items-center gap-2 rounded-md text-sm text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pitch"
    >
      {label}
      <span
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors",
          checked ? "bg-pitch" : "bg-gray-300"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform motion-reduce:transition-none",
            checked && "translate-x-4"
          )}
        />
      </span>
    </button>
  );
}

/** Search a team member who isn't linked to Zalo yet, then confirm */
function PlayerPicker({
  players,
  onPick,
}: {
  players: Player[];
  onPick: (playerId: string) => unknown;
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
          placeholder="Tìm cầu thủ theo tên hoặc số điện thoại"
        />
      </div>
      <Button disabled={!playerId} onClick={() => onPick(playerId)}>
        Liên kết
      </Button>
    </div>
  );
}

function Members({
  accounts,
  freePlayers,
  onLink,
  onAdmin,
  onUnlink,
}: {
  accounts: Account[];
  freePlayers: Player[];
  onLink: (a: Account, playerId: string) => Promise<unknown>;
  onAdmin: (a: Account, isAdmin: boolean) => void;
  onUnlink: (a: Account) => void;
}) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  if (accounts.length === 0) {
    return <Empty>Chưa ai liên kết. Cầu thủ nhắn riêng cho bot số điện thoại để tự liên kết.</Empty>;
  }

  const q = query.trim().toLowerCase();
  const shown = q
    ? accounts.filter((a) => `${a.player!.name} ${a.displayName}`.toLowerCase().includes(q))
    : accounts;

  return (
    <div className="space-y-3">
      {accounts.length > 8 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm thành viên"
            className="pl-9"
          />
        </div>
      )}
      <ul className="rounded-xl border bg-white divide-y">
        {shown.length === 0 && <li className="p-4 text-sm text-gray-500">Không tìm thấy ai.</li>}
        {shown.map((a) => (
          <li key={a.zaloUserId} className="space-y-2 px-4 py-3">
            <div className="flex items-center gap-3">
              <Avatar name={a.player!.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {a.player!.name}
                  {a.isAdmin && (
                    <span className="ml-2 rounded bg-floodlight px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-pitch-deep">
                      Admin
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-gray-500">Zalo: {a.displayName}</p>
              </div>
              <Toggle label="Admin" checked={a.isAdmin} onChange={(v) => onAdmin(a, v)} />
            </div>
            {editing === a.zaloUserId ? (
              <div className="space-y-2">
                <PlayerPicker
                  players={freePlayers}
                  onPick={async (id) => {
                    await onLink(a, id);
                    setEditing(null);
                  }}
                />
                <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                  Huỷ
                </Button>
              </div>
            ) : (
              <div className="flex gap-1 pl-12">
                <Button size="sm" variant="ghost" onClick={() => setEditing(a.zaloUserId)}>
                  Đổi cầu thủ
                </Button>
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => onUnlink(a)}>
                  Huỷ liên kết
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

type TurnPage = { turns: Turn[]; page: number; totalPages: number; total: number };

/** Paginated transcript: the member on the left, the bot on the right */
function ConversationLog() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<TurnPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/zalo/admin/turns?adminPin=${encodeURIComponent(pin())}&page=${page}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        if (!cancelled) setResult(d);
      })
      .catch(() => !cancelled && toast.error("Không tải được hội thoại"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page]);

  if (loading && !result) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (!result || result.total === 0) return <Empty>Chưa có tin nhắn nào với bot.</Empty>;

  const goTo = (next: number) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className={cn("space-y-4 transition-opacity", loading && "opacity-50")}>
      <ul className="space-y-5">
        {result.turns.map((t) => {
          const tools = (t.steps ?? []).flatMap((s) =>
            s.confirmed ? [`xác nhận ${s.confirmed}`] : (s.tools ?? []).map((x) => x.name)
          );
          const tokens = (t.inputTokens ?? 0) + (t.outputTokens ?? 0);
          return (
            <li key={t.messageId} className="space-y-1.5">
              <p className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">{t.who}</span> ·{" "}
                {t.chatType === "GROUP" ? "trong nhóm" : "nhắn riêng"} · {time(t.createdAt)}
              </p>
              <div className="w-fit max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3.5 py-2 text-sm ring-1 ring-gray-200">
                {t.text}
              </div>
              {t.reply && (
                <div className="ml-auto w-fit max-w-[85%] whitespace-pre-line rounded-2xl rounded-tr-sm bg-pitch px-3.5 py-2 text-sm text-white">
                  {t.reply}
                </div>
              )}
              {(tools.length > 0 || t.error || (t.durationMs ?? 0) > 0) && (
                <div className="flex flex-wrap justify-end gap-1">
                  {tools.map((name, i) => (
                    <span key={i} className="rounded bg-pitch/10 px-1.5 py-0.5 font-mono text-[11px] text-pitch">
                      {name}
                    </span>
                  ))}
                  {t.error && (
                    <span className="rounded bg-red-50 px-1.5 py-0.5 font-mono text-[11px] text-red-700">
                      lỗi: {t.error}
                    </span>
                  )}
                  {(t.durationMs ?? 0) > 0 && (
                    <span className="px-1 text-[11px] tabular-nums text-gray-400">
                      {(t.durationMs! / 1000).toFixed(1)}s
                      {tokens > 0 && ` · ${tokens.toLocaleString("vi-VN")} token`}
                    </span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {result.totalPages > 1 && (
        <nav aria-label="Phân trang hội thoại" className="flex items-center justify-between gap-3 border-t pt-4">
          <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => goTo(page - 1)}>
            <ChevronLeft /> Mới hơn
          </Button>
          <p className="text-center text-sm text-gray-600">
            Trang <span className="scoreboard text-base text-gray-900">{result.page}</span> / {result.totalPages}
            <span className="block text-xs text-gray-400">{result.total} lượt</span>
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= result.totalPages || loading}
            onClick={() => goTo(page + 1)}
          >
            Cũ hơn <ChevronRight />
          </Button>
        </nav>
      )}
    </div>
  );
}
