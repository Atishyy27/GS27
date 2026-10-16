import ActionForm from "@/components/recruit/ActionForm";
import OrgNav from "@/components/recruit/OrgNav";
import { updateOrg } from "@/components/recruit/actions";
import { requireOrg } from "@/components/recruit/orgPage";
import { card, input, label } from "@/components/recruit/styles";

export default async function Settings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const org = await requireOrg(id, `/recruit/o/${id}/settings`);
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-24">
      <OrgNav org={org} active="settings" />
      {org.role !== "owner" ? (
        <p className="text-sm text-dim">Only owners can change organization settings.</p>
      ) : (
        <section className={card}>
          <ActionForm action={updateOrg} submit="Save">
            <input type="hidden" name="org_id" value={org.id} />
            <label className={label}>Name<input name="name" required minLength={2} maxLength={80} defaultValue={org.name} className={input} /></label>
            <label className={label}>Website<input name="website" maxLength={200} defaultValue={org.website ?? ""} className={input} /></label>
            <label className={label}>Logo URL<input name="logo_url" maxLength={500} defaultValue={org.logo_url ?? ""} className={input} /></label>
            <p className="text-xs text-faint">Short name: {org.slug}. Verification is set by GS27, not here.</p>
          </ActionForm>
        </section>
      )}
    </main>
  );
}
