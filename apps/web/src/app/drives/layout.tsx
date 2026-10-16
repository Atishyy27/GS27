import { requireTnp } from "@/lib/tnp";

export default async function TnpLayout({ children }: { children: React.ReactNode }) {
  await requireTnp();
  return children;
}
