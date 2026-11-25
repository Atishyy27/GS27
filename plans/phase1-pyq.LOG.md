# phase1-pyq progress log

2026-11-18 23:05 IST | step 0 install (pnpm install --frozen-lockfile) | DONE | 'Done in 1m 24.4s'
2026-11-18 23:05 IST | step 0 baseline pnpm build | FAIL (pre-existing) | Compiled successfully; TypeScript finished; then 'Error [SecurityFatalError]: Your version of Next.js is affected by a known security vulnerability' (exit 1). Not fixed: out of scope.
2026-11-18 23:08 IST | step 1 migration 0012_pyq.sql | DONE | throwaway local Postgres 18 (stub auth + 0001/0006 tables): applied in one transaction, no error; 4 tables + RLS policies created
2026-11-18 23:08 IST | step 2 gen_pyq_seed.py -> 0013_seed_me46018.sql | DONE | counts: questions 83, papers 6, links 37 (concept 36, exact 1, related 0), solutions 83. Fixed: DO block delimiter $$ clashed with LaTeX $$ in text, switched to $seed$. Applied 0013 on the same throwaway DB, in one transaction: papers 6, questions 83, links 37, solutions 83, subject rows 1, offerings 1, or_true 15, unit_null 0, bodies with Answer+Exam tip 83.
2026-11-19 04:19 IST | step 3 PastQuestions.tsx + page.tsx import (agent stopped before logging; verified by Opus) | DONE | tsc --noEmit exit 0; eslint src/app/library/s/[id]/ exit 0; theme tokens card/fg/dim/accent exist in globals.css
2026-11-19 04:19 IST | checks | build still blocked by the same pre-existing Next 16.4.0 SecurityFatalError (compile + TS pass); diff scope = 2 migrations, generator, 2 files in s/[id]/, plus PLAN.md/plans (Opus); no commit, push or deploy
