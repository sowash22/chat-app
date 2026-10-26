"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MESSAGE_PAGE_SIZE,
  conversationTitle,
  invalidChannelName,
  maxSentSequence,
  mergeMessages,
  messageFromRealtime,
  replaceWithLatest,
  sortMessages,
} from "@/lib/chat/messages";
import type {
  ChatMessage,
  ConversationSummary,
  Me,
  Person,
  PublicChannel,
} from "@/lib/chat/types";
import { apiFetch } from "@/components/chat/api";
import { Sidebar } from "@/components/chat/sidebar";
import { Thread } from "@/components/chat/thread";

type Connection = "idle" | "connecting" | "live" | "reconnecting";

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--you)]";

const connectionLabel: Record<Connection, string> = {
  idle: "Not connected",
  connecting: "Connecting",
  live: "Connected",
  reconnecting: "Reconnecting",
};


function bumpConversation(current: ConversationSummary[], conversationId: string) {
  const index = current.findIndex((item) => item.id === conversationId);
  if (index <= 0) return current;
  const next = [...current];
  const [item] = next.splice(index, 1);
  return [item, ...next];
}

export function ChatShell({ me }: { me: Me }) {
  const [displayName, setDisplayName] = useState(me.displayName);
  const [savingName, setSavingName] = useState(false);
  const [nameMessage, setNameMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [searching, setSearching] = useState(false);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messagesById, setMessagesById] = useState<Record<string, ChatMessage[]>>({});
  const [exhausted, setExhausted] = useState<Record<string, boolean>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [channelName, setChannelName] = useState("");
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [directory, setDirectory] = useState<PublicChannel[]>([]);
  const [directoryVersion, setDirectoryVersion] = useState(0);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [channelError, setChannelError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [connection, setConnection] = useState<Connection>("idle");
  const [outgoingToken, setOutgoingToken] = useState(0);
  const messagesRef = useRef(messagesById);
  const activeIdRef = useRef(activeId);
  const displayNameRef = useRef(displayName);
  const senderNamesRef = useRef(new Map<string, string>());
  messagesRef.current = messagesById;
  activeIdRef.current = activeId;
  displayNameRef.current = displayName;

  function rememberSenderNames(messages: ChatMessage[]) {
    for (const message of messages) {
      const name = message.senderDisplayName?.trim();
      if (name) senderNamesRef.current.set(message.senderId, name);
    }
  }

  function updateMessages(
    conversationId: string,
    updater: (current: ChatMessage[]) => ChatMessage[],
  ) {
    setMessagesById((current) => ({
      ...current,
      [conversationId]: updater(current[conversationId] ?? []),
    }));
  }

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ conversations: ConversationSummary[] }>("/api/conversations")
      .then((data) => {
        if (!cancelled) setConversations(data.conversations);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setListError(error instanceof Error ? error.message : "Could not load conversations");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ channels: PublicChannel[] }>("/api/channels")
      .then((data) => {
        if (!cancelled) setDirectory(data.channels);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setChannelError(
            error instanceof Error ? error.message : "Could not load channels",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [directoryVersion]);

  useEffect(() => {
    let cancelled = false;
    const handle = window.setTimeout(() => {
      setSearching(true);
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      apiFetch<{ users: Person[] }>(`/api/users?${params.toString()}`)
        .then((data) => {
          if (!cancelled) setPeople(data.users);
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setListError(error instanceof Error ? error.message : "Could not search people");
          }
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [query]);

  useEffect(() => {
    if (!activeId) {
      setConnection("idle");
      return;
    }

    const conversationId = activeId;
    let cancelled = false;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function catchUp() {
      let cursor = maxSentSequence(messagesRef.current[conversationId] ?? []);
      const incoming: ChatMessage[] = [];
      for (let page = 0; page < 20; page += 1) {
        const data = await apiFetch<{ messages: ChatMessage[] }>(
          `/api/conversations/${conversationId}/messages?afterSequence=${cursor}`,
        );
        if (data.messages.length === 0) break;
        incoming.push(...data.messages);
        const last = data.messages[data.messages.length - 1];
        if (!last || data.messages.length < MESSAGE_PAGE_SIZE) break;
        cursor = last.sequence;
      }
      if (cancelled || incoming.length === 0) return;
      rememberSenderNames(incoming);
      updateMessages(conversationId, (current) => mergeMessages(current, incoming));
      setConversations((current) => bumpConversation(current, conversationId));
    }

    async function start() {
      setConnection("connecting");
      setLoadingId(conversationId);
      try {
        const data = await apiFetch<{ messages: ChatMessage[] }>(
          `/api/conversations/${conversationId}/messages`,
        );
        if (cancelled) return;
        rememberSenderNames(data.messages);
        updateMessages(conversationId, (current) =>
          replaceWithLatest(current, data.messages),
        );
        setExhausted((current) => ({
          ...current,
          [conversationId]: data.messages.length < MESSAGE_PAGE_SIZE,
        }));
      } catch (error: unknown) {
        if (!cancelled) {
          setListError(error instanceof Error ? error.message : "Could not load messages");
        }
      } finally {
        if (!cancelled) setLoadingId((current) => (current === conversationId ? null : current));
      }

      if (cancelled) return;
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.access_token) {
        await supabase.realtime.setAuth(sessionData.session.access_token);
      }
      if (cancelled) return;

      channel = supabase
        .channel(`messages:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const message = messageFromRealtime(payload.new);
            if (!message || message.conversationId !== conversationId) return;
            void namedRealtimeMessage(message).then((named) => {
              if (cancelled) return;
              rememberSenderNames([named]);
              updateMessages(conversationId, (current) => mergeMessages(current, [named]));
              setConversations((current) => bumpConversation(current, conversationId));
            });
          },
        )
        .subscribe((status) => {
          if (cancelled || activeIdRef.current !== conversationId) return;
          if (status === "SUBSCRIBED") {
            setConnection("live");
            void catchUp().catch(() => setConnection("reconnecting"));
          } else if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            setConnection("reconnecting");
          }
        });
    }

    async function namedRealtimeMessage(message: ChatMessage) {
      if (message.senderId === me.userId) {
        const ownName = displayNameRef.current.trim();
        return { ...message, senderDisplayName: ownName || null };
      }
      const cached = senderNamesRef.current.get(message.senderId);
      if (cached) return { ...message, senderDisplayName: cached };
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", message.senderId)
        .maybeSingle();
      if (error || typeof data?.display_name !== "string") {
        return { ...message, senderDisplayName: null };
      }
      const name = data.display_name.trim();
      if (name) senderNamesRef.current.set(message.senderId, name);
      return { ...message, senderDisplayName: name || null };
    }

    void start();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [activeId]);

  async function saveDisplayName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNameError(null);
    setNameMessage(null);
    const nextName = displayName.trim();
    if (nextName.length < 1 || nextName.length > 40) {
      setNameError("Use 1 to 40 characters.");
      return;
    }
    setSavingName(true);
    try {
      const profile = await apiFetch<Me>("/api/me", {
        method: "PATCH",
        body: JSON.stringify({ displayName: nextName }),
      });
      setDisplayName(profile.displayName);
      setNameMessage("Saved");
    } catch (error: unknown) {
      setNameError(error instanceof Error ? error.message : "Could not save your name");
    } finally {
      setSavingName(false);
    }
  }

  function rememberConversation(conversation: ConversationSummary) {
    setConversations((current) => [
      conversation,
      ...current.filter((item) => item.id !== conversation.id),
    ]);
    setActionError(null);
    setActiveId(conversation.id);
  }

  async function openPerson(person: Person) {
    setOpeningId(person.userId);
    setListError(null);
    try {
      const conversation = await apiFetch<ConversationSummary>(
        "/api/conversations/direct",
        {
          method: "POST",
          body: JSON.stringify({ recipientId: person.userId }),
        },
      );
      rememberConversation(conversation);
    } catch (error: unknown) {
      setListError(error instanceof Error ? error.message : "Could not open conversation");
    } finally {
      setOpeningId(null);
    }
  }

  async function createChannel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChannelError(null);
    const nameError = invalidChannelName(channelName);
    if (nameError) {
      setChannelError(nameError);
      return;
    }
    setCreatingChannel(true);
    try {
      const conversation = await apiFetch<ConversationSummary>("/api/channels", {
        method: "POST",
        body: JSON.stringify({ name: channelName.trim() }),
      });
      setChannelName("");
      rememberConversation(conversation);
      setDirectoryVersion((current) => current + 1);
    } catch (error: unknown) {
      setChannelError(error instanceof Error ? error.message : "Could not create channel");
    } finally {
      setCreatingChannel(false);
    }
  }

  async function joinChannel(channel: PublicChannel) {
    setJoiningId(channel.id);
    setChannelError(null);
    try {
      const conversation = await apiFetch<ConversationSummary>(
        `/api/channels/${channel.id}/join`,
        { method: "POST" },
      );
      rememberConversation(conversation);
      setDirectoryVersion((current) => current + 1);
    } catch (error: unknown) {
      setChannelError(error instanceof Error ? error.message : "Could not join channel");
    } finally {
      setJoiningId(null);
    }
  }

  async function leaveChannel() {
    if (!activeId) return;
    const conversationId = activeId;
    setLeaving(true);
    setActionError(null);
    try {
      await apiFetch<{ id: string }>(`/api/channels/${conversationId}/members/me`, {
        method: "DELETE",
      });
      setConversations((current) =>
        current.filter((conversation) => conversation.id !== conversationId),
      );
      setMessagesById((current) => {
        const next = { ...current };
        delete next[conversationId];
        return next;
      });
      setActiveId((current) => (current === conversationId ? null : current));
      setDirectoryVersion((version) => version + 1);
    } catch (error: unknown) {
      setActionError(error instanceof Error ? error.message : "Could not leave channel");
    } finally {
      setLeaving(false);
    }
  }

  async function sendMessage(content: string, clientMessageId = crypto.randomUUID()) {
    if (!activeId) return;
    const conversationId = activeId;
    setOutgoingToken((current) => current + 1);
    updateMessages(conversationId, (current) => {
      const existing = current.find(
        (message) => message.clientMessageId === clientMessageId,
      );
      if (existing) {
        return current.map((message) =>
          message.clientMessageId === clientMessageId
            ? { ...message, status: "pending" }
            : message,
        );
      }
      return sortMessages([
        ...current,
        {
          id: `local:${clientMessageId}`,
          conversationId,
          senderId: me.userId,
          senderDisplayName: displayName.trim() || null,
          clientMessageId,
          sequence: 0,
          content,
          createdAt: new Date().toISOString(),
          status: "pending",
        },
      ]);
    });

    try {
      const message = await apiFetch<ChatMessage>(
        `/api/conversations/${conversationId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ clientMessageId, content }),
        },
      );
      rememberSenderNames([message]);
      updateMessages(conversationId, (current) => mergeMessages(current, [message]));
      setConversations((current) => bumpConversation(current, conversationId));
    } catch {
      updateMessages(conversationId, (current) =>
        current.map((message) =>
          message.clientMessageId === clientMessageId
            ? { ...message, status: "failed" }
            : message,
        ),
      );
    }
  }

  async function loadEarlier() {
    if (!activeId) return false;
    const conversationId = activeId;
    const oldest = (messagesRef.current[conversationId] ?? []).find(
      (message) => message.status === "sent",
    );
    if (!oldest) return false;
    setLoadingEarlier(true);
    try {
      const data = await apiFetch<{ messages: ChatMessage[] }>(
        `/api/conversations/${conversationId}/messages?beforeSequence=${oldest.sequence}`,
      );
      rememberSenderNames(data.messages);
      updateMessages(conversationId, (current) => mergeMessages(current, data.messages));
      const done = data.messages.length < MESSAGE_PAGE_SIZE;
      setExhausted((current) => ({ ...current, [conversationId]: done }));
      return data.messages.length > 0;
    } catch (error: unknown) {
      setListError(error instanceof Error ? error.message : "Could not load earlier messages");
      return false;
    } finally {
      setLoadingEarlier(false);
    }
  }

  const active = conversations.find((conversation) => conversation.id === activeId) ?? null;
  const messages = activeId ? messagesById[activeId] ?? [] : [];
  const sentCount = messages.filter((message) => message.status === "sent").length;
  const activeTitle = active ? conversationTitle(active) : "";
  const activeIsChannel = active?.type === "channel";

  return (
    <div
      className="flex h-dvh flex-col bg-[var(--paper)] text-[var(--ink)]"
      style={{ colorScheme: "light" }}
    >
      <h1 className="sr-only">Messages</h1>
      <a
        href="#workspace"
        className={`sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-20 focus:rounded-[10px] focus:bg-[var(--sheet)] focus:px-4 focus:py-3 focus:text-sm focus:font-semibold focus:text-[var(--ink)] ${focusRing}`}
      >
        Skip to conversations
      </a>

      <div id="workspace" className="grid min-h-0 flex-1 md:grid-cols-[18rem_minmax(0,1fr)]">
        <Sidebar
          className={activeId ? "hidden md:flex" : "flex"}
          email={me.email}
          displayName={displayName}
          onDisplayNameChange={(value) => {
            setDisplayName(value);
            setNameMessage(null);
          }}
          onSaveDisplayName={saveDisplayName}
          savingName={savingName}
          nameMessage={nameMessage}
          nameError={nameError}
          query={query}
          onQueryChange={setQuery}
          people={people}
          searching={searching}
          openingId={openingId}
          onOpenPerson={(person) => void openPerson(person)}
          conversations={conversations}
          activeId={activeId}
          onSelectConversation={(id) => {
            setActionError(null);
            setActiveId(id);
          }}
          listError={active ? null : listError}
          channelName={channelName}
          onChannelNameChange={(value) => {
            setChannelName(value);
            setChannelError(null);
          }}
          onCreateChannel={(event) => void createChannel(event)}
          creatingChannel={creatingChannel}
          directory={directory}
          joiningId={joiningId}
          onJoinChannel={(channel) => void joinChannel(channel)}
          channelError={channelError}
          connection={connection}
          connectionText={connectionLabel[connection]}
        />

        {active ? (
          <Thread
            conversationId={active.id}
            title={activeTitle}
            logLabel={
              activeIsChannel
                ? `Messages in ${activeTitle}`
                : `Messages with ${activeTitle}`
            }
            meId={me.userId}
            showSenderNames={activeIsChannel}
            messages={messages}
            loading={loadingId === active.id}
            canLoadEarlier={!exhausted[active.id] && sentCount > 0}
            loadingEarlier={loadingEarlier}
            outgoingToken={outgoingToken}
            onLoadEarlier={loadEarlier}
            onRetry={(message) => void sendMessage(message.content, message.clientMessageId)}
            onSend={(content) => void sendMessage(content)}
            onBack={() => {
              setActionError(null);
              setActiveId(null);
            }}
            onLeave={activeIsChannel ? () => void leaveChannel() : undefined}
            leaving={leaving}
            actionError={actionError}
            listError={listError}
            connection={connection}
            connectionText={connectionLabel[connection]}
          />
        ) : (
          <section
            id="conversation"
            className="hidden place-items-center bg-[var(--paper)] px-6 md:grid"
          >
            <p className="max-w-sm text-center text-lg font-medium leading-7 text-[var(--ink)]">
              Pick a channel or a person.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
