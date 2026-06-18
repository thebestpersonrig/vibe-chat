function isAllowedUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const hostname = parsed.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]") return false;
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.)/.test(hostname)) return false;
    if (hostname.endsWith(".internal") || hostname.endsWith(".local")) return false;
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  if (!url) return Response.json({}, { status: 400 });
  if (!isAllowedUrl(url)) return Response.json({}, { status: 400 });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "bot" },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!isAllowedUrl(res.url)) return Response.json({}, { status: 400 });

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) return Response.json({});

    const html = await res.text();
    const get = (property: string) => {
      const match =
        html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, "i")) ||
        html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`, "i"));
      return match?.[1] || "";
    };

    return Response.json({
      title: get("og:title") || get("twitter:title") || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "",
      description: get("og:description") || get("twitter:description") || get("description"),
      image: get("og:image") || get("twitter:image"),
      siteName: get("og:site_name"),
    });
  } catch {
    return Response.json({});
  }
}
