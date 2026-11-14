import { NextResponse, type NextRequest } from "next/server"
import { AI_MODELS, isAIConfigured } from "@/lib/ai/openrouter"
import { isIsoDate } from "@/lib/jobs"
import { KIT_COLUMNS, KIT_SECTIONS, missingSections, type Kit, type KitEvent, type KitSectionId } from "@/lib/kit"
import { writeKit, type SectionResult } from "@/lib/kit-writer"
import { getSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

// Writing a kit takes around 20–60 seconds.
export const maxDuration = 120

const fail = (error: string, status: number) => NextResponse.json({ error }, { status })

// Writes (or rewrites) the application kit for one job, streaming the text
// back as newline-separated JSON events (see KitEvent).
export async function POST(request: NextRequest, ctx: RouteContext<"/api/kits/[jobId]">) {
  const { jobId } = await ctx.params
  if (!getSupabaseEnv()) return fail("The app isn't connected to Supabase yet. See SETUP.md.", 503)
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getClaims()
  const userId = auth?.claims?.sub
  if (!userId) return fail("You've been signed out. Please refresh the page and sign in again.", 401)

  const body = (await request.json().catch(() => ({}))) as { retry?: unknown; today?: unknown }
  const retry = body.retry === true
  const today = typeof body.today === "string" && isIsoDate(body.today) ? body.today : new Date().toISOString().slice(0, 10)

  // Everything below is read with the person's own access, so they can only
  // ever reach their own job, resume and kit.
  const [{ data: job }, { data: resume }, { data: profile }, { data: existing }] = await Promise.all([
    supabase
      .from("jobs")
      .select("title, company, location, work_mode, salary, url, description")
      .eq("id", jobId)
      .maybeSingle(),
    supabase.from("resumes").select("content").eq("user_id", userId).maybeSingle(),
    supabase.from("profiles").select("full_name, monthly_kit_limit").eq("id", userId).maybeSingle(),
    supabase.from("kits").select(KIT_COLUMNS).eq("job_id", jobId).maybeSingle<Kit>(),
  ])

  if (!job) return fail("That job no longer exists.", 404)
  if (!resume?.content) return fail("Upload your resume in Settings first, so the kit can be tailored to you.", 400)
  if (!isAIConfigured()) return fail("The AI isn't set up yet. The app owner needs to add an OpenRouter key.", 503)

  const limit = profile?.monthly_kit_limit ?? 0
  const { data: usedData } = await supabase.rpc("kits_used_this_month")
  const used = typeof usedData === "number" ? usedData : 0

  let sections: KitSectionId[]
  if (retry) {
    // Retrying only fills in parts that failed last time; it doesn't count as a new kit.
    sections = missingSections(existing ?? null)
    if (!existing || sections.length === 0) return fail("There's nothing to retry. This kit is complete.", 400)
  } else {
    if (used >= limit) {
      return fail(
        limit === 0
          ? "Kit generation isn't switched on for your account yet. Ask the app owner."
          : `You've used all ${limit} kits for this month. Your allowance resets on the 1st.`,
        403
      )
    }
    sections = KIT_SECTIONS.map((s) => s.id)
  }

  const input = {
    job,
    resume: resume.content,
    candidateName: profile?.full_name ?? null,
    today: new Date(`${today}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: KitEvent) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"))
        } catch {
          // The browser went away; keep going so the kit is still saved.
        }
      }

      try {
        emit({ type: "start", sections })
        const results = await writeKit(
          sections,
          input,
          (section, text) => emit({ type: "delta", section, text }),
          (result) =>
            emit(
              result.ok
                ? { type: "section_done", section: result.section }
                : { type: "section_error", section: result.section, error: result.error }
            )
        )

        const succeeded = results.filter((r): r is Extract<SectionResult, { ok: true }> => r.ok)
        let kit: Kit | null = existing ?? null

        if (succeeded.length > 0) {
          // Sections that failed keep whatever they had before.
          const changes: Record<string, unknown> = { model: AI_MODELS.writer }
          for (const r of succeeded) changes[r.section] = r.text
          const brief = succeeded.find((r) => r.section === "company_brief")
          if (brief) changes.sources = brief.sources
          if (!retry) changes.generated_at = new Date().toISOString()

          const { data, error } = existing
            ? await supabase.from("kits").update(changes).eq("job_id", jobId).select(KIT_COLUMNS).single<Kit>()
            : await supabase
                .from("kits")
                .insert({ job_id: jobId, user_id: userId, ...changes })
                .select(KIT_COLUMNS)
                .single<Kit>()
          if (error || !data) throw new Error(`Saving kit failed: ${error?.message}`)
          kit = data
        }

        // Record usage. A brand-new kit counts towards the monthly allowance
        // only if at least one part was written.
        const counts = !retry && succeeded.length > 0
        const totals = results.reduce(
          (sum, r) => ({
            prompt: sum.prompt + r.usage.promptTokens,
            completion: sum.completion + r.usage.completionTokens,
            cost: sum.cost + (r.usage.cost ?? 0),
          }),
          { prompt: 0, completion: 0, cost: 0 }
        )
        if (counts || totals.prompt > 0) {
          const { error: usageError } = await supabase.from("kit_usage").insert({
            user_id: userId,
            job_id: jobId,
            kind: counts ? "kit" : "retry",
            model: AI_MODELS.writer,
            prompt_tokens: totals.prompt,
            completion_tokens: totals.completion,
            cost_usd: Math.round(totals.cost * 100000) / 100000,
          })
          if (usageError) console.error("kit usage:", usageError.message)
        }

        if (!kit) {
          emit({ type: "error", error: "The kit couldn't be written just now. Nothing was used from your allowance. Please try again in a minute." })
        } else {
          emit({ type: "done", kit, usage: { used: used + (counts ? 1 : 0), limit } })
        }
      } catch (err) {
        console.error("kit route:", (err as Error).message)
        emit({ type: "error", error: "Something went wrong while saving your kit. Please try again." })
      } finally {
        try {
          controller.close()
        } catch {
          // already closed
        }
      }
    },
  })

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  })
}
