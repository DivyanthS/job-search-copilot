# Setting up Job Copilot

This connects the app to **Supabase**, the free service that handles sign-in and stores your data.
It takes about 15 minutes, and you only do it once.

> You'll copy a couple of keys into a settings file yourself, and Claude can't type them for you.
> Keys are like passwords, so don't paste them into chats or emails.

---

## 1. Create a Supabase project

1. Go to **https://supabase.com** and sign up (signing in with GitHub is easiest).
2. Click **New project**.
3. Fill in:
   - **Name:** `job-copilot`
   - **Database password:** click *Generate*, then save it in your password manager. You won't need it often.
   - **Region:** choose the one closest to you.
4. Click **Create new project** and wait a minute or two while it gets ready.

## 2. Set up the database

1. In the left sidebar, open **SQL Editor**.
2. Click **New query**.
3. Open the file `supabase/migrations/0001_foundation.sql` from this project, copy **everything** in it, and paste it into the editor.
4. Click **Run**. You should see *"Success. No rows returned."*
5. Click **New query** again. Paste the line below, replacing the email with **your own** (all lowercase), then click **Run**:

   ```sql
   insert into public.invites (email, role) values ('you@example.com', 'admin');
   ```

   This puts you on the invite list as the admin. The app refuses sign-in from anyone who isn't on this list.

## 3. Tell Supabase where the app lives

1. In the left sidebar, open **Authentication → URL Configuration**.
2. Set **Site URL** to: `http://localhost:3000`
3. Under **Redirect URLs**, click **Add URL** and add: `http://localhost:3000/**`
4. Click **Save**.

(Once the app goes online in Phase 8, we'll add its web address here too.)

## 4. Make sign-in links work on any device (recommended)

By default, a sign-in link only works in the same browser you requested it from. This change lets you request it on your laptop and open it on your phone, or the other way round.

1. Open **Authentication → Emails** (it may be called *Email Templates*).
2. Choose the **Magic Link** template.
3. In the message body, find the link (it contains `{{ .ConfirmationURL }}`) and replace that whole address with:

   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
   ```

4. Click **Save**.

## 5. Copy your keys into the app

1. In Supabase, open **Project Settings → API Keys** (or click the **Connect** button at the top).
2. You need two values:
   - **Project URL**, which looks like `https://abcdefgh.supabase.co`
   - **Publishable key**, which starts with `sb_publishable_` (older projects call it the **anon** key)

   ⚠️ **Do not** use the *secret* or *service_role* key here.
3. In this project folder, make a copy of `.env.example` and name the copy **`.env.local`**.
4. Open `.env.local` in a text editor (Notepad works) and paste in your values:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxx
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=false
   ```

5. Save the file. `.env.local` is private: it's never uploaded to GitHub.

## 6. Start the app and sign in

1. Open a terminal in this folder and run:

   ```bash
   npm run dev
   ```

2. Open **http://localhost:3000** in your browser.
3. Enter your email and click **Email me a sign-in link**.
4. Open the email and click the link. You'll land on your board. 🎉

---

## Good to know

- **Email limits:** Supabase's built-in email sender only delivers to members of your Supabase team (that's you) and only a few emails per hour. That's fine for now. Before you invite friends (Phase 7), we'll connect a free email service or turn on Google sign-in.
- **Sleeping project:** free Supabase projects pause after about a week without use. If the app suddenly can't sign you in, open your Supabase dashboard and click **Restore project**.

## Troubleshooting

| What you see | What to do |
|---|---|
| *"Almost there: the app needs connecting"* | `.env.local` is missing or misnamed (check it isn't `.env.local.txt`). Fix it, then stop the app (Ctrl + C) and run `npm run dev` again. |
| *"This email hasn't been invited yet"* | Check step 2.5: the email must match exactly, all lowercase. In Supabase, **Table Editor → invites** shows the list. |
| *"That sign-in link has expired"* | Links work once and expire after an hour. Request a new one. |
| *"Too many sign-in emails"* | Wait a few minutes. This is the built-in email limit. |
| The email never arrives | Check spam. Make sure you used the email address of your Supabase account. |

## Optional: Google sign-in

This needs a Google Cloud project with "OAuth" credentials, which is a fiddly 15–20 minutes. It's easiest to do together when we get to inviting friends. When it's done, you set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` and a **Continue with Google** button appears on the sign-in page.
