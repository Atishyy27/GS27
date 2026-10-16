import { ago } from "@/lib/time";
import ActionForm from "@/components/recruit/ActionForm";
import OrgNav from "@/components/recruit/OrgNav";
import { addMember, removeMember } from "@/components/recruit/actions";
import { db, type Member } from "@/components/recruit/data";
import { requireOrg } from "@/components/recruit/orgPage";
import { card, input, label } from "@/components/recruit/styles";

export default async function Members({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await requireOrg(id, `/recruit/o/${id}/members`);
  const supabase = (await db())!;
  const { data } = await supabase.rpc("org_member_list", { p_org: org.id });
  const members = (data as Member[]) ?? [];
  const owner = org.role === "owner";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-24">
      <OrgNav org={org} active="members" />
      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.email} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-card p-4 text-sm">
            <span>{m.email}{m.is_me && <span className="text-faint"> (you)</span>}</span>
            <span className="flex items-center gap-3">
              <span className="text-dim">{m.role} · joined {ago(m.joined_at)}</span>
              {owner && !m.is_me && (
                <ActionForm action={removeMember} submit="Remove" className="" confirm={`Remove ${m.email}?`}
                  buttonClassName="text-xs text-faint hover:text-accent">
                  <input type="hidden" name="org_id" value={org.id} />
                  <input type="hidden" name="email" value={m.email} />
                </ActionForm>
              )}
            </span>
          </li>
        ))}
      </ul>
      {owner && (
        <section className={`mt-8 ${card}`}>
          <h2 className="font-bold">Add a teammate</h2>
          <p className="mt-1 text-sm text-dim">They must sign in to GS27 once with this email first.</p>
          <ActionForm action={addMember} submit="Add" resetOnOk className="mt-4 flex flex-col gap-3">
            <input type="hidden" name="org_id" value={org.id} />
            <label className={label}>Email<input name="email" type="email" required className={input} /></label>
            <label className={label}>Role
              <select name="role" defaultValue="recruiter" className={input}>
                <option value="recruiter">Recruiter</option>
                <option value="owner">Owner</option>
              </select>
            </label>
          </ActionForm>
        </section>
      )}
    </main>
  );
}
