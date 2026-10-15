import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase session cookie on every request. No redirects here: pages decide.
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_KEY;
  // college subdomain: <slug>.<root domain> -> x-gs27-college header (root set in GS27_ROOT_DOMAIN)
  const root = process.env.GS27_ROOT_DOMAIN;
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  if (root && host.endsWith("." + root)) {
    const sub = host.slice(0, -(root.length + 1));
    if (/^[a-z0-9-]{2,30}$/.test(sub) && sub !== "www") request.headers.set("x-gs27-college", sub);
  } else {
    request.headers.delete("x-gs27-college");
  }
  let response = NextResponse.next({ request });
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|campus.geojson|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
