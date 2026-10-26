import type { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { apiError, postgresError } from "@/lib/api/http";
import { loadConversationSummaries } from "@/lib/api/conversations";
import type { ConversationSummary, PublicChannel } from "@/lib/chat/types";

type SummaryResult =
  | { ok: true; conversation: ConversationSummary }
  | { ok: false; response: NextResponse };

type DirectoryResult =
  | { ok: true; channels: PublicChannel[] }
  | { ok: false; response: NextResponse };

function firstRow<T>(data: T | T[] | null) {
  if (Array.isArray(data)) return data[0] ?? null;
  return data;
}

function asJoined(value: unknown) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return false;
}

export async function summaryForConversation(
  supabase: SupabaseClient,
  userId: string,
  requestId: string,
  data: unknown,
): Promise<SummaryResult> {
  const row = firstRow(data as { id?: string } | { id?: string }[] | null);
  if (!row?.id) {
    return { ok: false, response: apiError(500, "50000", "request failed", requestId) };
  }

  const summaries = await loadConversationSummaries(
    supabase,
    userId,
    requestId,
    [row.id],
  );
  if (!summaries.ok) return summaries;

  const conversation = summaries.conversations[0];
  if (!conversation) {
    return { ok: false, response: apiError(500, "50000", "request failed", requestId) };
  }

  return { ok: true, conversation };
}

export async function loadPublicChannels(
  supabase: SupabaseClient,
  requestId: string,
): Promise<DirectoryResult> {
  const { data, error } = await supabase.rpc("list_public_channels");
  if (error) return { ok: false, response: postgresError(error, requestId) };

  const rows = Array.isArray(data) ? data : data ? [data] : [];
  const channels: PublicChannel[] = [];

  for (const row of rows as {
    id?: unknown;
    name?: unknown;
    visibility?: unknown;
    joined?: unknown;
  }[]) {
    if (typeof row.id !== "string" || typeof row.name !== "string") continue;
    channels.push({
      id: row.id,
      name: row.name,
      visibility: typeof row.visibility === "string" ? row.visibility : "public",
      joined: asJoined(row.joined),
    });
  }

  return { ok: true, channels };
}
