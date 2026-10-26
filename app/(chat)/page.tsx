import { Suspense } from "react";
import { ChatGate } from "@/components/chat/chat-gate";

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="grid h-dvh place-items-center bg-neutral-100 text-sm text-neutral-700">
          Loading chat…
        </div>
      }
    >
      <ChatGate />
    </Suspense>
  );
}
