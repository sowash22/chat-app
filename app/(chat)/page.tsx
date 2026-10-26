import { Suspense } from "react";
import { ChatGate } from "@/components/chat/chat-gate";

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div
          className="grid h-dvh place-items-center bg-[var(--paper)] px-6 text-base text-[var(--quiet)]"
          aria-live="polite"
        >
          <p>Loading chat…</p>
        </div>
      }
    >
      <ChatGate />
    </Suspense>
  );
}
