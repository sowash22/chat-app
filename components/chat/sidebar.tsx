"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Plus, Search } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { CHANNEL_NAME_MAX, conversationTitle } from "@/lib/chat/messages";
import type { ConversationSummary, Person, PublicChannel } from "@/lib/chat/types";

const railFocus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-on-rail)]";

const railField = `min-h-11 w-full rounded-[10px] border border-[var(--rail-line)] bg-[var(--rail-field)] px-3 text-base text-[var(--rail-text)] placeholder:text-[var(--rail-muted)] ${railFocus}`;

const railButton = `inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border border-[var(--rail-line)] bg-transparent px-3 text-sm font-semibold text-[var(--rail-text)] hover:bg-[var(--rail-hover)] disabled:cursor-not-allowed motion-safe:transition-colors motion-safe:duration-200 motion-safe:active:translate-y-px ${railFocus}`;

const railPrimary = `inline-flex min-h-11 w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-[10px] bg-[var(--you)] px-3 text-sm font-semibold text-[var(--you-ink)] hover:bg-[var(--you-hover)] disabled:cursor-not-allowed motion-safe:transition-colors motion-safe:duration-200 motion-safe:active:translate-y-px ${railFocus}`;

const navRow = `flex min-h-11 w-full cursor-pointer items-center rounded-[10px] px-3 text-left text-sm leading-5 text-[var(--rail-text)] hover:bg-[var(--rail-hover)] disabled:cursor-not-allowed motion-safe:transition-colors motion-safe:duration-200 ${railFocus}`;

type Connection = "idle" | "connecting" | "live" | "reconnecting";

type SidebarProps = {
  email: string;
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  onSaveDisplayName: (event: FormEvent<HTMLFormElement>) => void;
  savingName: boolean;
  nameMessage: string | null;
  nameError: string | null;
  query: string;
  onQueryChange: (value: string) => void;
  people: Person[];
  searching: boolean;
  openingId: string | null;
  onOpenPerson: (person: Person) => void;
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  listError: string | null;
  channelName: string;
  onChannelNameChange: (value: string) => void;
  onCreateChannel: (event: FormEvent<HTMLFormElement>) => void;
  creatingChannel: boolean;
  directory: PublicChannel[];
  joiningId: string | null;
  onJoinChannel: (channel: PublicChannel) => void;
  channelError: string | null;
  connection: Connection;
  connectionText: string;
  className?: string;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "?";
}

const connectionDot: Record<Connection, string> = {
  idle: "bg-[#8b98ab]",
  connecting: "bg-[#e2b340] motion-safe:animate-pulse",
  live: "bg-[#3dba9a]",
  reconnecting: "bg-[#e2b340] motion-safe:animate-pulse",
};

