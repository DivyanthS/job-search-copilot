import type { Metadata } from "next"
import { ProfileCard } from "@/components/settings/profile-card"
import { ResumeCard } from "@/components/settings/resume-card"
import { requireProfile } from "@/lib/profile"
import { RESUME_COLUMNS, type Resume } from "@/lib/resume"
import { createClient } from "@/lib/supabase/server"
import { deleteResume, getResumeDownloadUrl, saveResumeText, updateName, uploadResume } from "./actions"

export const metadata: Metadata = { title: "Settings" }

export default async function SettingsPage() {
  const profile = await requireProfile()
  const supabase = await createClient()
  const { data: resume } = await supabase
    .from("resumes")
    .select(RESUME_COLUMNS)
    .eq("user_id", profile.id)
    .maybeSingle<Resume>()

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Your details and the resume used for your application kits.</p>
      </div>
      <ProfileCard name={profile.full_name} email={profile.email} actions={{ updateName }} />
      <ResumeCard
        initial={resume ?? null}
        actions={{ uploadResume, saveResumeText, deleteResume, getResumeDownloadUrl, updateName }}
      />
    </div>
  )
}
