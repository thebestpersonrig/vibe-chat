import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

async function pbkdf2Hash(password: string, existingSalt?: Uint8Array): Promise<string> {
  const encoder = new TextEncoder();
  const salt = existingSalt ?? crypto.getRandomValues(new Uint8Array(16));
  const saltBuffer = new ArrayBuffer(salt.byteLength);
  new Uint8Array(saltBuffer).set(salt);
  const keyMaterial = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBuffer, iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return `pbkdf2:${bytesToHex(salt)}:${bytesToHex(new Uint8Array(bits))}`;
}

async function legacySha256(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "rpb-salt-2024");
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith("pbkdf2:")) {
    const salt = hexToBytes(storedHash.split(":")[1]);
    const computed = await pbkdf2Hash(password, salt);
    return computed === storedHash;
  }
  return (await legacySha256(password)) === storedHash;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, username, password } = body;

    if (!username || !password) {
      return Response.json({ error: "Missing credentials" }, { status: 400 });
    }

    if (action === "signup") {
      const { avatarColor } = body;
      if (!avatarColor) return Response.json({ error: "Missing avatar color" }, { status: 400 });

      const hashed = await pbkdf2Hash(password);
      const { error: insertErr } = await supabase
        .from("users")
        .insert({ username, avatar_color: avatarColor, password_hash: hashed });

      if (insertErr) {
        if (insertErr.code === "23505") {
          return Response.json({ error: "Username taken" }, { status: 409 });
        }
        return Response.json({ error: insertErr.message }, { status: 500 });
      }

      return Response.json({
        user: { username, avatarColor, avatarUrl: null, isAdmin: false },
      });
    }

    if (action === "login") {
      const { data: user } = await supabase
        .from("users")
        .select("username, avatar_color, avatar_url, is_admin, password_hash")
        .eq("username", username)
        .single();

      if (!user || !user.password_hash) {
        return Response.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const valid = await verifyPassword(password, user.password_hash);
      if (!valid) {
        return Response.json({ error: "Invalid credentials" }, { status: 401 });
      }

      // Transparently upgrade legacy SHA-256 hashes to PBKDF2
      if (!user.password_hash.startsWith("pbkdf2:")) {
        const upgraded = await pbkdf2Hash(password);
        await supabase.from("users").update({ password_hash: upgraded }).eq("username", username);
      }

      return Response.json({
        user: {
          username: user.username,
          avatarColor: user.avatar_color,
          avatarUrl: user.avatar_url,
          isAdmin: user.is_admin || false,
        },
      });
    }

    if (action === "change-password") {
      const { currentPassword, newPassword } = body;
      if (!currentPassword || !newPassword) {
        return Response.json({ error: "Missing current or new password" }, { status: 400 });
      }
      const { data: user } = await supabase
        .from("users")
        .select("password_hash")
        .eq("username", username)
        .single();
      if (!user || !user.password_hash) {
        return Response.json({ error: "User not found" }, { status: 404 });
      }
      const valid = await verifyPassword(currentPassword, user.password_hash);
      if (!valid) {
        return Response.json({ error: "Current password is wrong" }, { status: 401 });
      }
      const hashed = await pbkdf2Hash(newPassword);
      const { error } = await supabase.from("users").update({ password_hash: hashed }).eq("username", username);
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json({ success: true });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
