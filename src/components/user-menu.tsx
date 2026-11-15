"use client"

import { useRef } from "react"
import Link from "next/link"
import { LogOut, Settings, ShieldCheck } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function UserMenu({
  name,
  email,
  initials,
  isAdmin,
}: {
  name: string
  email: string
  initials: string
  isAdmin: boolean
}) {
  const signOutForm = useRef<HTMLFormElement>(null)

  return (
    <>
      <form ref={signOutForm} action="/auth/signout" method="post" className="hidden" />
      <DropdownMenu>
        <DropdownMenuTrigger
          className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-label="Account menu"
        >
          <Avatar>
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-medium text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-start justify-between gap-2 py-1.5 font-normal">
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-foreground">{name}</span>
                <span className="block truncate text-xs text-muted-foreground">{email}</span>
              </span>
              {isAdmin && <Badge variant="secondary">Admin</Badge>}
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/settings" />}>
            <Settings /> Settings
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem render={<Link href="/admin" />}>
              <ShieldCheck /> Admin
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => signOutForm.current?.requestSubmit()}>
            <LogOut /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
