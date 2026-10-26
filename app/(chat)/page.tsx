import { Suspense } from "react";
import { ChatGate } from "@/components/chat/chat-gate";

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div
          className="grid h-dvh place-items-center bg-slate-100 px-6 text-base text-slate-700"
          aria-live="polite"
        >
          <p className="flex items-center gap-3">
            <span
              aria-hidden
              className="size-2.5 rounded-full bg-blue-800 motion-safe:animate-pulse"
            />
            Loading chat…
          </p>
        </div>
      }
    >
      <ChatGate />
    </Suspense>
  );
}
