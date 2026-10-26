"use client";

import { useLayoutEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/chat/types";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--you)]";

const quietButton = `inline-flex min-h-11 cursor-pointer items-center justify-center whitespace-nowrap rounded-[10px] border border-[var(--line)] bg-[var(--sheet)] px-3 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper)] disabled:cursor-not-allowed motion-safe:transition-colors motion-safe:duration-200 motion-safe:active:translate-y-px ${focusRing}`;

type Connection = "idle" | "connecting" | "live" | "reconnecting";

type ThreadProps = {
  conversationId: string;
  title: string;
  meId: string;
  showSenderNames?: boolean;
  messages: ChatMessage[];
  loading: boolean;
  canLoadEarlier: boolean;
  loadingEarlier: boolean;
  outgoingToken: number;
  onLoadEarlier: () => Promise<boolean>;
  onRetry: (message: ChatMessage) => void;
  onSend: (content: string) => void;
  onBack: () => void;
  onLeave?: () => void;
  leaving?: boolean;
  actionError?: string | null;
  listError?: string | null;
  connection?: Connection;
  connectionText?: string;
  logLabel?: string;
};

const threadDot: Record<Connection, string> = {
  idle: "bg-[#8b98ab]",
  connecting: "bg-[#e2b340] motion-safe:animate-pulse",
  live: "bg-[#3dba9a]",
  reconnecting: "bg-[#e2b340] motion-safe:animate-pulse",
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "?";
}

function senderLabel(message: ChatMessage) {
  const name = message.senderDisplayName?.trim();
  if (name) return name;
  return message.senderId.slice(0, 8);
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function Thread({
  conversationId,
  title,
  meId,
  showSenderNames = false,
  messages,
  loading,
  canLoadEarlier,
  loadingEarlier,
  outgoingToken,
  onLoadEarlier,
  onRetry,
  onSend,
  onBack,
  onLeave,
  leaving = false,
  actionError = null,
  listError = null,
  connection = "idle",
  connectionText = "",
  logLabel,
}: ThreadProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const preserveRef = useRef<number | null>(null);
  const draftRef = useRef("");
  const draftInputRef = useRef<HTMLTextAreaElement>(null);
  const lastConversationRef = useRef(conversationId);
  const lastOutgoingRef = useRef(outgoingToken);

  useLayoutEffect(() => {
    const element = scrollerRef.current;
    if (!element) return;

    if (lastConversationRef.current !== conversationId) {
      lastConversationRef.current = conversationId;
      lastOutgoingRef.current = outgoingToken;
      preserveRef.current = null;
      stickRef.current = true;
      element.scrollTop = element.scrollHeight;
      return;
    }

    const justSent = lastOutgoingRef.current !== outgoingToken;
    lastOutgoingRef.current = outgoingToken;
    if (justSent) {
      preserveRef.current = null;
      stickRef.current = true;
      element.scrollTop = element.scrollHeight;
      return;
    }

    if (preserveRef.current != null) {
      const previousOffset = preserveRef.current;
      preserveRef.current = null;
      element.scrollTop = element.scrollHeight - previousOffset;
      return;
    }

    if (stickRef.current) element.scrollTop = element.scrollHeight;
  }, [conversationId, messages, outgoingToken]);

  function onScroll() {
    const element = scrollerRef.current;
    if (!element) return;
    stickRef.current =
      element.scrollHeight - element.scrollTop - element.clientHeight < 80;
  }

  async function loadEarlier() {
    const element = scrollerRef.current;
    preserveRef.current = element
      ? element.scrollHeight - element.scrollTop
      : null;
    stickRef.current = false;
    const added = await onLoadEarlier();
    if (!added) preserveRef.current = null;
  }

  function submit() {
    const content = draftRef.current;
    if (content.length === 0) return;
    draftRef.current = "";
    if (draftInputRef.current) draftInputRef.current.value = "";
    onSend(content);
  }

  const alertClass =
    "rounded-[10px] border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2 text-sm font-medium leading-6 text-[var(--danger)]";

  return (
    <section id="conversation" className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--paper)]">
      <div className="border-b border-[var(--line)] bg-[var(--sheet)] px-4 py-3">
        <div className="mx-auto flex w-full max-w-[40rem] flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className={`inline-flex min-h-11 shrink-0 cursor-pointer items-center whitespace-nowrap rounded-[10px] px-2 text-sm font-semibold text-[var(--you)] hover:bg-[var(--paper)] motion-safe:transition-colors motion-safe:duration-200 md:hidden ${focusRing}`}
          >
            Conversations
          </button>
          <h2 className="min-w-[8rem] flex-1 truncate text-lg font-semibold tracking-tight text-[var(--ink)]">
            {title}
          </h2>
          {onLeave ? (
            <button
              type="button"
              onClick={onLeave}
              disabled={leaving}
              aria-busy={leaving}
              className={`shrink-0 ${quietButton}`}
            >
              {leaving ? "Leaving…" : "Leave channel"}
            </button>
          ) : null}
        </div>
        <p role="status" className="mx-auto mt-1 flex w-full max-w-[40rem] items-center gap-2 text-sm text-[var(--quiet)] md:hidden">
          <span className="sr-only">Connection: </span>
          <span aria-hidden className={`size-2.5 rounded-full ${threadDot[connection]}`} />
          {connectionText}
        </p>
        {actionError ? (
          <p role="alert" className={`mx-auto mt-3 w-full max-w-[40rem] ${alertClass}`}>
            {actionError}
          </p>
        ) : null}
        {listError ? (
          <p role="alert" className={`mx-auto mt-3 w-full max-w-[40rem] ${alertClass}`}>
            {listError}
          </p>
        ) : null}
      </div>

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        role="log"
        aria-label={logLabel ?? `Messages with ${title}`}
        aria-busy={loading}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6"
      >
        <div className="mx-auto flex w-full max-w-[40rem] flex-col gap-5">
          {canLoadEarlier ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => void loadEarlier()}
                disabled={loadingEarlier}
                aria-busy={loadingEarlier}
                className={quietButton}
              >
                {loadingEarlier ? "Loading earlier messages…" : "Load earlier messages"}
              </button>
            </div>
          ) : null}

          {loading && messages.length === 0 ? (
            <div className="grid gap-3">
              <div aria-hidden className="h-4 w-2/3 rounded-full bg-[var(--line)] motion-safe:animate-pulse" />
              <div aria-hidden className="h-4 w-1/2 rounded-full bg-[var(--line)] motion-safe:animate-pulse" />
              <p className="text-base text-[var(--quiet)]">Loading messages…</p>
            </div>
          ) : null}

          {!loading && messages.length === 0 ? (
            <p className="pt-8 text-base leading-7 text-[var(--quiet)]">Send the first message.</p>
          ) : null}

          {messages.map((message) => {
            const mine = message.senderId === meId;
            const label = showSenderNames && !mine ? senderLabel(message) : null;
            const time = formatTime(message.createdAt);
            if (mine) {
              return (
                <article key={message.clientMessageId} className="flex justify-end">
                  <div
                    className={`max-w-[min(100%,28rem)] rounded-[18px] rounded-br-[6px] bg-[var(--you)] px-3.5 py-2.5 text-[var(--you-ink)] ${
                      message.status === "failed" ? "outline outline-2 outline-offset-2 outline-[var(--danger)]" : ""
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-base leading-7">{message.content}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[var(--you-ink)]">
                      <time dateTime={message.createdAt}>{time}</time>
                      {message.status === "pending" ? (
                        <span className="motion-safe:animate-pulse">Sending</span>
                      ) : null}
                      {message.status === "sent" ? <span>Sent</span> : null}
                      {message.status === "failed" ? <span>Not sent</span> : null}
                    </p>
                    {message.status === "failed" ? (
                      <button
                        type="button"
                        onClick={() => onRetry(message)}
                        className={`mt-2 inline-flex min-h-11 cursor-pointer items-center whitespace-nowrap rounded-[10px] bg-[var(--sheet)] px-3 text-sm font-semibold text-[var(--danger)] hover:bg-[var(--danger-bg)] motion-safe:transition-colors motion-safe:duration-200 ${focusRing}`}
                      >
                        Retry
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            }

            return (
              <article key={message.clientMessageId} className="flex min-w-0 gap-3">
                {label ? (
                  <span
                    aria-hidden
                    className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[var(--line)] text-xs font-semibold text-[var(--ink)]"
                  >
                    {initials(label)}
                  </span>
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-6 text-[var(--quiet)]">
                    {label ? (
                      <span className="font-semibold text-[var(--ink)]">{label}</span>
                    ) : null}{" "}
                    <time dateTime={message.createdAt}>{time}</time>
                  </p>
                  <p className="mt-0.5 max-w-[65ch] whitespace-pre-wrap break-words text-base leading-7 text-[var(--ink)]">
                    {message.content}
                  </p>
                  {message.status === "failed" ? (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-[var(--danger)]">Not sent</p>
                      <button
                        type="button"
                        onClick={() => onRetry(message)}
                        className={`mt-2 ${quietButton} text-[var(--danger)]`}
                      >
                        Retry
                      </button>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <form
        className="border-t border-[var(--line)] bg-[var(--sheet)] px-4 py-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <div className="mx-auto w-full max-w-[40rem]">
          <label htmlFor="composer" className="text-sm font-semibold text-[var(--ink)]">
            Message
          </label>
          <div className="mt-2 flex items-end gap-2">
            <textarea
              id="composer"
              ref={draftInputRef}
              rows={2}
              maxLength={4000}
              placeholder="Write a message"
              aria-describedby="composer-hint"
              className={`min-h-16 flex-1 resize-y rounded-[10px] border border-[var(--line)] bg-[var(--sheet)] px-3 py-2 text-base leading-6 text-[var(--ink)] placeholder:text-[var(--quiet)] ${focusRing}`}
              onChange={(event) => {
                draftRef.current = event.target.value;
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
            />
            <button
              type="submit"
              className={`inline-flex min-h-11 cursor-pointer items-center justify-center whitespace-nowrap rounded-[10px] bg-[var(--you)] px-4 text-sm font-semibold text-[var(--you-ink)] hover:bg-[var(--you-hover)] motion-safe:transition-colors motion-safe:duration-200 motion-safe:active:translate-y-px ${focusRing}`}
            >
              Send
            </button>
          </div>
          <p id="composer-hint" className="mt-2 text-sm leading-6 text-[var(--quiet)]">
            Enter sends. Shift+Enter adds a line.
          </p>
        </div>
      </form>
    </section>
  );
}
