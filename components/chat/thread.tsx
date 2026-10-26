"use client";

import { useLayoutEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/chat/types";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800";

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
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-neutral-50">
      <div className="border-b border-neutral-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className={`rounded-md px-2 py-1 text-sm font-medium text-sky-800 md:hidden ${focusRing}`}
          >
            All conversations
          </button>
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold">{title}</h2>
          {onLeave ? (
            <button
              type="button"
              onClick={onLeave}
              disabled={leaving}
              className={`shrink-0 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-60 ${focusRing}`}
            >
              {leaving ? "Leaving…" : "Leave channel"}
            </button>
          ) : null}
        </div>
        {actionError ? (
          <p role="alert" className="pt-2 text-sm text-red-700">
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
              className={`rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-neutral-100 disabled:opacity-60 ${focusRing}`}
            >
              {loadingEarlier ? "Loading earlier messages…" : "Load earlier messages"}
            </button>
          </div>
        ) : null}

        {loading && messages.length === 0 ? (
          <p className="text-sm text-neutral-600">Loading messages…</p>
        ) : null}

        {!loading && messages.length === 0 ? (
          <p className="text-sm text-neutral-600">No messages yet. Say hello.</p>
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
                className={`flex max-w-[80%] flex-col gap-1 ${
                  mine ? "items-end" : "items-start"
                }`}
              >
                {label ? (
                  <p className="px-0.5 text-xs font-medium leading-4 text-neutral-700">
                    {label}
                  </p>
                ) : null}
                <div
                  className={`rounded-lg px-3 py-2 text-sm ${
                    mine
                      ? "bg-sky-800 text-white"
                      : "border border-neutral-200 bg-white text-neutral-950"
                  } ${message.status === "failed" ? "ring-2 ring-red-700" : ""}`}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  <p
                    className={`mt-1 flex flex-wrap items-center gap-2 text-xs ${
                      mine ? "text-sky-100" : "text-neutral-500"
                    }`}
                  >
                    <time dateTime={message.createdAt}>{formatTime(message.createdAt)}</time>
                    {mine && message.status === "pending" ? <span>Sending</span> : null}
                    {mine && message.status === "sent" ? <span>Sent</span> : null}
                    {message.status === "failed" ? (
                      <span className={mine ? "text-white" : "text-red-700"}>Not sent</span>
                    ) : null}
                  </p>
                  {message.status === "failed" ? (
                    <button
                      type="button"
                      onClick={() => onRetry(message)}
                      className={`mt-2 rounded-md bg-white px-2 py-1 text-xs font-medium text-red-800 ${focusRing}`}
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
        className="border-t border-neutral-200 bg-white p-3"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label htmlFor="composer" className="text-sm font-medium text-neutral-900">
          Message
        </label>
        <div className="mt-1.5 flex items-end gap-2">
          <textarea
            id="composer"
            ref={draftInputRef}
            rows={2}
            maxLength={4000}
            placeholder="Write a message"
            className={`min-h-16 flex-1 resize-y rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm ${focusRing}`}
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
            className={`rounded-md bg-sky-800 px-4 py-2 text-sm font-medium text-white hover:bg-sky-900 ${focusRing}`}
          >
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
