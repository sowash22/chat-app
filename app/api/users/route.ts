import { apiError, postgresError, withApi } from "@/lib/api/http";
import { requireSession } from "@/lib/api/session";
import { NextResponse } from "next/server";

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export const GET = withApi(async (request, requestId) => {
  const result = await requireSession(requestId);
  if (!result.ok) return result.response;
  const session = result.session;

  const query = new URL(request.url).searchParams.get("query")?.trim() ?? "";
  if (query.length > 80) {
    return apiError(400, "22023", "query is too long", requestId);
  }

  let profileQuery = session.supabase
    .from("profiles")
    .select("user_id, display_name")
    .neq("user_id", session.userId)
    .order("display_name", { ascending: true })
    .limit(20);

  if (query) {
    profileQuery = profileQuery.ilike("display_name", `%${escapeLike(query)}%`);
  }

  const { data, error } = await profileQuery;
  if (error) return postgresError(error, requestId);

  return NextResponse.json({
    users: ((data ?? []) as { user_id: string; display_name: string }[]).map(
      (profile) => ({
        userId: profile.user_id,
        displayName: profile.display_name,
      }),
    ),
  });
});
