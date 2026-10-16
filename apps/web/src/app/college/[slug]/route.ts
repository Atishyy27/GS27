import { NextResponse, type NextRequest } from "next/server";
import { COLLEGE_COOKIE, listColleges } from "@/lib/college";

// GET /college/<slug>?next=/feed : remember which college the visitor is browsing, then go back.
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const next = request.nextUrl.searchParams.get("next") ?? "/";
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const response = NextResponse.redirect(new URL(safeNext, request.url), { status: 303 });
  const known = (await listColleges()).some((c) => c.slug === slug);
  if (known) {
    response.cookies.set(COLLEGE_COOKIE, slug, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  return response;
}
