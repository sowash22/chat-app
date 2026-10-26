import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatShell } from "@/components/chat/chat-shell";

export async function ChatGate() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <ChatShell
      me={{
        userId: user.id,
        email: user.email ?? "",
        displayName:
          profile?.display_name ?? user.email?.split("@")[0] ?? "user",
      }}
    />
  );
}
