import {
  apiError,
  isRecord,
  isUuid,
  parseSequence,
  postgresError,
  readJson,
  withApi,
} from "@/lib/api/http";
import { requireSession } from "@/lib/api/session";
import {
  MESSAGE_PAGE_SIZE,
  attachSenderDisplayNames,
  messageFromRow,
} from "@/lib/chat/messages";
import type { MessageRow } from "@/lib/chat/types";
import { NextResponse } from "next/server";

function firstRow<T>(data: T | T[] | null) {
  if (Array.isArray(data)) return data[0] ?? null;
  return data;
}

async function assertMember(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  conversationId: string,
  userId: string,
  requestId: string,
) {
  const { data, error } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return postgresError(error, requestId);
  if (!data) {
    return apiError(403, "42501", "not a member of this conversation", requestId);
  }
  return null;
}

export const GET = withApi(async (request, requestId, context) => {
  const auth = await requireSession(requestId);
  if (!auth.ok) return auth.response;
  const session = auth.session;

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(400, "22023", "conversation id must be a uuid", requestId);
  }

  const url = new URL(request.url);
  const before = parseSequence(url.searchParams.get("beforeSequence"));
  const after = parseSequence(url.searchParams.get("afterSequence"));
  if (before === "invalid" || after === "invalid") {
    return apiError(400, "22023", "sequence must be an integer", requestId);
  }

  const forbidden = await assertMember(
    session.supabase,
    id,
    session.userId,
    requestId,
  );
  if (forbidden) return forbidden;

  let query = session.supabase
    .from("messages")
    .select(
      "id, conversation_id, sender_id, client_message_id, sequence, content, created_at",
    )
    .eq("conversation_id", id);

  if (before != null) query = query.lt("sequence", before);
  if (after != null) query = query.gt("sequence", after);

  const descending = after == null;
  const { data, error } = await query
    .order("sequence", { ascending: !descending })
    .limit(MESSAGE_PAGE_SIZE);

  if (error) return postgresError(error, requestId);

  const rows = ((data ?? []) as MessageRow[]).map(messageFromRow);
  if (descending) rows.reverse();

  const named = await attachSenderDisplayNames(session.supabase, rows);
  if (!named.ok) return postgresError(named.error, requestId);

  return NextResponse.json({ messages: named.messages });
});

export const POST = withApi(async (request, requestId, context) => {
  const auth = await requireSession(requestId);
  if (!auth.ok) return auth.response;
  const session = auth.session;

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(400, "22023", "conversation id must be a uuid", requestId);
  }

  const body = await readJson(request);
  if (!isRecord(body)) {
    return apiError(400, "22023", "clientMessageId and content are required", requestId);
  }
  if (!isUuid(body.clientMessageId)) {
    return apiError(400, "22023", "clientMessageId must be a uuid", requestId);
  }
  if (typeof body.content !== "string" || body.content.length < 1 || body.content.length > 4000) {
    return apiError(
      400,
      "23514",
      "content length must be between 1 and 4000 characters",
      requestId,
    );
  }

  const { data, error } = await session.supabase.rpc("send_message", {
    conversation_id: id,
    client_message_id: body.clientMessageId,
    content: body.content,
  });

  if (error) return postgresError(error, requestId);

  const row = firstRow(data as MessageRow | MessageRow[] | null);
  if (!row?.id) return apiError(500, "50000", "request failed", requestId);

  const named = await attachSenderDisplayNames(session.supabase, [
    messageFromRow(row),
  ]);
  if (!named.ok) return postgresError(named.error, requestId);

  return NextResponse.json(named.messages[0]);
});
