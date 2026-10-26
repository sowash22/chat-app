import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessage, ConversationSummary, MessageRow } from "@/lib/chat/types";

export { CHANNEL_NAME_MAX, invalidChannelName } from "@/lib/chat/channel-name";

export const MESSAGE_PAGE_SIZE = 50;

export function messageFromRow(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderDisplayName: null,
    clientMessageId: row.client_message_id,
    sequence: Number(row.sequence),
    content: row.content,
    createdAt: row.created_at,
    status: "sent",
  };
}

function trimmedName(value: string | null | undefined) {
  const name = value?.trim();
  return name ? name : null;
}

export function keepSenderDisplayName(
  incoming: string | null | undefined,
  existing: string | null | undefined,
) {
  return trimmedName(incoming) ?? trimmedName(existing);
}

export async function attachSenderDisplayNames(
  supabase: SupabaseClient,
  messages: ChatMessage[],
): Promise<
  | { ok: true; messages: ChatMessage[] }
  | { ok: false; error: { code?: string; message?: string } }
> {
  const ids = [...new Set(messages.map((message) => message.senderId))];
  if (ids.length === 0) return { ok: true, messages };

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", ids);

  if (error) return { ok: false, error };

  const names = new Map<string, string>();
  for (const profile of (data ?? []) as {
    user_id: string;
    display_name: string;
  }[]) {
    const name = trimmedName(profile.display_name);
    if (name) names.set(profile.user_id, name);
  }

  return {
    ok: true,
    messages: messages.map((message) => ({
      ...message,
      senderDisplayName: names.get(message.senderId) ?? null,
    })),
  };
}

export function conversationTitle(conversation: ConversationSummary) {
  if (conversation.type === "channel") {
    const name = conversation.name?.trim();
    return name ? `#${name}` : "Channel";
  }
  return conversation.peer?.displayName || "Direct message";
}

export function sortMessages(messages: ChatMessage[]) {
  return [...messages].sort((a, b) => {
    const aPending = a.status !== "sent";
    const bPending = b.status !== "sent";
    if (aPending !== bPending) return aPending ? 1 : -1;
    if (a.sequence !== b.sequence) return a.sequence - b.sequence;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]) {
  const next = [...current];

  for (const message of incoming) {
    const sent: ChatMessage = {
      ...message,
      status: "sent",
      senderDisplayName: trimmedName(message.senderDisplayName),
    };
    const byId = next.findIndex((item) => item.id === sent.id);
    if (byId >= 0) {
      next[byId] = {
        ...sent,
        senderDisplayName: keepSenderDisplayName(
          sent.senderDisplayName,
          next[byId].senderDisplayName,
        ),
      };
      continue;
    }

    const byClient = next.findIndex(
      (item) =>
        item.clientMessageId === sent.clientMessageId &&
        item.senderId === sent.senderId,
    );
    if (byClient >= 0) {
      next[byClient] = {
        ...sent,
        senderDisplayName: keepSenderDisplayName(
          sent.senderDisplayName,
          next[byClient].senderDisplayName,
        ),
      };
    } else next.push(sent);
  }

  return sortMessages(next);
}

export function replaceWithLatest(current: ChatMessage[], latest: ChatMessage[]) {
  const sent = mergeMessages([], latest);
  const pending = current.filter((message) => {
    if (message.status === "sent") return false;
    return !sent.some(
      (item) =>
        item.clientMessageId === message.clientMessageId &&
        item.senderId === message.senderId,
    );
  });
  return sortMessages([...sent, ...pending]);
}

export function maxSentSequence(messages: ChatMessage[]) {
  return messages.reduce(
    (max, message) =>
      message.status === "sent" ? Math.max(max, message.sequence) : max,
    0,
  );
}

export function isMessageRow(value: unknown): value is MessageRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  const sequence =
    typeof row.sequence === "number" ? row.sequence : Number(row.sequence);

  return (
    typeof row.id === "string" &&
    typeof row.conversation_id === "string" &&
    typeof row.sender_id === "string" &&
    typeof row.client_message_id === "string" &&
    typeof row.content === "string" &&
    typeof row.created_at === "string" &&
    Number.isSafeInteger(sequence)
  );
}

export function messageFromRealtime(value: unknown) {
  if (!isMessageRow(value)) return null;
  const sequence =
    typeof value.sequence === "number" ? value.sequence : Number(value.sequence);
  return messageFromRow({ ...value, sequence });
}
