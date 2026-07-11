# Going live — a click-by-click guide (no coding needed)

This puts Joink on the public internet with a real web address, for free, using
**Vercel** (the easiest host for this kind of app) plus the **Supabase** database
you already created. Budget ~15 minutes. You only need a web browser.

> You'll copy a few keys between two websites. Keep the **secret** ones private —
> never paste them into emails, chats, or screenshots.

---

## What you'll end up with
- A public URL like `https://joink-yourname.vercel.app`
- Real sign-up / sign-in that **remembers accounts** (no more demo resets)
- Automatic re-deploys whenever the code updates

---

## Part A — Finish the database (Supabase)

1. Go to **https://supabase.com/dashboard** and open your project.
2. Left sidebar → **SQL Editor** → **New query**.
3. Open the file **`supabase/setup.sql`** from this repository on GitHub, click the
   **Copy raw contents** button, paste it into the editor, and press **Run**.
   You should see "Success". *(This creates all the tables.)*
4. Left sidebar → **Authentication** → **Providers** (or **Sign In / Providers**) →
   **Email** → turn **OFF** "Confirm email" → **Save**.
   *(So new users can log in immediately without a confirmation email.)*
5. Left sidebar → **Project Settings** (gear) → **API**. Keep this tab open — you'll
   copy three values in Part B:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **`anon` `public`** key
   - **`service_role` `secret`** key ← the private one

---

## Part B — Put it online (Vercel)

1. Go to **https://vercel.com** and click **Sign Up** → **Continue with GitHub**
   (use the same GitHub account that owns the JOINK repo). Approve access.
2. Click **Add New…** → **Project**.
3. Find **JOINK** in the list and click **Import**.
4. Vercel auto-detects everything — **do not change** the build settings.
5. **Environment variables — two easy options:**

   **Option 1 (recommended): the Vercel–Supabase integration.** In Vercel's
   marketplace add the **Supabase** integration and connect it to your project.
   It auto-installs all the keys for you. Joink now understands the names the
   integration uses (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   `SUPABASE_SECRET_KEY`, etc.) — nothing to copy by hand.

   **Option 2: add them manually.** Expand **Environment Variables** and add these
   three, copying the values from your Supabase **API** tab (Part A, step 5):

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase **Project URL** |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your **anon / publishable** key |
   | `SUPABASE_SERVICE_ROLE_KEY` | your **service_role / secret** key |

6. Click **Deploy** and wait ~2 minutes for it to finish. Vercel shows a
   **"Congratulations"** screen with a **Visit** button — that's your live site. 🎉

---

## Part C — Two-minute finishing touches

1. **Tell the app its own address.** In Vercel → your project → **Settings** →
   **Environment Variables**, add one more:
   - Name: `APP_BASE_URL`  ·  Value: your live URL (e.g. `https://joink-yourname.vercel.app`)
   Then go to the **Deployments** tab → the top deployment → **⋯** menu → **Redeploy**.
2. **Check it's wired correctly.** Open `https://<your-live-url>/api/health` in your
   browser. You want to see `"migrationsApplied": true` and `"mode": "supabase"`.
   If it says tables are missing, re-do Part A step 3.
3. **Create your account.** On the live site click **Sign up**, register with your
   email — this time it sticks. The purple "Demo mode" banner should be **gone**.

You're live.

---

## Optional add-ons (do these anytime, later)

Add these the same way as the env vars in Part B, then redeploy:

- **Smarter AI chat answers** — `AI_API_KEY` (from any OpenAI-compatible provider),
  plus optionally `AI_BASE_URL` and `AI_MODEL`. Without it, chat still works using
  saved excerpts and the built-in support assistant.
- **Real payments (Razorpay Test Mode)** — `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
  `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `RAZORPAY_WEBHOOK_SECRET`, `RAZORPAY_PRO_PLAN_ID`.
  See the "Razorpay Test Mode" section in `README.md`. Point the webhook at
  `https://<your-live-url>/api/webhooks/razorpay`.

---

## If something looks wrong
Open `https://<your-live-url>/api/health` and read the `detail` message — it usually
says exactly what's missing (e.g. "tables are missing → run supabase/setup.sql").
Common fixes:
- Blank page / build failed → in Vercel open the deployment's **Logs** tab.
- Still shows "Demo mode" → an env var name is misspelled or you didn't redeploy
  after adding them. Names are case-sensitive.
- "Incorrect email or password" right after deploy → you haven't created an account
  on the live site yet (old demo accounts don't carry over). Click **Sign up**.
