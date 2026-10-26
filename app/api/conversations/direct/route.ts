import {
  apiError,
  isRecord,
  isUuid,
  postgresError,
  readJson,
  withApi,
} from "@/lib/api/http";
import { loadConversationSummaries } from "@/lib/api/conversations";
import { requireSession } from "@/lib/api/session";
import { NextResponse } from "next/server";

type ConversationRow = { id: string };

function firstRow<T>(data: T | T[] | null) {
  if (Array.isArray(data)) return data[0] ?? null;
  return data;
}

export const POST = withApi(async (request, requestId) => {
  const auth = await requireSession(requestId);
  if (!auth.ok) return auth.response;
  const session = auth.session;

  const body = await readJson(request);
  if (!isRecord(body)) {
    return apiError(400, "22023", "recipientId is required", requestId);
  }

  const recipientId = body.recipientId;
  if (recipientId == null) {
    return apiError(400, "22023", "recipient_id is required", requestId);
  }
  if (!isUuid(recipientId)) {
    return apiError(400, "22023", "recipientId must be a uuid", requestId);
  }

  const { data, error } = await session.supabase.rpc(
    "open_direct_conversation",
    { recipient_id: recipientId },
  );

  if (error) return postgresError(error, requestId);

  const row = firstRow(data as ConversationRow | ConversationRow[] | null);
  if (!row?.id) return apiError(500, "50000", "request failed", requestId);

  const result = await loadConversationSummaries(
    session.supabase,
    session.userId,
    requestId,
    [row.id],
  );
  if (!result.ok) return result.response;

  const conversation = result.conversations[0];
  if (!conversation) {
    return apiError(500, "50000", "request failed", requestId);
  }

  return NextResponse.json(conversation);
});
