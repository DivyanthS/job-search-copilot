// The five fixed pipeline columns, in order.
export const COLUMNS = [
  { id: "wishlist", label: "Wishlist", dot: "bg-slate-400" },
  { id: "applied", label: "Applied", dot: "bg-sky-500" },
  { id: "interviewing", label: "Interviewing", dot: "bg-amber-500" },
  { id: "offer", label: "Offer", dot: "bg-emerald-500" },
  { id: "rejected", label: "Rejected", dot: "bg-rose-500" },
] as const

export type ColumnId = (typeof COLUMNS)[number]["id"]
