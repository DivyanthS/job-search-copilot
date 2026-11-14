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

The folder `supabase/migrations/` holds one file per database update, numbered in order
(`0001_foundation.sql`, `0002_jobs.sql`, …). Run **each one once, in number order**:

1. In the left sidebar, open **SQL Editor**.
2. Click **New query**.
3. Open the next file from `supabase/migrations/`, copy **everything** in it, and paste it into the editor.
4. Click **Run**. You should see *"Success. No rows returned."*
5. Repeat steps 2–4 for each remaining file.
6. Click **New query** again. Paste the line below, replacing the email with **your own** (all lowercase), then click **Run**:

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

## 7. Connect the AI (OpenRouter)

The AI reads job postings for you, and later writes your application kits. Without it the app still works, but you'll type job details in yourself.

1. Go to **https://openrouter.ai** and sign up.
2. Open **Credits** and add some credit. **$10** is plenty to start: reading a job posting costs a small fraction of a cent.
3. Open **Keys** and click **Create Key**.
   - **Name:** `job-copilot`
   - **Credit limit:** set one (for example `$10`) as a safety cap, so the key can never spend more than that.
4. Copy the key (it starts with `sk-or-`). It's only shown once.
5. Open `.env.local` and paste it in:

   ```
   OPENROUTER_API_KEY=sk-or-xxxxxxxx
   ```

   ⚠️ Never put `NEXT_PUBLIC_` in front of this one. That would expose the key to anyone using the app.
6. Stop the app (Ctrl + C) and start it again with `npm run dev`.

To check it works, click **Add job**, choose **Paste text**, and paste any job description.

---

## When the app gets a new database update

New phases sometimes add a file to `supabase/migrations/`. Run just the **new** file(s) in the SQL Editor (same steps as section 2). If you see *"already exists"*, that file has already been run, so skip it.

## Try the board without signing in

While the app is running on your computer (`npm run dev`), open **http://localhost:3000/dev/board** to play with a preview board full of sample jobs. Nothing there is saved, and this page doesn't exist on the live site.

## Good to know

- **Email limits:** Supabase's built-in email sender only delivers to members of your Supabase team (that's you) and only a few emails per hour. That's fine for now. Before you invite friends (Phase 7), we'll connect a free email service or turn on Google sign-in.
- **Sleeping project:** free Supabase projects pause after about a week without use. If the app suddenly can't sign you in, open your Supabase dashboard and click **Restore project**.
- **Application kits** are written by Claude Sonnet through your OpenRouter key. A full kit usually costs about 5–15 cents, including the web search for the company brief. You can see exactly what you've spent on OpenRouter's **Activity** page.
- **Monthly kit limit:** everyone, including you, starts with 30 kits a month. Until the admin page arrives (Phase 7), you can change someone's limit in Supabase: **Table Editor → profiles → monthly_kit_limit**. If part of a kit fails, **Try again** fills in the missing part without using another kit.

## Troubleshooting

| What you see | What to do |
|---|---|
| *"Almost there: the app needs connecting"* | `.env.local` is missing or misnamed (check it isn't `.env.local.txt`). Fix it, then stop the app (Ctrl + C) and run `npm run dev` again. |
| *"This email hasn't been invited yet"* | Check step 2.6: the email must match exactly, all lowercase. In Supabase, **Table Editor → invites** shows the list. |
| *"That sign-in link has expired"* | Links work once and expire after an hour. Request a new one. |
| *"Too many sign-in emails"* | Wait a few minutes. This is the built-in email limit. |
| The email never arrives | Check spam. Make sure you used the email address of your Supabase account. |
| *"The AI isn't set up yet"* when adding a job | `OPENROUTER_API_KEY` is missing from `.env.local`, or the app wasn't restarted after adding it. |
| *"The AI couldn't read the posting just now"* | Check you have credit left on OpenRouter (and the key's credit limit isn't used up). |
| *"Upload your resume in Settings first"* | Open **Settings** and upload your resume (or paste it as text). Kits are tailored from it. |
| *"You've used all 30 kits for this month"* | The allowance resets on the 1st. To raise it, change `monthly_kit_limit` in Supabase (see "Good to know" above). |
| A kit part says *"couldn't be written"* | Click **Try again**. It's free. If it keeps failing, check your OpenRouter credit. |

## Optional: Google sign-in

This needs a Google Cloud project with "OAuth" credentials, which is a fiddly 15–20 minutes. It's easiest to do together when we get to inviting friends. When it's done, you set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` and a **Continue with Google** button appears on the sign-in page.
