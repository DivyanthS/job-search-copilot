"use client"

import { KIT_SECTIONS, missingSections, type Kit, type KitGenerator, type KitSectionId, type KitUsage } from "@/lib/kit"

// Stand-in kit writer for the development preview: streams sample text so
// the Kit tab can be tried without using AI credit.
//   - "Marketing Analyst" (Litware): the company brief "fails", to try "Try again".

export const previewKits = new Map<string, Kit>()
export const previewUsage: KitUsage = { used: 3, limit: 30 }

const SAMPLE: Record<KitSectionId, (title: string, company: string) => string> = {
  cover_letter: (title, company) => `Dear Hiring Manager,

I'd love to bring my marketing experience to the ${title} role at ${company}. Your focus on clear, customer-led launches is exactly the kind of work I enjoy most.

At Brightside Media I planned and ran more than 40 social campaigns, growing our followers by 65%, and wrote a weekly newsletter for 12,000 subscribers with a 38% open rate. I worked closely with design and sales on every launch, so I'm used to turning a brief into a plan and seeing it through.

Before that, three years in customer service taught me to listen carefully and explain things simply, which shapes how I write for customers today.

I'd welcome the chance to talk about how I could help ${company} with its next launches.

Kind regards,
Alex Morgan`,
  resume_bullets: (_title, company) => `# Marketing Coordinator, Brightside Media
- Planned and ran 40+ multi-channel social campaigns, growing followers by 65%
- Wrote a weekly newsletter for 12,000 subscribers, achieving a 38% open rate
- Coordinated product launches across design and sales, keeping messaging consistent
- Turned campaign results into clear recommendations for the next launch

# Customer Service Advisor, Northgate Retail
- Resolved 60+ customer queries a day with a 96% satisfaction score
- Spotted recurring customer questions and fed them back to the product team

# Keywords to include
product launches, messaging, positioning, campaign planning, cross-functional, customer insight, analytics, newsletters, ${company}`,
  interview_questions: (title, company) => `# 1. Walk me through a launch you planned from start to finish.
Why they ask: launches are the core of the ${title} role.
How to answer: use a Brightside Media launch. Explain the goal, how you coordinated design and sales, and the result.

# 2. How do you decide what's working in a campaign?
Why they ask: they want someone who uses data, not guesswork.
How to answer: talk about the 38% newsletter open rate and how you used results to change the next send.

# 3. Tell me about a time you had to explain something complex simply.
Why they ask: clear writing matters for positioning and sales material.
How to answer: use a customer service example, then link it to how you write for customers now.

# 4. Tell me about a disagreement with a colleague and how you handled it.
Why they ask: launches need smooth teamwork.
How to answer: describe the situation, what you did to find common ground, and the outcome.

# 5. Why ${company}?
Why they ask: they want genuine interest.
How to answer: mention something specific from the job posting and the company brief.`,
  company_brief: (_title, company) => `# At a glance
${company} builds analytics software for mid-sized retailers. It's based in London and has around 400 employees.

# Products and customers
- Insights: dashboards that track sales and stock in real time
- Forecast: demand planning for seasonal ranges
Customers are mostly UK and European retailers.

# Recent news
- October 2026: launched an AI forecasting feature
- July 2026: opened an office in Amsterdam

# Culture and values
Small, product-focused teams; values clarity and customer conversations.

# How this role fits
They're launching more products each year and need someone to own messaging and launches.

# Smart questions to ask
- How do you decide which launches get the most support?
- How does marketing work with the product team day to day?
- What would success look like in the first six months?`,
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const makePreviewGenerator =
  (findJob: (id: string) => { title: string; company: string } | undefined): KitGenerator =>
  async (jobId, { retry }, onEvent) => {
    const job = findJob(jobId)
    if (!job) return onEvent({ type: "error", error: "That job no longer exists." })

    const existing = previewKits.get(jobId) ?? null
    const sections = retry ? missingSections(existing) : KIT_SECTIONS.map((s) => s.id)
    if (!retry && previewUsage.used >= previewUsage.limit) {
      return onEvent({ type: "error", error: `You've used all ${previewUsage.limit} kits for this month.` })
    }

    onEvent({ type: "start", sections })
    const failBrief = job.title === "Marketing Analyst" && !retry
    const results = await Promise.all(
      sections.map(async (section, i) => {
        await wait(300 + i * 250)
        if (section === "company_brief" && failBrief) {
          await wait(800)
          onEvent({ type: "section_error", section, error: "This part couldn't be written just now." })
          return [section, null] as const
        }
        const text = SAMPLE[section](job.title, job.company)
        for (const piece of text.match(/[\s\S]{1,24}/g) ?? []) {
          onEvent({ type: "delta", section, text: piece })
          await wait(18)
        }
        onEvent({ type: "section_done", section })
        return [section, text] as const
      })
    )

    const now = new Date().toISOString()
    const kit: Kit = existing
      ? { ...existing, updated_at: now }
      : { cover_letter: null, resume_bullets: null, interview_questions: null, company_brief: null, sources: [], model: "preview", generated_at: now, updated_at: now }
    for (const [section, text] of results) if (text) kit[section] = text
    if (results.some(([s, t]) => s === "company_brief" && t)) {
      kit.sources = [
        { url: "https://example.com/about", title: `About ${job.company}` },
        { url: "https://example.com/news", title: `${job.company} launches AI forecasting` },
      ]
    }
    if (!retry) {
      kit.generated_at = now
      previewUsage.used += 1
    }
    previewKits.set(jobId, kit)
    onEvent({ type: "done", kit: structuredClone(kit), usage: { ...previewUsage } })
  }
