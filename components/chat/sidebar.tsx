"use client";

import type { FormEvent } from "react";
import { CHANNEL_NAME_MAX, conversationTitle } from "@/lib/chat/messages";
import type { ConversationSummary, Person, PublicChannel } from "@/lib/chat/types";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-800";

const fieldClass = `min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-950 shadow-sm placeholder:text-slate-600 ${focusRing}`;

const secondaryButton = `inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 motion-safe:transition-colors motion-safe:duration-200 ${focusRing}`;

const primaryButton = `inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg bg-blue-800 px-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-900 disabled:cursor-not-allowed disabled:bg-blue-800 motion-safe:transition-colors motion-safe:duration-200 ${focusRing}`;

const rowButton = `flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg border-l-4 px-2.5 py-2 text-left text-sm leading-5 hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50 motion-safe:transition-colors motion-safe:duration-200 ${focusRing}`;

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
  className?: string;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "?";
}

function Mark({ children }: { children: string }) {
  return (
    <span
      aria-hidden
      className="grid size-8 shrink-0 place-items-center rounded-full bg-slate-200 text-xs font-semibold text-slate-800"
    >
      {children}
    </span>
  );
}

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
  className,
}: SidebarProps) {
  const channels = conversations.filter((conversation) => conversation.type === "channel");
  const directMessages = conversations.filter(
    (conversation) => conversation.type !== "channel",
  );
  const discoverable = directory.filter((channel) => !channel.joined);

  return (
    <aside
      className={`flex min-h-0 flex-col border-r border-slate-200 bg-white ${className ?? ""}`}
    >
      <form onSubmit={onSaveDisplayName} className="grid gap-2 border-b border-slate-200 p-4">
        <label htmlFor="display-name" className="text-sm font-semibold text-slate-900">
          Display name
        </label>
        <input
          id="display-name"
          value={displayName}
          onChange={(event) => onDisplayNameChange(event.target.value)}
          maxLength={40}
          className={fieldClass}
        />
        <button
          type="submit"
          disabled={savingName}
          aria-busy={savingName}
          className={secondaryButton}
        >
          {savingName ? "Saving…" : "Save name"}
        </button>
        <p className="truncate text-sm text-slate-600">{email}</p>
        {nameError ? (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium leading-6 text-red-800"
          >
            {nameError}
          </p>
        ) : null}
        {nameMessage ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
            {nameMessage}
          </p>
        ) : null}
      </form>

      <div className="grid gap-2 border-b border-slate-200 p-4">
        <label htmlFor="people-search" className="text-sm font-semibold text-slate-900">
          Find people
        </label>
        <input
          id="people-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by name"
          className={fieldClass}
        />
        <p className="text-sm text-slate-600" aria-live="polite">
          {searching
            ? "Searching…"
            : `${people.length} ${people.length === 1 ? "person" : "people"}`}
        </p>
        <ul aria-label="People" className="max-h-48 space-y-2 overflow-y-auto">
          {people.map((person) => (
            <li key={person.userId}>
              <button
                type="button"
                onClick={() => onOpenPerson(person)}
                disabled={openingId === person.userId}
                aria-busy={openingId === person.userId}
                className={`${rowButton} border-transparent text-slate-900`}
              >
                <Mark>{initials(person.displayName)}</Mark>
                <span className="min-w-0">
                  {openingId === person.userId
                    ? `Opening conversation with ${person.displayName}…`
                    : `Message ${person.displayName}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {listError ? (
          <p
            role="alert"
            className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium leading-6 text-red-800"
          >
            {listError}
          </p>
        ) : null}

        <section aria-labelledby="channels-heading" className="pb-4">
          <h2
            id="channels-heading"
            className="px-2 py-1 text-sm font-semibold uppercase tracking-wide text-slate-600"
          >
            Channels
          </h2>
          <form onSubmit={onCreateChannel} className="grid gap-2 px-2 py-2">
            <label htmlFor="channel-name" className="text-sm font-semibold text-slate-900">
              Channel name
            </label>
            <input
              id="channel-name"
              value={channelName}
              onChange={(event) => onChannelNameChange(event.target.value)}
              maxLength={CHANNEL_NAME_MAX}
              placeholder="general"
              className={fieldClass}
            />
            <button
              type="submit"
              disabled={creatingChannel}
              aria-busy={creatingChannel}
              className={primaryButton}
            >
              {creatingChannel ? "Creating…" : "Create channel"}
            </button>
          </form>
          {channelError ? (
            <p
              role="alert"
              className="mx-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium leading-6 text-red-800"
            >
              {channelError}
            </p>
          ) : null}

          <h3 className="px-2 pt-4 text-sm font-semibold text-slate-800">
            Public channels
          </h3>
          {discoverable.length === 0 ? (
            <p className="px-2 py-2 text-sm leading-6 text-slate-600">
              No public channels to join.
            </p>
          ) : (
            <ul aria-label="Public channels" className="space-y-2">
              {discoverable.map((channel) => (
                <li key={channel.id}>
                  <button
                    type="button"
                    onClick={() => onJoinChannel(channel)}
                    disabled={joiningId === channel.id}
                    aria-busy={joiningId === channel.id}
                    className={`${rowButton} border-transparent font-medium text-slate-900`}
                  >
                    <span className="min-w-0">
                      {joiningId === channel.id
                        ? `Joining #${channel.name}…`
                        : `Join #${channel.name}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <h3 id="your-channels-heading" className="px-2 pt-4 text-sm font-semibold text-slate-800">
            Your channels
          </h3>
          {channels.length === 0 ? (
            <p className="px-2 py-2 text-sm leading-6 text-slate-600">
              You have not joined a channel yet.
            </p>
          ) : (
            <ul aria-labelledby="your-channels-heading" className="space-y-2">
              {channels.map((conversation) => {
                const selected = conversation.id === activeId;
                const title = conversationTitle(conversation);
                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => onSelectConversation(conversation.id)}
                      aria-current={selected ? "true" : undefined}
                      className={`${rowButton} ${
                        selected
                          ? "border-blue-800 bg-blue-50 font-semibold text-blue-950"
                          : "border-transparent text-slate-900"
                      }`}
                    >
                      <span className="min-w-0 truncate">{title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="direct-messages-heading">
          <h2
            id="direct-messages-heading"
            className="px-2 py-1 text-sm font-semibold uppercase tracking-wide text-slate-600"
          >
            Direct messages
          </h2>
          {directMessages.length === 0 ? (
            <p className="px-2 py-2 text-sm leading-6 text-slate-600">
              No direct messages yet. Search for someone to start one.
            </p>
          ) : (
            <ul aria-label="Direct messages" className="space-y-2">
              {directMessages.map((conversation) => {
                const selected = conversation.id === activeId;
                const title = conversationTitle(conversation);
                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => onSelectConversation(conversation.id)}
                      aria-current={selected ? "true" : undefined}
                      className={`${rowButton} ${
                        selected
                          ? "border-blue-800 bg-blue-50 font-semibold text-blue-950"
                          : "border-transparent text-slate-900"
                      }`}
                    >
                      <Mark>{initials(title)}</Mark>
                      <span className="min-w-0 truncate">{title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}
