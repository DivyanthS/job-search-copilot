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
   - **Region:** choose the one closest to you (for India, **Southeast Asia (Singapore)**). Note which one you picked: Vercel should run in the same region later (section 9).
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

Supabase only lets you edit email templates once you send emails from your own account. If the template is locked, set up section 8, step 1, option A first, then come back here.

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

## 7. Connect the AI (OpenAI)

The AI reads job postings for you and writes your application kits. Without it the app still works, but you'll type job details in yourself.

1. Go to **https://platform.openai.com** and sign in (the same account as ChatGPT works, but API use is billed separately).
2. Open **Settings → Billing** and add some credit. **$10** is plenty to start: reading a job posting costs a small fraction of a cent.
3. Optional but wise: under **Settings → Limits**, set a monthly budget so the account can never spend more than you expect.
4. Open **API keys** and click **Create new secret key**. Name it `job-copilot` and copy the key (it starts with `sk-proj-`). It's only shown once. Keep it private: never send it in a chat or email.
5. Open `.env.local` and paste it in:

   ```
   OPENAI_API_KEY=sk-proj-xxxxxxxx
   ```

   ⚠️ Never put `NEXT_PUBLIC_` in front of this one. That would expose the key to anyone using the app.
6. Stop the app (Ctrl + C) and start it again with `npm run dev`.

The app uses **GPT-6 Luna** to read postings and **GPT-6.2 Sol** to write kits. To use different models, add `OPENAI_MODEL_FAST` or `OPENAI_MODEL_WRITER` with the model's name.

**Prefer OpenRouter?** The app also works with an OpenRouter key (it starts with `sk-or-`) in `OPENROUTER_API_KEY` instead, which uses Claude models. If both keys are set, OpenAI is used.

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

If the password is wrong, sign-in shows *"We couldn't send the sign-in email just now"*. Create a new app password and paste it again; a space or missing character is enough to break it.

**Option B: let friends sign in with Google instead (no emails needed)**

1. Go to **console.cloud.google.com** and create a project called `Job Copilot`.
2. Open **Google Auth Platform** (search for it at the top) and click **Get started**. Fill in the app name and your email, choose **External**, and finish.
3. Open **Audience**. Leave the app in **Testing** and, under **Test users**, click **Add users** and add your own Google email. Only test users can sign in (up to 100), which keeps the app private.
4. Open **Clients → Create client** and choose **Web application**.
5. In Supabase, open **Authentication → Sign In / Providers → Google**, and copy the **Callback URL** it shows (it ends in `/auth/v1/callback`).
6. Back in Google, paste that address under **Authorised redirect URIs** and click **Create**. Copy the **Client ID** (it ends in `.apps.googleusercontent.com`) and the **Client secret** (it starts with `GOCSPX-`).
7. In Supabase's Google settings, switch Google **on**, paste the Client ID and Client secret, and click **Save**. Check it now says **Enabled**.
8. In `.env.local`, change the last line to `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` and restart the app. If the app is already online, set the same value in Vercel and **Redeploy** (section 9). A **Continue with Google** button appears on the sign-in page.

The first time someone signs in, Google shows *"Google hasn't verified this app"*. That's expected for an app in Testing: click **Continue**. New Google keys can take a few minutes to start working.

### Step 2: invite them

1. In the app, open **Admin** (only you can see it).
2. Type your friend's email and click **Add invite**. If they'll use Google sign-in, use their Google email, **and** add that same email as a test user in Google (**Google Auth Platform → Audience → Add users**).
3. Click **Copy message** and send it to them by email or chat. It tells them where to go and which email to use.

From the Admin page you can also see how many kits each person has used this month, what they've cost, and change anyone's **monthly kit limit**. Set it to 0 to switch kits off for someone.

**To remove someone completely:** in Supabase, open **Authentication → Users**, find them, and choose **Delete user**. Their board and kits are deleted too.

## 9. Put the app online

This gives the app a web address you can open on any device. It uses **GitHub** (stores the code) and **Vercel** (runs the website). Both are free for personal use.

### Step 1: put the code on GitHub

1. Sign up at **https://github.com** (free).
2. Click **+** (top right) → **New repository**. Name it `job-copilot`, choose **Private**, leave everything else as it is, and click **Create repository**.
3. Copy the address it shows, which looks like `https://github.com/your-name/job-copilot.git`.
4. Upload the code. Claude can do this for you if you share that address. To do it yourself, open a terminal in this folder and run these one at a time:

   ```bash
   git checkout master
   ```

   ```bash
   git merge phase-1-foundation
   ```

   ```bash
   git remote add origin https://github.com/your-name/job-copilot.git
   ```

   ```bash
   git push -u origin master
   ```

   The first time, a window opens asking you to sign in to GitHub.

### Step 2: put it on Vercel

1. Go to **https://vercel.com**, click **Sign Up**, choose **Hobby**, and **Continue with GitHub**.
2. Click **Add New… → Project**, find `job-copilot` and click **Import**.
3. Open **Environment Variables** and add these, copying each value from your `.env.local` file:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | your Supabase publishable key |
   | `OPENAI_API_KEY` | your OpenAI key |
   | `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | `true` or `false` (as in `.env.local`) |

4. Click **Deploy** and wait about two minutes. Vercel then shows your app's address, something like `https://job-copilot-abc.vercel.app`.
5. Add one more variable: open the project's **Settings → Environment Variables**, add `NEXT_PUBLIC_SITE_URL` with your app's address (no `/` at the end), and save.
6. Open **Settings → Functions → Function Regions**, untick the default region, tick the one matching your Supabase region (for Singapore, `sin1`), and save. This keeps the app quick.
7. Open **Deployments**, click **⋯** next to the newest one, and choose **Redeploy**. Settings that start with `NEXT_PUBLIC_` only take effect after a redeploy. Vercel may email you a code to confirm it's you; the redeploy waits until you enter it.

