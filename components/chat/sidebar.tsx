"use client";

import type { FormEvent } from "react";
import { CHANNEL_NAME_MAX, conversationTitle } from "@/lib/chat/messages";
import type { ConversationSummary, Person, PublicChannel } from "@/lib/chat/types";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-800";

const fieldClass = `w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-950 shadow-sm ${focusRing}`;

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
    <aside className={`flex min-h-0 flex-col border-r border-neutral-200 bg-white ${className ?? ""}`}>
      <form onSubmit={onSaveDisplayName} className="grid gap-1.5 border-b border-neutral-200 p-3">
        <label htmlFor="display-name" className="text-sm font-medium">
          Display name
        </label>
        <div className="flex gap-2">
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
            className={`shrink-0 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-60 ${focusRing}`}
          >
            {savingName ? "Saving…" : "Save name"}
          </button>
        </div>
        <p className="truncate text-xs text-neutral-500">{email}</p>
        {nameError ? (
          <p role="alert" className="text-sm text-red-700">
            {nameError}
          </p>
        ) : null}
        {nameMessage ? <p className="text-sm text-emerald-800">{nameMessage}</p> : null}
      </form>

      <div className="grid gap-1.5 border-b border-neutral-200 p-3">
        <label htmlFor="people-search" className="text-sm font-medium">
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
        <p className="text-xs text-neutral-500" aria-live="polite">
          {searching
            ? "Searching…"
            : `${people.length} ${people.length === 1 ? "person" : "people"}`}
        </p>
        <ul aria-label="People" className="max-h-40 space-y-1 overflow-y-auto">
          {people.map((person) => (
            <li key={person.userId}>
              <button
                type="button"
                onClick={() => onOpenPerson(person)}
                disabled={openingId === person.userId}
                className={`w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100 disabled:opacity-60 ${focusRing}`}
              >
                {openingId === person.userId
                  ? `Opening conversation with ${person.displayName}…`
                  : `Message ${person.displayName}`}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {listError ? (
          <p role="alert" className="px-2 py-1 text-sm text-red-700">
            {listError}
          </p>
        ) : null}

        <section aria-labelledby="channels-heading" className="pb-3">
          <h2
            id="channels-heading"
            className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-500"
          >
            Channels
          </h2>
          <form onSubmit={onCreateChannel} className="grid gap-1.5 px-2 py-1">
            <label htmlFor="channel-name" className="text-sm font-medium">
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
              className={`justify-self-start rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-60 ${focusRing}`}
            >
              {creatingChannel ? "Creating…" : "Create channel"}
            </button>
          </form>
          {channelError ? (
            <p role="alert" className="px-2 py-1 text-sm text-red-700">
              {channelError}
            </p>
          ) : null}

          <h3 className="px-2 pt-2 text-sm font-medium text-neutral-800">
            Public channels
          </h3>
          {discoverable.length === 0 ? (
            <p className="px-2 py-1 text-sm text-neutral-600">
              No public channels to join.
            </p>
          ) : (
            <ul aria-label="Public channels" className="space-y-1">
              {discoverable.map((channel) => (
                <li key={channel.id}>
                  <button
                    type="button"
                    onClick={() => onJoinChannel(channel)}
                    disabled={joiningId === channel.id}
                    className={`w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-neutral-100 disabled:opacity-60 ${focusRing}`}
                  >
                    {joiningId === channel.id
                      ? `Joining #${channel.name}…`
                      : `Join #${channel.name}`}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {channels.length === 0 ? (
            <p className="px-2 py-2 text-sm text-neutral-600">
              You have not joined a channel yet.
            </p>
          ) : (
            <ul aria-label="Your channels" className="space-y-1">
              {channels.map((conversation) => {
                const selected = conversation.id === activeId;
                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => onSelectConversation(conversation.id)}
                      aria-current={selected ? "true" : undefined}
                      className={`w-full rounded-md border-l-4 px-3 py-2 text-left text-sm hover:bg-neutral-100 ${
                        selected
                          ? "border-sky-800 bg-sky-50 font-semibold"
                          : "border-transparent"
                      } ${focusRing}`}
                    >
                      {conversationTitle(conversation)}
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
            className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-500"
          >
            Direct messages
          </h2>
          {directMessages.length === 0 ? (
            <p className="px-2 py-2 text-sm text-neutral-600">
              No direct messages yet. Search for someone to start one.
            </p>
          ) : (
            <ul aria-label="Direct messages" className="space-y-1">
              {directMessages.map((conversation) => {
                const selected = conversation.id === activeId;
                return (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => onSelectConversation(conversation.id)}
                      aria-current={selected ? "true" : undefined}
                      className={`w-full rounded-md border-l-4 px-3 py-2 text-left text-sm hover:bg-neutral-100 ${
                        selected
                          ? "border-sky-800 bg-sky-50 font-semibold"
                          : "border-transparent"
                      } ${focusRing}`}
                    >
                      {conversationTitle(conversation)}
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
