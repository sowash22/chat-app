import { apiError, isRecord, postgresError, readJson, withApi } from "@/lib/api/http";
import { requireSession } from "@/lib/api/session";
import { NextResponse } from "next/server";

function profileJson(userId: string, displayName: string, email: string) {
  return { userId, displayName, email };
}

export const GET = withApi(async (_request, requestId) => {
  const result = await requireSession(requestId);
  if (!result.ok) return result.response;
  const session = result.session;

  const { data, error } = await session.supabase
    .from("profiles")
    .select("user_id, display_name")
    .eq("user_id", session.userId)
    .maybeSingle();

  if (error) return postgresError(error, requestId);
  if (!data) return apiError(404, "P0002", "profile not found", requestId);

  return NextResponse.json(
    profileJson(data.user_id, data.display_name, session.email),
  );
});

export const PATCH = withApi(async (request, requestId) => {
  const result = await requireSession(requestId);
  if (!result.ok) return result.response;
  const session = result.session;

  const body = await readJson(request);
  if (!isRecord(body) || typeof body.displayName !== "string") {
    return apiError(400, "22023", "displayName is required", requestId);
  }

  const displayName = body.displayName.trim();
  if (
    displayName.length < 1 ||
    displayName.length > 40 ||
    /[\u0000-\u001F]/.test(displayName)
  ) {
    return apiError(
      400,
      "22023",
      "display name must be 1 to 40 characters",
      requestId,
    );
  }

  const { data, error } = await session.supabase
    .from("profiles")
    .update({ display_name: displayName })
    .eq("user_id", session.userId)
    .select("user_id, display_name")
    .maybeSingle();

  if (error) return postgresError(error, requestId);
  if (!data) return apiError(404, "P0002", "profile not found", requestId);

  return NextResponse.json(
    profileJson(data.user_id, data.display_name, session.email),
  );
});
