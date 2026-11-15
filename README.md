# Job Copilot

A private job-application tracker: a drag-and-drop pipeline board (Wishlist → Applied → Interviewing → Offer → Rejected)
with an AI "kit" for each job (cover letter, tailored resume bullets, interview questions, company brief).

**First time?** Follow [SETUP.md](SETUP.md).

## Tech

- Next.js 16 (App Router, TypeScript), Tailwind CSS 4, shadcn/ui (Base UI)
- Supabase: Postgres, Auth (email link / Google), Row Level Security, Storage
- OpenRouter (Claude Sonnet) for AI features
- Hosting: Vercel

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Database

SQL migrations live in `supabase/migrations/`. Run them in order in the Supabase SQL Editor.

## Build progress

- [x] Phase 1: Foundation (invite-only sign-in, layout, light/dark mode)
- [x] Phase 2: Board with drag and drop
- [x] Phase 3: Add a job from a link or text
- [x] Phase 4: Card details and reminders
- [x] Phase 5: Resume upload
- [x] Phase 6: Generate kit, editing, Word/PDF export
- [x] Phase 7: Admin (invites, monthly limits, usage)
- [ ] Phase 8: Go live
