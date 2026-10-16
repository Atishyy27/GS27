import { NextResponse, type NextRequest } from "next/server";

export const GUEST_COOKIE = "gs27_guest";

// "Continue as guest": remembers the choice so the nav shows guest mode instead of pushing sign-in.
export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") ?? "/library";
  const safe = next.startsWith("/") && !next.startsWith("//") ? next : "/library";
  const res = NextResponse.redirect(new URL(safe, request.url), { status: 303 });
  res.cookies.set(GUEST_COOKIE, "1", { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
  return res;
}
