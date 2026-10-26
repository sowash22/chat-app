import { withApi, postgresError } from "@/lib/api/http";
import { loadConversationSummaries } from "@/lib/api/conversations";
import { requireSession } from "@/lib/api/session";
import { NextResponse } from "next/server";

export const GET = withApi(async (_request, requestId) => {
  const result = await requireSession(requestId);
  if (!result.ok) return result.response;
  const session = result.session;

  const { data: memberships, error } = await session.supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", session.userId);

  if (error) return postgresError(error, requestId);

  const ids = (
    (memberships ?? []) as { conversation_id: string }[]
  ).map((membership) => membership.conversation_id);

  const summaries = await loadConversationSummaries(
    session.supabase,
    session.userId,
    requestId,
    ids,
  );
  if (!summaries.ok) return summaries.response;

  return NextResponse.json({ conversations: summaries.conversations });
});