export function Sidebar({
  email,
  displayName,
  onDisplayNameChange,
  onSaveDisplayName,
  savingName,
  nameMessage,
  nameError,
  query,
  onQueryChange,
  people,
  searching,
  openingId,
  onOpenPerson,
  conversations,
  activeId,
  onSelectConversation,
  listError,
  channelName,
  onChannelNameChange,
  onCreateChannel,
  creatingChannel,
  directory,
  joiningId,
  onJoinChannel,
  channelError,
  connection,
  connectionText,
  className,
}: SidebarProps) {
  const [editingName, setEditingName] = useState(false);
  const [finding, setFinding] = useState(false);
  const [making, setMaking] = useState(false);
  const nameSnapshot = useRef(displayName);
  const wasCreating = useRef(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const channels = conversations.filter((conversation) => conversation.type === "channel");
  const directMessages = conversations.filter(
    (conversation) => conversation.type !== "channel",
  );
  const discoverable = directory.filter((channel) => !channel.joined);

  useEffect(() => {
    if (nameError) setEditingName(true);
  }, [nameError]);

  useEffect(() => {
    if (nameMessage) setEditingName(false);
  }, [nameMessage]);

  useEffect(() => {
    if (channelError) {
      setMaking(true);
      setFinding(false);
    }
  }, [channelError]);

  useEffect(() => {
    if (wasCreating.current && !creatingChannel && !channelError) setMaking(false);
    wasCreating.current = creatingChannel;
  }, [creatingChannel, channelError]);

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

  useEffect(() => {
    if (finding) searchInputRef.current?.focus();
  }, [finding]);

  function beginEdit() {
    nameSnapshot.current = displayName;
    onDisplayNameChange(displayName);
    setEditingName(true);
  }

  function cancelEdit() {
    onDisplayNameChange(nameSnapshot.current);
    setEditingName(false);
  }

  return (
    <aside
      className={`h-full min-h-0 flex-col bg-[var(--rail)] text-[var(--rail-text)] ${className ?? ""}`}
    >
      <div className="px-4 pb-3 pt-4">
        <p aria-hidden className="text-sm font-semibold text-[var(--focus-on-rail)]">
          Messages
        </p>
        <p className="mt-3 truncate text-lg font-semibold leading-6">{displayName}</p>
        <p className="truncate text-sm leading-6 text-[var(--rail-muted)]">{email}</p>
        <p role="status" className="mt-2 flex items-center gap-2 text-sm">
          <span className="sr-only">Connection: </span>
          <span
            aria-hidden
            className={`size-2.5 shrink-0 rounded-full ${connectionDot[connection]}`}
          />
          {connectionText}
        </p>

        {editingName ? (
          <form onSubmit={onSaveDisplayName} className="mt-1 grid gap-2">
            <label htmlFor="display-name" className="text-sm font-semibold">
              Display name
            </label>
            <input
              id="display-name"
              ref={nameInputRef}
              value={displayName}
              onChange={(event) => onDisplayNameChange(event.target.value)}
              maxLength={40}
              className={railField}
            />
            <button type="submit" disabled={savingName} aria-busy={savingName} className={railPrimary}>
              {savingName ? "Saving…" : "Save name"}
            </button>
            <button type="button" onClick={cancelEdit} className={railButton}>
              Cancel
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={beginEdit}
            className={`mt-1 inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-[var(--focus-on-rail)] underline-offset-2 hover:underline ${railFocus}`}
          >
            Edit name
          </button>
        )}
        {nameError ? (
          <p
            role="alert"
            className="mt-2 rounded-[10px] border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2 text-sm font-medium leading-6 text-[var(--danger)]"
          >
            {nameError}
          </p>
        ) : null}
        {nameMessage ? (
          <p className="mt-2 rounded-[10px] bg-[var(--you)]/15 px-3 py-2 text-sm font-medium text-[var(--focus-on-rail)]">
            {nameMessage}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2 px-3 pb-3">
        <button
          type="button"
          aria-expanded={finding}
          aria-controls="find-someone"
          onClick={() => {
            setFinding((open) => !open);
            setMaking(false);
          }}
          className={railButton}
        >
          <Search className="size-4" strokeWidth={1.75} aria-hidden />
          Find someone
        </button>
        <button
          type="button"
          aria-expanded={making}
          aria-controls="new-channel"
          onClick={() => {
            setMaking((open) => !open);
            setFinding(false);
          }}
          className={railButton}
        >
          <Plus className="size-4" strokeWidth={1.75} aria-hidden />
          New channel
        </button>
        {channelError && !making ? (
          <p
            role="alert"
            className="rounded-[10px] border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2 text-sm font-medium leading-6 text-[var(--danger)]"
          >
            {channelError}
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {finding ? (
          <div
            id="find-someone"
            className="mb-4 grid gap-2"
            onKeyDown={(event) => {
              if (event.key === "Escape") setFinding(false);
            }}
          >
            <label htmlFor="people-search" className="text-sm font-semibold">
              Name
            </label>
            <input
              id="people-search"
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search by name"
              className={railField}
            />
            <p className="text-sm text-[var(--rail-muted)]" aria-live="polite">
              {searching
                ? "Searching…"
                : `${people.length} ${people.length === 1 ? "person" : "people"}`}
            </p>
            {people.length === 0 && !searching ? (
              <p className="text-sm leading-6 text-[var(--rail-muted)]">No one matches that name.</p>
            ) : (
              <ul aria-label="People" className="max-h-48 space-y-1 overflow-y-auto">
                {people.map((person) => (
                  <li key={person.userId}>
                    <button
                      type="button"
                      onClick={() => onOpenPerson(person)}
                      disabled={openingId === person.userId}
                      aria-busy={openingId === person.userId}
                      className={navRow}
                    >
                      <span className="min-w-0">
                        {openingId === person.userId
                          ? `Opening conversation with ${person.displayName}…`
                          : `Message ${person.displayName}`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {making ? (
          <div
            id="new-channel"
            className="mb-4 grid gap-3"
            onKeyDown={(event) => {
              if (event.key === "Escape") setMaking(false);
            }}
          >
            <form onSubmit={onCreateChannel} className="grid gap-2">
              <label htmlFor="channel-name" className="text-sm font-semibold">
                Channel name
              </label>
              <input
                id="channel-name"
                value={channelName}
                onChange={(event) => onChannelNameChange(event.target.value)}
                maxLength={CHANNEL_NAME_MAX}
                placeholder="general"
                className={railField}
              />
              <button
                type="submit"
                disabled={creatingChannel}
                aria-busy={creatingChannel}
                className={railPrimary}
              >
                {creatingChannel ? "Creating…" : "Create channel"}
              </button>
            </form>
            {channelError ? (
              <p
                role="alert"
                className="rounded-[10px] border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2 text-sm font-medium leading-6 text-[var(--danger)]"
              >
                {channelError}
              </p>
            ) : null}
            <div>
              <h2 className="px-3 text-sm font-medium text-[var(--rail-muted)]">Public channels</h2>
              {discoverable.length === 0 ? (
                <p className="px-3 py-2 text-sm leading-6 text-[var(--rail-muted)]">
                  No public channels to join.
                </p>
              ) : (
                <ul aria-label="Public channels" className="mt-1 max-h-48 space-y-1 overflow-y-auto">
                  {discoverable.map((channel) => (
                    <li key={channel.id}>
                      <button
                        type="button"
                        onClick={() => onJoinChannel(channel)}
                        disabled={joiningId === channel.id}
                        aria-busy={joiningId === channel.id}
                        className={navRow}
                      >
                        {joiningId === channel.id
                          ? `Joining #${channel.name}…`
                          : `Join #${channel.name}`}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}

        {listError ? (
          <p
            role="alert"
            className="mb-3 rounded-[10px] border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2 text-sm font-medium leading-6 text-[var(--danger)]"
          >
            {listError}
          </p>
        ) : null}

        <section aria-labelledby="channels-heading">
          <h2 id="channels-heading" className="px-3 py-2 text-sm font-medium text-[var(--rail-muted)]">
            Channels
          </h2>
          {channels.length === 0 ? (
            <p className="px-3 pb-3 text-sm leading-6 text-[var(--rail-muted)]">
              Create or join a channel.
            </p>
          ) : (
            <ul className="space-y-1">
              {channels.map((conversation) => {
                const selected = conversation.id === activeId;
                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => onSelectConversation(conversation.id)}
                      aria-current={selected ? "true" : undefined}
                      className={`${navRow} ${
                        selected
                          ? "bg-[var(--rail-hover)] font-semibold shadow-[inset_3px_0_0_var(--you)]"
                          : ""
                      }`}
                    >
                      <span className="min-w-0 truncate">{conversationTitle(conversation)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="direct-messages-heading" className="mt-4">
          <h2
            id="direct-messages-heading"
            className="px-3 py-2 text-sm font-medium text-[var(--rail-muted)]"
          >
            Direct messages
          </h2>
          {directMessages.length === 0 ? (
            <p className="px-3 pb-3 text-sm leading-6 text-[var(--rail-muted)]">
              Find someone to message.
            </p>
          ) : (
            <ul aria-label="Direct messages" className="space-y-1">
              {directMessages.map((conversation) => {
                const selected = conversation.id === activeId;
                const title = conversationTitle(conversation);
                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => onSelectConversation(conversation.id)}
                      aria-current={selected ? "true" : undefined}
                      className={`${navRow} gap-2.5 ${
                        selected
                          ? "bg-[var(--rail-hover)] font-semibold shadow-[inset_3px_0_0_var(--you)]"
                          : ""
                      }`}
                    >
                      <span
                        aria-hidden
                        className="grid size-7 shrink-0 place-items-center rounded-full bg-[var(--rail-line)] text-xs font-semibold"
                      >
                        {initials(title)}
                      </span>
                      <span className="min-w-0 truncate">{title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <form action={signOut} className="border-t border-[var(--rail-line)] p-3">
        <button type="submit" className={railButton}>
          Sign out
        </button>
      </form>
    </aside>
  );
}
