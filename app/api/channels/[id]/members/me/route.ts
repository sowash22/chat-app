import { apiError, isUuid, postgresError, withApi } from "@/lib/api/http";
import { requireSession } from "@/lib/api/session";
import { NextResponse } from "next/server";

export const DELETE = withApi(async (_request, requestId, context) => {
  const auth = await requireSession(requestId);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!isUuid(id)) {
    return apiError(400, "22023", "channel id must be a uuid", requestId);
  }

  const { error } = await auth.session.supabase.rpc("leave_channel", {
    conversation_id: id,
  });
  if (error) return postgresError(error, requestId);

  return NextResponse.json({ id });
});
