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

## 8. Invite friends (optional)

### Step 1: let Supabase email your friends

Supabase's built-in email sender only delivers to **you**. Before friends can get sign-in links, choose **one** of these:

**Option A: send sign-in emails from your Gmail (easiest)**

1. Your Google account needs **2-Step Verification** switched on: **myaccount.google.com → Security**.
2. Go to **myaccount.google.com/apppasswords**, create an app password named `Job Copilot`, and copy the 16-character password. Keep it private, like any password.
3. In Supabase, open **Authentication → Emails → SMTP Settings** and switch on **custom SMTP**:
   - **Sender email:** your Gmail address · **Sender name:** `Job Copilot`
   - **Host:** `smtp.gmail.com` · **Port:** `465`
   - **Username:** your Gmail address · **Password:** the app password from step 2
4. Click **Save**. Sign-in emails now come from your Gmail (Gmail allows about 500 a day).

**Option B: let friends sign in with Google instead (no emails needed)**

1. Go to **console.cloud.google.com** and create a project called `Job Copilot`.
2. Open **APIs & Services → OAuth consent screen**. Choose **External**, fill in the app name and your email, save, then click **Publish app**. Basic Google sign-in doesn't need a review.
3. Open **Credentials → Create credentials → OAuth client ID → Web application**.
4. In Supabase, open **Authentication → Sign In / Providers → Google**, and copy the **Callback URL** it shows.
5. Back in Google, paste that address under **Authorised redirect URIs** and click **Create**. Copy the **Client ID** and **Client secret** it gives you.
6. In Supabase's Google settings, switch Google **on**, paste the Client ID and Client secret, and save.
7. In `.env.local`, change the last line to `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` and restart the app. A **Continue with Google** button appears on the sign-in page.

### Step 2: invite them

1. In the app, open **Admin** (only you can see it).
2. Type your friend's email and click **Add invite**. If they'll use Google sign-in, use their Google email.
3. Click **Copy message** and send it to them by email or chat. It tells them where to go and which email to use.

From the Admin page you can also see how many kits each person has used this month, what they've cost, and change anyone's **monthly kit limit**. Set it to 0 to switch kits off for someone.

**To remove someone completely:** in Supabase, open **Authentication → Users**, find them, and choose **Delete user**. Their board and kits are deleted too.

---

## When the app gets a new database update

New phases sometimes add a file to `supabase/migrations/`. Run just the **new** file(s) in the SQL Editor (same steps as section 2). If you see *"already exists"*, that file has already been run, so skip it.

## Try the board without signing in

While the app is running on your computer (`npm run dev`), open **http://localhost:3000/dev/board** to play with a preview board full of sample jobs. Nothing there is saved, and this page doesn't exist on the live site.

## Good to know

- **Email limits:** Supabase's built-in email sender only delivers to members of your Supabase team (that's you) and only a few emails per hour. Before inviting friends, set up section 8, step 1.
- **Sleeping project:** free Supabase projects pause after about a week without use. If the app suddenly can't sign you in, open your Supabase dashboard and click **Restore project**.
- **Application kits** are written by Claude Sonnet through your OpenRouter key. A full kit usually costs about 5–15 cents, including the web search for the company brief. You can see exactly what you've spent on OpenRouter's **Activity** page.
- **Monthly kit limit:** everyone, including you, starts with 30 kits a month. Change anyone's limit (including your own) on the **Admin** page. If part of a kit fails, **Try again** fills in the missing part without using another kit.

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
| *"You've used all 30 kits for this month"* | The allowance resets on the 1st. To raise it, open **Admin** and click the person's kit count. |
| A friend's sign-in email never arrives | Supabase can only email you until you set up section 8, step 1. Also ask them to check spam. |
| A friend sees *"This email hasn't been invited yet"* | They must sign in with exactly the email you invited (for Google sign-in, their Google email). Check the list on the **Admin** page. |
| There's no **Admin** link | Only admins see it. Your account is made admin in section 2, step 6. |
| A kit part says *"couldn't be written"* | Click **Try again**. It's free. If it keeps failing, check your OpenRouter credit. |

