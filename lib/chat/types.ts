export type Person = {
  userId: string;
  displayName: string;
};

export type Me = Person & {
  email: string;
};

export type ConversationSummary = {
  id: string;
  type: string;
  name: string | null;
  createdAt: string;
  peer: Person | null;
};

export type PublicChannel = {
  id: string;
  name: string;
  visibility: string;
  joined: boolean;
};

export type MessageStatus = "pending" | "sent" | "failed";

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  senderDisplayName: string | null;
  clientMessageId: string;
  sequence: number;
  content: string;
  createdAt: string;
  status: MessageStatus;
};

export type ApiFailure = {
  code: string;
  message: string;
  requestId: string;
};

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  client_message_id: string;
  sequence: number;
  content: string;
  created_at: string;
};
