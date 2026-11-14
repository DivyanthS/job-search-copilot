import "server-only"

import dns from "node:dns"
import net from "node:net"
import { Agent, fetch } from "undici"

// Fetches a web page that a person pasted in, safely:
// - only http/https on the normal ports
// - never connects to private or internal network addresses (checked on
//   every connection, including after redirects), so a pasted link can't be
//   used to reach the server's own internal services
// - gives up after 10 seconds or 3 MB

const TIMEOUT_MS = 10_000
const MAX_BYTES = 3 * 1024 * 1024
const MAX_REDIRECTS = 5
const USER_AGENT = "Mozilla/5.0 (compatible; JobCopilot/1.0; personal job tracker)"

const blocked = new net.BlockList()
for (const [addr, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 3], // multicast and reserved (224.0.0.0 – 255.255.255.255)
] as const) {
  blocked.addSubnet(addr, prefix, "ipv4")
}
for (const [addr, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blocked.addSubnet(addr, prefix, "ipv6")
}

export function isBlockedAddress(ip: string): boolean {
  const family = net.isIP(ip)
  if (family === 4) return blocked.check(ip, "ipv4")
  if (family === 6) {
    const mapped = ip.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return blocked.check(mapped[1], "ipv4")
    return blocked.check(ip, "ipv6")
  }
  return true
}

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | dns.LookupAddress[], family?: number) => void

// DNS lookup that refuses private addresses. Used for every connection the
// fetcher makes, so DNS tricks and redirects can't sneak past the check.
function safeLookup(hostname: string, options: dns.LookupOptions, callback: LookupCallback) {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, [])
    const list = addresses as dns.LookupAddress[]
    if (list.length === 0 || list.some((a) => isBlockedAddress(a.address))) {
      const error: NodeJS.ErrnoException = new Error(`Refusing to connect to ${hostname}`)
      error.code = "EBLOCKED"
      return callback(error, [])
    }
    if (options.all) return callback(null, list)
    callback(null, list[0].address, list[0].family)
  })
}

const agent = new Agent({
  connect: { lookup: safeLookup as unknown as net.LookupFunction, timeout: TIMEOUT_MS },
  headersTimeout: TIMEOUT_MS,
  bodyTimeout: TIMEOUT_MS,
})

export type FetchedPage = { url: string; html: string; contentType: string }

export class PageFetchError extends Error {
  constructor(
    public kind: "invalid" | "blocked" | "unreachable" | "not_html" | "too_large",
    message: string,
    public status?: number
  ) {
    super(message)
  }
}

function checkUrl(raw: string): URL {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new PageFetchError("invalid", "Not a valid web address")
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new PageFetchError("invalid", "Only http and https links are supported")
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new PageFetchError("invalid", "Links on unusual ports aren't supported")
  }
  if (url.username || url.password) {
    throw new PageFetchError("invalid", "Links with a username or password aren't supported")
  }
  // An IP address written straight into the link skips DNS, so check it here.
  const host = url.hostname.replace(/^\[|\]$/g, "")
  if (net.isIP(host) && isBlockedAddress(host)) {
    throw new PageFetchError("invalid", "That address isn't allowed")
  }
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new PageFetchError("invalid", "That address isn't allowed")
  }
  return url
}

export async function fetchPage(rawUrl: string): Promise<FetchedPage> {
  let url = checkUrl(rawUrl)
  const signal = AbortSignal.timeout(TIMEOUT_MS)

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let response
    try {
      response = await fetch(url, {
        dispatcher: agent,
        redirect: "manual",
        signal,
        headers: {
          "user-agent": USER_AGENT,
          accept: "text/html,application/xhtml+xml;q=0.9,text/plain;q=0.8,*/*;q=0.5",
          "accept-language": "en;q=0.9",
        },
      })
    } catch (err) {
      const cause = (err as { cause?: { code?: string; message?: string } })?.cause
      if (cause?.code === "EBLOCKED") throw new PageFetchError("invalid", "That address isn't allowed")
      console.error(`fetchPage ${url.hostname}:`, cause?.code ?? cause?.message ?? (err as Error).message)
      throw new PageFetchError("unreachable", "Couldn't reach that website")
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      await response.body?.cancel()
      if (!location) throw new PageFetchError("unreachable", "The website sent a broken redirect")
      url = checkUrl(new URL(location, url).toString())
      continue
    }

    if (!response.ok) {
      await response.body?.cancel()
      // 401/403/429/999 etc. usually mean the site blocks automated reading.
      throw new PageFetchError("blocked", `The website refused (status ${response.status})`, response.status)
    }

    const contentType = response.headers.get("content-type") ?? ""
    if (!/text\/html|application\/xhtml|text\/plain/i.test(contentType)) {
      await response.body?.cancel()
      throw new PageFetchError("not_html", "That link isn't a web page")
    }

    const declared = Number(response.headers.get("content-length") ?? 0)
    if (declared > MAX_BYTES) {
      await response.body?.cancel()
      throw new PageFetchError("too_large", "That page is too large")
    }

    // Read the body, stopping if it grows past the size limit.
    const chunks: Uint8Array[] = []
    let size = 0
    if (response.body) {
      for await (const chunk of response.body) {
        size += chunk.byteLength
        if (size > MAX_BYTES) throw new PageFetchError("too_large", "That page is too large")
        chunks.push(chunk)
      }
    }
    const charset = contentType.match(/charset=([^;]+)/i)?.[1]?.trim() ?? "utf-8"
    let html: string
    try {
      html = new TextDecoder(charset).decode(Buffer.concat(chunks))
    } catch {
      html = new TextDecoder("utf-8").decode(Buffer.concat(chunks))
    }
    return { url: url.toString(), html, contentType }
  }

  throw new PageFetchError("unreachable", "Too many redirects")
}
