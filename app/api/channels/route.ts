import { loadPublicChannels, summaryForConversation } from "@/lib/api/channels";
import {
  apiError,
  isRecord,
  postgresError,
  readJson,
  withApi,
} from "@/lib/api/http";
import { requireSession } from "@/lib/api/session";
import { invalidChannelName } from "@/lib/chat/channel-name";
import { NextResponse } from "next/server";

export const GET = withApi(async (_request, requestId) => {
  const auth = await requireSession(requestId);
  if (!auth.ok) return auth.response;

  const directory = await loadPublicChannels(auth.session.supabase, requestId);
  if (!directory.ok) return directory.response;

  return NextResponse.json({ channels: directory.channels });
});

export const POST = withApi(async (request, requestId) => {
  const auth = await requireSession(requestId);
  if (!auth.ok) return auth.response;
  const session = auth.session;

  const body = await readJson(request);
  if (!isRecord(body) || typeof body.name !== "string") {
    return apiError(400, "22023", "name is required", requestId);
  }

  const name = body.name.trim();
  const nameError = invalidChannelName(name);
  if (nameError) return apiError(400, "22023", nameError, requestId);

  const { data, error } = await session.supabase.rpc("create_channel", {
    channel_name: name,
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
