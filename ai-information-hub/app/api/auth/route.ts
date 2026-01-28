import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || "REDACTED_PASSWORD";

export async function POST(req: Request) {
  const { password } = await req.json();

  if (password === ACCESS_PASSWORD) {
    const cookieStore = await cookies();
    cookieStore.set("auth", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid password" }, { status: 401 });
}
