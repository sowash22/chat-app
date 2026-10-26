import { summaryForConversation } from "@/lib/api/channels";
import { apiError, isUuid, postgresError, withApi } from "@/lib/api/http";
import { requireSession } from "@/lib/api/session";
import { NextResponse } from "next/server";

export const POST = withApi(async (_request, requestId, context) => {
  const auth = await requireSession(requestId);
  if (!auth.ok) return auth.response;
  const session = auth.session;

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(400, "22023", "channel id must be a uuid", requestId);
  }

  const { data, error } = await session.supabase.rpc("join_public_channel", {
    conversation_id: id,
  });
  if (error) return postgresError(error, requestId);

  const result = await summaryForConversation(
    session.supabase,
    session.userId,
    requestId,
    data,
  );
  if (!result.ok) return result.response;

  return NextResponse.json(result.conversation);
});
