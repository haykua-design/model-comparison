import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MentionItem, Message, RealtimeChatProps } from "./types";

function toDate(value: Message["createdAt"]): Date {
  if (value instanceof Date) return value;
  return new Date(value);
}

function formatTime(value: Message["createdAt"]): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(date);
}

function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase()).join("");
}

type MentionState =
  | { open: false }
  | { open: true; query: string; startIndex: number; endIndex: number; activeIndex: number };

function findMentionAtCursor(value: string, cursor: number): { query: string; startIndex: number; endIndex: number } | null {
  const before = value.slice(0, cursor);
  const match = /(^|\s|[\[({<（【])@([^\s@]*)$/.exec(before);
  if (!match) return null;

  const at = before.lastIndexOf("@");
  if (at < 0) return null;
  return { query: match[2] ?? "", startIndex: at, endIndex: cursor };
}

function Avatar({ name, url }: { name: string; url?: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-black/5"
        loading="lazy"
      />
    );
  }

  return (
    <div className="h-9 w-9 shrink-0 rounded-full bg-slate-200 text-slate-700 ring-1 ring-black/5 grid place-items-center text-xs font-semibold">
      {initials(name)}
    </div>
  );
}

function MentionRow({
  item,
  active,
  onMouseEnter,
  onClick,
}: {
  item: MentionItem;
  active: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={[
        "w-full text-left flex items-center gap-2 px-3 py-2 text-sm",
        active ? "bg-slate-100" : "bg-white hover:bg-slate-50",
      ].join(" ")}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
    >
      <Avatar name={item.label} url={item.avatarUrl} />
      <div className="min-w-0">
        <div className="truncate font-medium text-slate-900">{item.label}</div>
        <div className="truncate text-xs text-slate-500">@{item.id}</div>
      </div>
    </button>
  );
}

function MessageContent({ message }: { message: Message }) {
  if (message.type === "image") {
    return (
      <div className="space-y-2">
        {message.imageUrl ? (
          <img
            src={message.imageUrl}
            alt={message.imageAlt ?? message.text ?? "image"}
            className="max-w-full rounded-md border border-slate-200"
            loading="lazy"
          />
        ) : null}
        {message.text ? <div className="whitespace-pre-wrap break-words text-sm text-slate-900">{message.text}</div> : null}
      </div>
    );
  }

  if (message.type === "code") {
    return (
      <div className="space-y-2">
        {message.language ? <div className="text-xs text-slate-500">{message.language}</div> : null}
        <pre className="overflow-x-auto rounded-md bg-slate-900 p-3 text-xs leading-relaxed text-slate-50">
          <code>{message.code ?? ""}</code>
        </pre>
        {message.text ? <div className="whitespace-pre-wrap break-words text-sm text-slate-900">{message.text}</div> : null}
      </div>
    );
  }

  return <div className="whitespace-pre-wrap break-words text-sm text-slate-900">{message.text ?? ""}</div>;
}

export function RealtimeChat({
  messages,
  onSend,
  className,
  currentUserId,
  placeholder = "输入消息…（Enter 发送，Shift+Enter 换行）",
  disabled,
  mentions = [],
  hasMore,
  isLoadingMore,
  onLoadMore,
  loadMoreThresholdPx = 40,
}: RealtimeChatProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [mentionState, setMentionState] = useState<MentionState>({ open: false });

  const pendingPrependRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);
  const prevLastIdRef = useRef<string | null>(null);

  const filteredMentions = useMemo(() => {
    if (!mentionState.open) return [];
    const q = mentionState.query.trim().toLowerCase();
    if (!q) return mentions.slice(0, 8);
    return mentions.filter((m) => m.label.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)).slice(0, 8);
  }, [mentionState, mentions]);

  const updateMention = useCallback((value: string, cursor: number) => {
    const found = findMentionAtCursor(value, cursor);
    if (!found) {
      setMentionState({ open: false });
      return;
    }

    setMentionState((prev) => {
      const activeIndex = prev.open ? prev.activeIndex : 0;
      return { open: true, query: found.query, startIndex: found.startIndex, endIndex: found.endIndex, activeIndex: Math.max(activeIndex, 0) };
    });
  }, []);

  const applyMention = useCallback(
    (item: MentionItem) => {
      if (!mentionState.open) return;
      const cursor = textareaRef.current?.selectionStart ?? mentionState.endIndex;
      const start = mentionState.startIndex;
      const end = cursor;

      const before = draft.slice(0, start);
      const after = draft.slice(end);
      const insert = `@${item.label} `;
      const next = `${before}${insert}${after}`;
      setDraft(next);
      setMentionState({ open: false });

      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;
        const nextCursor = before.length + insert.length;
        el.focus();
        el.setSelectionRange(nextCursor, nextCursor);
      });
    },
    [draft, mentionState],
  );

  const send = useCallback(async () => {
    if (disabled || sending) return;
    if (draft.trim().length === 0) return;
    setSending(true);
    try {
      await onSend(draft);
      setDraft("");
      setMentionState({ open: false });
      requestAnimationFrame(() => textareaRef.current?.focus());
    } finally {
      setSending(false);
    }
  }, [disabled, draft, onSend, sending]);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, 160);
    el.style.height = `${Math.max(next, 44)}px`;
  }, [draft]);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;

    if (pendingPrependRef.current) {
      const prev = pendingPrependRef.current;
      const delta = el.scrollHeight - prev.scrollHeight;
      el.scrollTop = prev.scrollTop + delta;
      pendingPrependRef.current = null;
      return;
    }

    const lastId = messages.at(-1)?.id ?? null;
    if (lastId && lastId !== prevLastIdRef.current) {
      el.scrollTop = el.scrollHeight;
    }
    prevLastIdRef.current = lastId;
  }, [messages]);

  const onScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    if (!onLoadMore || !hasMore || isLoadingMore) return;
    if (el.scrollTop > loadMoreThresholdPx) return;

    pendingPrependRef.current = { scrollHeight: el.scrollHeight, scrollTop: el.scrollTop };
    void onLoadMore();
  }, [hasMore, isLoadingMore, loadMoreThresholdPx, onLoadMore]);

  const onDraftChange = useCallback((value: string) => {
    setDraft(value);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      updateMention(value, el.selectionStart ?? value.length);
    });
  }, [updateMention]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (mentionState.open) {
        if (e.key === "Escape") {
          e.preventDefault();
          setMentionState({ open: false });
          return;
        }
        if (e.key === "ArrowDown") {
          if (filteredMentions.length === 0) return;
          e.preventDefault();
          setMentionState((prev) => (prev.open ? { ...prev, activeIndex: Math.min(prev.activeIndex + 1, filteredMentions.length - 1) } : prev));
          return;
        }
        if (e.key === "ArrowUp") {
          if (filteredMentions.length === 0) return;
          e.preventDefault();
          setMentionState((prev) => (prev.open ? { ...prev, activeIndex: Math.max(prev.activeIndex - 1, 0) } : prev));
          return;
        }
        if (e.key === "Enter" && !e.shiftKey) {
          if (filteredMentions.length === 0) return;
          const item = filteredMentions[mentionState.activeIndex];
          if (item) {
            e.preventDefault();
            applyMention(item);
            return;
          }
        }
      }

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void send();
      }
    },
    [applyMention, filteredMentions, mentionState, send],
  );

  return (
    <div className={["flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white", className].filter(Boolean).join(" ")}>
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto p-4"
        onScroll={onScroll}
        role="log"
        aria-label="Chat messages"
      >
        <div className="pb-2 flex items-center justify-center">
          {onLoadMore && hasMore ? (
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              onClick={() => {
                const el = listRef.current;
                if (el) pendingPrependRef.current = { scrollHeight: el.scrollHeight, scrollTop: el.scrollTop };
                void onLoadMore();
              }}
              disabled={Boolean(isLoadingMore)}
            >
              {isLoadingMore ? "加载中…" : "加载历史消息"}
            </button>
          ) : (
            <div className="text-xs text-slate-400">{messages.length ? " " : "暂无消息"}</div>
          )}
        </div>

        <div className="space-y-3">
          {messages.map((m) => {
            const mine = currentUserId && m.sender.id === currentUserId;
            return (
              <div key={m.id} className={["flex items-start gap-3", mine ? "flex-row-reverse" : "flex-row"].join(" ")}>
                <Avatar name={m.sender.name} url={m.sender.avatarUrl} />
                <div className={["min-w-0 max-w-[78%]", mine ? "text-right" : "text-left"].join(" ")}>
                  <div className={["flex items-baseline gap-2", mine ? "justify-end" : "justify-start"].join(" ")}>
                    <div className="truncate text-xs font-medium text-slate-700">{m.sender.name}</div>
                    <div className="shrink-0 text-[11px] text-slate-400">{formatTime(m.createdAt)}</div>
                  </div>
                  <div
                    className={[
                      "mt-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm",
                      mine ? "bg-slate-50" : "bg-white",
                    ].join(" ")}
                  >
                    <MessageContent message={m} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-200 p-3">
        <div className="relative">
          {mentionState.open && filteredMentions.length > 0 ? (
            <div className="absolute bottom-full left-0 mb-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
              <div className="max-h-56 overflow-auto">
                {filteredMentions.map((item, idx) => (
                  <MentionRow
                    key={item.id}
                    item={item}
                    active={mentionState.open && idx === mentionState.activeIndex}
                    onMouseEnter={() => setMentionState((prev) => (prev.open ? { ...prev, activeIndex: idx } : prev))}
                    onClick={() => applyMention(item)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <textarea
            ref={textareaRef}
            value={draft}
            placeholder={placeholder}
            disabled={disabled || sending}
            rows={1}
            className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50 disabled:text-slate-500"
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={onKeyDown}
            onSelect={(e) => {
              const el = e.currentTarget;
              updateMention(el.value, el.selectionStart ?? el.value.length);
            }}
          />

          <div className="mt-2 flex items-center justify-between">
            <div className="text-xs text-slate-500">支持 @ 提及自动补全</div>
            <button
              type="button"
              className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              disabled={disabled || sending || draft.trim().length === 0}
              onClick={() => void send()}
            >
              {sending ? "发送中…" : "发送"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
