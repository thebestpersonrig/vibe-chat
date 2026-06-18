export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  if (!url) return Response.json({}, { status: 400 });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "bot" },
    });
    clearTimeout(timeout);

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
