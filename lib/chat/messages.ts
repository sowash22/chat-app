import type { ChatMessage, ConversationSummary, MessageRow } from "@/lib/chat/types";

export { CHANNEL_NAME_MAX, invalidChannelName } from "@/lib/chat/channel-name";

export const MESSAGE_PAGE_SIZE = 50;

export function messageFromRow(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    clientMessageId: row.client_message_id,
    sequence: Number(row.sequence),
    content: row.content,
    createdAt: row.created_at,
    status: "sent",
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
    const sent: ChatMessage = { ...message, status: "sent" };
    const byId = next.findIndex((item) => item.id === sent.id);
    if (byId >= 0) {
      next[byId] = sent;
      continue;
    }

    const byClient = next.findIndex(
      (item) =>
        item.clientMessageId === sent.clientMessageId &&
        item.senderId === sent.senderId,
    );
    if (byClient >= 0) next[byClient] = sent;
    else next.push(sent);
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
