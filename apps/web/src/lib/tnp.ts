import { cookies } from "next/headers";
import { notFound } from "next/navigation";

// The T&P suite is a separate product hidden behind an easter egg. The cookie only hides the door;
// database roles stay the real guard.
export const TNP_COOKIE = "gs27_tnp";

export async function tnpUnlocked(): Promise<boolean> {
  return (await cookies()).get(TNP_COOKIE)?.value === "1";
}

export async function requireTnp() {
  if (!(await tnpUnlocked())) notFound();
}