### Step 3: tell Supabase the new address

1. In Supabase, open **Authentication → URL Configuration**.
2. Change **Site URL** to your app's address, for example `https://job-copilot-abc.vercel.app`. Sign-in emails link here.
3. Under **Redirect URLs**, add your address followed by `/**`, for example `https://job-copilot-abc.vercel.app/**`. Keep the `localhost` one so the app still works on your computer.
4. Click **Save**.

If you set up Google sign-in, there's nothing to change on Google's side.

### Step 4: check everything works

Open your app's address and work through this list. Do the first few on your phone too.

- [ ] Sign in with an email link (and Google, if you set it up)
- [ ] Add a job from a link, and another from pasted text
- [ ] Drag a card to another column, open it, set a follow-up reminder and write a note
- [ ] In **Settings**, upload your resume and check the text
- [ ] Generate a kit and download the cover letter as Word and as PDF
- [ ] In **Admin**, check your own usage shows up
- [ ] On your phone, use the browser's **Share → Add to Home Screen** (iPhone) or **⋮ → Add to Home screen** (Android). The app then opens full-screen from its own icon.

### Updating the app later

Whenever new code is pushed to GitHub, Vercel puts it online by itself in about two minutes. If an update comes with a new file in `supabase/migrations/`, run it in Supabase **before** pushing (see "When the app gets a new database update").

---

## When the app gets a new database update

New phases sometimes add a file to `supabase/migrations/`. Run just the **new** file(s) in the SQL Editor (same steps as section 2). If you see *"already exists"*, that file has already been run, so skip it.

## Try the board without signing in

While the app is running on your computer (`npm run dev`), open **http://localhost:3000/dev/board** to play with a preview board full of sample jobs. Nothing there is saved, and this page doesn't exist on the live site.

## Good to know

- **Email limits:** Supabase's built-in email sender only delivers to members of your Supabase team (that's you) and only a few emails per hour. Before inviting friends, set up section 8, step 1.
- **Sleeping project:** free Supabase projects pause after about a week without use. If the app suddenly can't sign you in, open your Supabase dashboard and click **Restore project**.
- **Application kits** are written by GPT-6.2 Sol through your OpenAI key. A full kit usually costs about 10–25 cents, including the web search for the company brief. The costs on the **Admin** page are estimates; OpenAI's **Usage** page shows exactly what you've spent.
- **Monthly kit limit:** everyone, including you, starts with 30 kits a month. Change anyone's limit (including your own) on the **Admin** page. If part of a kit fails, **Try again** fills in the missing part without using another kit.

## Troubleshooting

| What you see | What to do |
|---|---|
| *"Almost there: the app needs connecting"* | `.env.local` is missing or misnamed (check it isn't `.env.local.txt`). Fix it, then stop the app (Ctrl + C) and run `npm run dev` again. |
| *"This email hasn't been invited yet"* | Check step 2.6: the email must match exactly, all lowercase. In Supabase, **Table Editor → invites** shows the list. |
| *"That sign-in link has expired"* | Links work once and expire after an hour. Request a new one. |
| *"Too many sign-in emails"* | Wait a few minutes. This is the built-in email limit. |
| The email never arrives | Check spam. Make sure you used the email address of your Supabase account. |
| *"The AI isn't set up yet"* when adding a job | `OPENAI_API_KEY` is missing (from `.env.local`, or from Vercel online), or the app wasn't restarted or redeployed after adding it. |
| *"The AI couldn't read the posting just now"* | Check you have credit left on OpenAI (**Settings → Billing**) and haven't hit your monthly budget. **Vercel → Logs** shows the exact error. |
| *"Upload your resume in Settings first"* | Open **Settings** and upload your resume (or paste it as text). Kits are tailored from it. |
| *"You've used all 30 kits for this month"* | The allowance resets on the 1st. To raise it, open **Admin** and click the person's kit count. |
| A friend's sign-in email never arrives | Supabase can only email you until you set up section 8, step 1. Also ask them to check spam. |
| A friend sees *"This email hasn't been invited yet"* | They must sign in with exactly the email you invited (for Google sign-in, their Google email). Check the list on the **Admin** page. |
| *"We couldn't send the sign-in email just now"* | Supabase couldn't send the email. If you use Gmail (section 8, option A), the app password is probably wrong: create a new one and paste it again. **Vercel → Logs** shows the exact error. |
| Google says *"Access blocked"* or the sign-in stops with an error | The person isn't a Google test user yet. Add their Google email under **Google Auth Platform → Audience → Test users**. |
| *"Something went wrong while signing you in"* | Try again. If it keeps happening, open **Vercel → Logs** and look for a line starting *"Sign-in error"*. It says what went wrong. |
| Online, the sign-in email link opens `localhost` | Supabase's **Site URL** still points at your computer. See section 9, step 3. |
| Online, the app says *"needs connecting"* or *"isn't connected to Supabase yet"* | The environment variables are missing in Vercel. Add them (section 9, step 2) and **Redeploy**. |
| I changed a setting in Vercel but nothing changed | Settings only take effect after a **Redeploy** (Deployments → ⋯ → Redeploy). |
| Online, kits stop after about a minute | In Vercel, open **Settings → Functions** and make sure **Fluid Compute** is on (it is for new projects). |
| There's no **Admin** link | Only admins see it. Your account is made admin in section 2, step 6. |
| A kit part says *"couldn't be written"* | Click **Try again**. It's free. If it keeps failing, check your OpenAI credit. |

