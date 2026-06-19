export async function getBrowserFingerprint(): Promise<string> {
  const parts: string[] = [];

  parts.push(navigator.userAgent);
  parts.push(navigator.language);
  parts.push(`${screen.width}x${screen.height}x${screen.colorDepth}`);
  parts.push(String(navigator.hardwareConcurrency || 0));
  parts.push(Intl.DateTimeFormat().resolvedOptions().timeZone || "");

  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillStyle = "#f60";
      ctx.fillRect(50, 0, 100, 50);
      ctx.fillStyle = "#069";
      ctx.fillText("fp@vibe", 2, 15);
      ctx.fillStyle = "rgba(102,204,0,0.7)";
      ctx.fillText("fp@vibe", 4, 17);
      parts.push(canvas.toDataURL());
    }
  } catch {}

  const raw = parts.join("|");
  const encoded = new TextEncoder().encode(raw);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
