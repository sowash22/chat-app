# Slack DM POC

## Objective

Two signed-in users share one unique direct message. Each user sees the other's messages live. After a refresh, the transcript is still there, in order.

## Stack

- Next.js 16 App Router. Chat reads and writes go through route handlers. The signed-in Supabase session comes from cookies.
- Supabase Auth with email and password.
- Postgres Row Level Security is the permission check.
- Live delivery is Supabase Realtime `postgres_changes` on `messages`. After a reconnect, the client refetches with `afterSequence`.

Opening a DM and sending a message run as Postgres functions (`open_direct_conversation`, `send_message`) so the unique DM, both memberships, the sequence number, and a duplicate `client_message_id` commit in one transaction.

This POC uses Next.js plus Supabase Realtime rather than Express and Socket.IO.

## In this POC

- Email and password sign up, sign in, and sign out.
- A profile row per user, with a display name taken from the email local-part.
- One DM per pair of users. Opening it again returns the same conversation.
- Send a text message (1–4000 characters). A retry with the same client message id and the same body returns the original row.
- Members can read the conversation, its memberships, and its messages. A non-member cannot read or send.
- History stays ordered by `sequence` after refresh.
- Public channels. A signed-in user can create one, discover public channels, join, read and send as a member, and leave. Direct messages stay private and are not listed in discovery.

## Later

Private channels, invites, file uploads, threads, and a transactional outbox are later passes. Rate limits and deployment wait with them.

## Acceptance

- An invalid session gets 401 on the API routes.
- Two users opening a DM at the same time get one conversation.
- The same client message id stays one row.
- Refresh keeps history in sequence order.
- The other browser receives the message without a refresh.
- A non-member cannot read or send.
