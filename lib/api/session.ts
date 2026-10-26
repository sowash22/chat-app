import { createClient } from "@/lib/supabase/server";
import { apiError } from "@/lib/api/http";
import type { NextResponse } from "next/server";

export type SessionContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  email: string;
};

export async function requireSession(
  requestId: string,
): Promise<
  { ok: true; session: SessionContext } | { ok: false; response: NextResponse }
> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return {
      ok: false,
      response: apiError(401, "28000", "not authenticated", requestId),
    };
  }

  return {
    ok: true,
    session: {
      supabase,
      userId: data.user.id,
      email: data.user.email ?? "",
    },
  };
}
