import Link from "next/link";
import ActionButton from "./ActionButton";
import { joinGroup, leaveGroup } from "./actions";

type Props = { groupId: number; joined: boolean; signedIn: boolean; next: string };

export default function JoinButton({ groupId, joined, signedIn, next }: Props) {
  if (!signedIn) {
    return <Link href={`/login?next=${encodeURIComponent(next)}`} className="rounded-full border border-white/20 px-3 py-1 text-sm hover:border-white/50">Join</Link>;
  }
  return joined ? (
    <ActionButton run={leaveGroup.bind(null, groupId)} className="rounded-full border border-white/20 px-3 py-1 text-sm text-dim hover:border-white/50">
      Joined
    </ActionButton>
  ) : (
    <ActionButton run={joinGroup.bind(null, groupId)} className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-bg">
      Join
    </ActionButton>
  );
}
