import type { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { postgresError } from "@/lib/api/http";
import type { ConversationSummary, Person } from "@/lib/chat/types";

type SummaryResult =
  | { ok: true; conversations: ConversationSummary[] }
  | { ok: false; response: NextResponse };

type ConversationRow = {
  id: string;
  type: string;
  name: string | null;
  created_at: string;
};

export async function loadConversationSummaries(
  supabase: SupabaseClient,
  userId: string,
  requestId: string,
  onlyIds?: string[],
): Promise<SummaryResult> {
  if (onlyIds && onlyIds.length === 0) {
    return { ok: true, conversations: [] };
  }

  let conversationQuery = supabase
    .from("conversations")
    .select("id, type, name, created_at")
    .order("created_at", { ascending: false });

  if (onlyIds) conversationQuery = conversationQuery.in("id", onlyIds);

  const { data: conversations, error: conversationError } =
    await conversationQuery;

  if (conversationError) {
    return { ok: false, response: postgresError(conversationError, requestId) };
  }

  const rows = (conversations ?? []) as ConversationRow[];
  if (rows.length === 0) return { ok: true, conversations: [] };

  const ids = rows.map((row) => row.id);
  const { data: members, error: memberError } = await supabase
    .from("conversation_members")
    .select("conversation_id, user_id")
    .in("conversation_id", ids);

  if (memberError) {
    return { ok: false, response: postgresError(memberError, requestId) };
  }

  const memberRows = (members ?? []) as {
    conversation_id: string;
    user_id: string;
  }[];
  const peerIds = [
    ...new Set(
      memberRows
        .map((member) => member.user_id)
        .filter((memberId) => memberId !== userId),
    ),
  ];

  const profiles = new Map<string, string>();
  if (peerIds.length > 0) {
    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", peerIds);

    if (profileError) {
      return { ok: false, response: postgresError(profileError, requestId) };
    }

    for (const profile of (profileRows ?? []) as {
      user_id: string;
      display_name: string;
    }[]) {
      profiles.set(profile.user_id, profile.display_name);
    }
  }

  const peersByConversation = new Map<string, Person>();
  for (const member of memberRows) {
    if (member.user_id === userId || peersByConversation.has(member.conversation_id)) {
      continue;
    }
    peersByConversation.set(member.conversation_id, {
      userId: member.user_id,
      displayName: profiles.get(member.user_id) ?? "user",
    });
  }

  return {
    ok: true,
    conversations: rows.map((row) => ({
      id: row.id,
      type: row.type,
      name: row.name,
      createdAt: row.created_at,
      peer: peersByConversation.get(row.id) ?? null,
    })),
  };
}
