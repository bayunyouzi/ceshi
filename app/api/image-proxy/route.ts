import { NextResponse } from "next/server";

const isBlockedHostname = (hostname: string) => {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized === "localhost" || normalized === "0.0.0.0" || normalized === "::1") return true;
  if (normalized.endsWith(".local")) return true;
  if (/^127\./.test(normalized)) return true;
  if (/^10\./.test(normalized)) return true;
  if (/^192\.168\./.test(normalized)) return true;
  if (/^169\.254\./.test(normalized)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)) return true;
  return false;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing image url" }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (_e) {
    return NextResponse.json({ error: "Invalid image url" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol) || isBlockedHostname(parsedUrl.hostname)) {
    return NextResponse.json({ error: "Blocked image url" }, { status: 400 });
  }

  try {
    const upstream = await fetch(parsedUrl.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        "Referer": parsedUrl.origin
      },
      cache: "no-store"
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: "Upstream image fetch failed" }, { status: upstream.status || 502 });
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    if (!contentType.toLowerCase().startsWith("image/")) {
      return NextResponse.json({ error: "Upstream response is not an image" }, { status: 415 });
    }

    const data = await upstream.arrayBuffer();
    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=600, stale-while-revalidate=3600"
      }
    });
  } catch (_e) {
    return NextResponse.json({ error: "Image proxy failed" }, { status: 502 });
  }
}
