import { getDataSource, load } from "@/lib/data";
import PastQuestionsView from "@/components/library/PastQuestionsView";

export default async function PastQuestions({ subjectId }: { subjectId: number }) {
  const { data, error } = await load(() => getDataSource().pastQuestions(subjectId));
  return <PastQuestionsView questions={data ?? []} error={error} />;
}
