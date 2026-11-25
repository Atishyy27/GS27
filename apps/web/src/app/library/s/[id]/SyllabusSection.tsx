import { getDataSource, load } from "@/lib/data";
import SyllabusView from "@/components/library/SyllabusView";

export default async function SyllabusSection({ codes, collegeId }: { codes: string[]; collegeId: number }) {
  const { data, error } = await load(() => getDataSource().syllabi(codes, collegeId));
  return <SyllabusView syllabi={data ?? []} error={error} />;
}
