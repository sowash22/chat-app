# Supabase setup

Create the project and run the chat schema before starting the app. The app uses the publishable key only. Leave the secret key (service role) out of the app and out of git.

## 1. Create a project

Open [database.new](https://database.new) and create a project. Wait until the database is ready.

## 2. Copy the project URL and publishable key

In the dashboard, open **Project Settings → API** (or **Connect**).

Copy:

- **Project URL**
- **Publishable** key (`sb_publishable_...`)

If the dashboard still shows a legacy **anon** key, that is the same public key. Use it in the publishable-key variable below.

Leave the **secret** / service-role key out of the app for this POC.

## 3. Auth URL configuration

Open **Authentication → URL configuration**.

- Site URL: `http://localhost:3000`
- Redirect URLs: add `http://localhost:3000/**`

## 4. Email provider

Open **Authentication → Sign In / Providers → Email**.

- Leave **Email** on.
- Turn **Confirm email** off so two test users can sign in immediately.

You can turn confirmation back on later.

## 5. Run the migration

After this repo contains `supabase/migrations/0001_chat.sql`:

1. Open **SQL Editor → New query**.
2. Paste the whole file.
3. Run it once.

The SQL Editor runs that paste as one transaction. If a statement fails, the script rolls back. Running the whole file a second time fails at `create table`. The block that adds `messages` to `supabase_realtime` is safe to run again on its own.

Public channels are a second paste. After `0001_chat.sql` has succeeded:

1. Open **SQL Editor → New query**.
2. Paste the whole file `supabase/migrations/0002_channels.sql`.
3. Run it once.

That file does not rewrite the tables from the first migration. Running it again is safe: it replaces the channel functions and skips the name index if it already exists. Until this paste succeeds, creating or joining a channel from the app fails.

## 6. Confirm tables and Realtime

In **Table Editor**, confirm these tables exist:

- `profiles`
- `conversations`
- `conversation_members`
- `messages`

In **Database → Publications**, confirm `messages` is in the `supabase_realtime` publication.

Or run:

```sql
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and tablename = 'messages';
```

That query should return one row for `public.messages`.

Sign up or insert a user, then check `profiles`. A trigger on `auth.users` inserts a row and sets `display_name` from the email local-part (`ada` for `ada@example.com`). If the email is missing, the name is `user`.

## 7. Local environment

Create `.env.local` in the repo root. Do not put these values in a committed `.env`.

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

`NEXT_PUBLIC_SUPABASE_URL` is the Project URL from step 2.

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is the publishable key. If you only have the legacy anon key, put that value here.

## 8. Two test users

Either:

- **Authentication → Users → Add user** (email and password), twice, or
- Sign up from the app once it is running.

Use two browser profiles on `http://localhost:3000` when you try the DM.
