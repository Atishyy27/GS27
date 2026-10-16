import Link from "next/link";
import { cellContext } from "@/components/cell/data";
import DriveForm from "@/components/cell/DriveForm";
import Gate, { NOT_CONFIGURED } from "@/components/cell/Gate";

export const metadata = { title: "New drive · GS27" };

export default async function NewDrive() {
  const ctx = await cellContext();
  if (!ctx.configured) return <Gate title="New drive">{NOT_CONFIGURED}</Gate>;
  if (!ctx.viewer) return <Gate title="New drive" next="/cell/drives/new">Sign in to continue.</Gate>;
  if (!ctx.isCell) return <Gate title="Cell members only">Only the {ctx.college.short_name} placement cell can create drives.</Gate>;
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 pb-20 pt-24">
      <Link href="/cell" className="text-sm text-dim hover:text-fg">← Cell console</Link>
      <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">New drive</h1>
      <p className="mt-2 text-sm text-dim">Start as a draft. Students see it only once you set it to Open.</p>
      <div className="mt-6"><DriveForm branches={ctx.college.branches} /></div>
    </main>
  );
}
