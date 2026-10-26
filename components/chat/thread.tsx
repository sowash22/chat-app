"use client";

import { useLayoutEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/chat/types";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800";

const quietButton = `inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 motion-safe:transition-colors motion-safe:duration-200 ${focusRing}`;

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
  logLabel?: string;
};

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

  return (
    <section id="conversation" className="flex min-h-0 min-w-0 flex-1 flex-col bg-slate-100">
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className={`inline-flex min-h-11 cursor-pointer items-center rounded-lg px-3 text-sm font-semibold text-blue-800 hover:bg-blue-50 motion-safe:transition-colors motion-safe:duration-200 md:hidden ${focusRing}`}
          >
            All conversations
          </button>
          <h2 className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight text-slate-950">
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
        {actionError ? (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium leading-6 text-red-800"
          >
            {actionError}
          </p>
        ) : null}
      </div>

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        role="log"
        aria-label={logLabel ?? `Messages with ${title}`}
        aria-busy={loading}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4"
      >
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
          <div className="space-y-3">
            <div
              aria-hidden
              className="h-16 max-w-xs rounded-2xl rounded-bl-md bg-slate-200 motion-safe:animate-pulse"
            />
            <div
              aria-hidden
              className="ml-auto h-16 max-w-xs rounded-2xl rounded-br-md bg-slate-200 motion-safe:animate-pulse"
            />
            <p className="text-base text-slate-700">Loading messages…</p>
          </div>
        ) : null}

        {!loading && messages.length === 0 ? (
          <div className="mx-auto mt-10 max-w-sm rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center shadow-sm">
            <p className="text-base font-semibold text-slate-950">No messages yet</p>
            <p className="mt-1 text-base leading-7 text-slate-600">Say hello.</p>
          </div>
        ) : null}

        {messages.map((message) => {
          const mine = message.senderId === meId;
          const label = showSenderNames && !mine ? senderLabel(message) : null;
          return (
            <article
              key={message.clientMessageId}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex max-w-[min(80%,36rem)] flex-col gap-1 ${
                  mine ? "items-end" : "items-start"
                }`}
              >
                {label ? (
                  <p className="px-1 text-sm font-semibold leading-5 text-slate-700">
                    {label}
                  </p>
                ) : null}
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-base leading-relaxed shadow-sm ${
                    mine
                      ? "rounded-br-md bg-blue-800 text-white"
                      : "rounded-bl-md border border-slate-200 bg-white text-slate-950"
                  } ${
                    message.status === "failed"
                      ? "ring-2 ring-red-700 ring-offset-2 ring-offset-slate-100"
                      : ""
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <p
                    className={`mt-1.5 flex flex-wrap items-center gap-2 text-xs font-medium ${
                      mine ? "text-blue-100" : "text-slate-600"
                    }`}
                  >
                    <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
                    {mine && message.status === "pending" ? (
                      <span className="motion-safe:animate-pulse">Sending</span>
                    ) : null}
                    {mine && message.status === "sent" ? <span>Sent</span> : null}
                    {message.status === "failed" ? (
                      <span className={mine ? "text-white" : "text-red-800"}>Not sent</span>
                    ) : null}
                  </p>
                  {message.status === "failed" ? (
                    <button
                      type="button"
                      onClick={() => onRetry(message)}
                      className={`mt-2 inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-white px-3 text-sm font-semibold text-red-800 shadow-sm hover:bg-red-50 motion-safe:transition-colors motion-safe:duration-200 ${focusRing}`}
                    >
                      Retry
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <form
        className="border-t border-slate-200 bg-white px-4 py-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label htmlFor="composer" className="text-sm font-semibold text-slate-900">
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
            className={`min-h-16 flex-1 resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-base leading-6 text-slate-950 shadow-sm placeholder:text-slate-600 ${focusRing}`}
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
            className={`inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl bg-blue-800 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-900 motion-safe:transition-colors motion-safe:duration-200 ${focusRing}`}
          >
            Send
          </button>
        </div>
        <p id="composer-hint" className="mt-2 text-sm leading-6 text-slate-600">
          Press Enter to send. Shift+Enter adds a new line.
        </p>
      </form>
    </section>
  );
}
