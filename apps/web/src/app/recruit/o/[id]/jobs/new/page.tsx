import { listColleges } from "@/lib/college";
import JobForm from "@/components/recruit/JobForm";
import OrgNav from "@/components/recruit/OrgNav";
import { requireOrg } from "@/components/recruit/orgPage";
import { card } from "@/components/recruit/styles";

export default async function NewJob({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await requireOrg(id, `/recruit/o/${id}/jobs/new`);
  const colleges = await listColleges();
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-24">
      <OrgNav org={org} active="jobs" />
      <h2 className="mb-4 text-xl font-bold">New job</h2>
      <div className={card}><JobForm orgId={org.id} verified={org.verified} colleges={colleges} /></div>
    </main>
  );
}
