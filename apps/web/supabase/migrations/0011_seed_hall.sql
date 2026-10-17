-- Hall of Fame seed, 17 Oct 2026.
--
-- Every row here is a real, shipped project with a link anyone can open. Source of truth is
-- the portfolio's own content file, ~/Desktop/portfolio/src/content/site.ts (govtWork,
-- clientWork, orgWork, extensions, hackathons), which is itself red-teamed against MASTER-CV.md.
-- Nothing is invented and nobody else's name appears: private client work under NDA (4Moral,
-- dlab, Livehood, Logistik, Hamari Virasat) is deliberately left out, and other students'
-- projects wait until they submit them or confirm their own credit line.
--
-- score stays 0 on every row. Seeding votes would be fake engagement, and the list is small
-- enough that real votes will sort it within a week.
--
-- The placeholder row 'leadgs' from 0005 is left alone; it is a batchmate's tool waiting on
-- their details.

-- college_id is NOT NULL on projects since 0006 and has no default, so it is resolved here
-- the same way 0010 does it.
do $$
declare c bigint := (select id from public.colleges where slug = 'sgsits');
begin

insert into public.projects
  (college_id, slug, name, tagline, description, url, repo_url, tags, builders, batch, branch, status, submitted_by)
values

-- Built for SGSITS itself
(c, 'sgsits-techfest-2025', 'SGSITS Techfest 2025',
 'The college techfest site, built against a hard public deadline',
 'Techfest site for SGSITS, built with one other developer to a date that could not move. Hindi and English localisation, a three.js hero, and real launch-day traffic on the morning registrations opened.',
 'https://sgsits-techfest-2025.vercel.app/', 'https://github.com/Atishyy27/SGSITS-techfest-2025',
 array['react', 'supabase', 'three-js', 'college'], 'Atishay Jain, 2027', 2027, 'Mech', 'approved', null),

(c, 'pfms', 'PF Management System',
 'Provident fund for the institute finance department, over a crore a month',
 'Runs the provident fund for the SGSITS finance department: more than one crore in monthly funds, automated reconciliation, bulk imports of over ten thousand records at a time, role-based access and a persistent audit log so every change has a name and a timestamp against it. Spring Boot and MySQL behind a React front end, schema managed with Flyway.',
 null, 'https://github.com/Atishyy27/PFMS',
 array['spring-boot', 'react', 'mysql', 'college'], 'Atishay Jain, 2027', 2027, 'Mech', 'approved', null),

(c, 'gs27', 'GS27',
 'This site. Started in first year as a notes drive, rebuilt as a student platform',
 'Began in 2023 as a page of first-year notes and past papers for SGSITS. Rebuilt as a platform: a library of notes and papers with subjects shared across colleges, because syllabi overlap about eighty percent, an anonymous feed and groups, this Hall of Fame, and a recruiter side students opt into. Multi-college from the first commit, with SGSITS as college one.',
 'https://gs27.vercel.app', null,
 array['next-js', 'supabase', 'college', 'open-source'], 'Atishay Jain, 2027', 2027, 'Mech', 'approved', null),

(c, 'sgsits-incubation-forum', 'SGSITS Incubation Forum',
 'Site for the institute incubation forum',
 'Built on WordPress for the SGSITS incubation forum, later migrated to Wix when the forum wanted to edit it without a developer.',
 'https://www.sgsitsincubationforum.com/', null,
 array['wordpress', 'college'], 'Atishay Jain, 2027', 2027, 'Mech', 'approved', null),

-- Chrome extensions, on the Web Store
(c, 'leetcode-analytics', 'LeetCode Analytics',
 'Real difficulty and topic analytics injected into your LeetCode profile',
 'Reads your public LeetCode profile over their own GraphQL API and draws what the site does not: difficulty spread against real contest ratings, topic breakdown, trend over time, and where your solving actually sits. Collects nothing and sends nothing anywhere. 265 users on the Chrome Web Store as of 29 September 2026.',
 'https://chromewebstore.google.com/detail/leetcode-analytics/pcgnpclciloahjpjhhmjbalpcdmlkpba',
 'https://github.com/Atishyy27/leetcode-analytics',
 array['chrome-extension', 'graphql', 'dsa'], 'Atishay Jain, 2027', 2027, 'Mech', 'approved', null),

-- Hackathons
(c, 'xai-aml', 'Anti money laundering detection',
 'Graph neural network over a million transactions, with a reason for every flag',
 'Finds anomalous transaction clusters across more than a million records with a graph neural network, then puts a SHAP explainability layer on top so an analyst can see why a case was flagged instead of being told to trust it. Top 5 of over 500 teams at CIIS, judged by SBI, ClearTrail and MP Police, and it converted into an internship offer.',
 'https://ciis-demo.vercel.app/', 'https://github.com/Atishyy27/xai-aml',
 array['pytorch', 'neo4j', 'fastapi', 'hackathon'], 'Atishay Jain, 2027', 2027, 'Mech', 'approved', null),

(c, 'geoyield', 'GeoYield',
 'Farm yield optimisation from ISRO geospatial data',
 'Built for Smart India Hackathon 2025: pulls ISRO geospatial data and turns it into yield guidance a farmer can act on, rather than a map a researcher can admire.',
 'https://geoyield.vercel.app/', null,
 array['python', 'geospatial', 'react', 'hackathon'], 'Atishay Jain, 2027', 2027, 'Mech', 'approved', null),

(c, 'truthtrack', 'TruthTrack',
 'Real-time misinformation detection, top 25 of 4000 teams',
 'Scores claims as they arrive rather than after the fact. Placed 25th of more than 4,000 teams at TruthTell, the top 0.60 percent.',
 null, 'https://github.com/Atishyy27/TruthTrack',
 array['python', 'react', 'hackathon'], 'Atishay Jain, 2027', 2027, 'Mech', 'approved', null),

(c, 'adobe-1a', 'Adobe document intelligence',
 'Structure extraction from documents, top 550 of 90000',
 'Adobe India Hackathon 2025 submission on document intelligence: pulls structure out of PDFs that were never built to give it up. Placed 550 of more than 90,000, the top 0.66 percent.',
 null, 'https://github.com/Atishyy27/Adobe-1A',
 array['python', 'documents', 'hackathon'], 'Atishay Jain, 2027', 2027, 'Mech', 'approved', null),

-- Government, live on the Play Store
(c, 'yes-wellness', 'YES Wellness Platform',
 'State wellness platform for the MP Ministry of Ayush, launched by the Chief Minister',
 'Backend for a state-wide wellness platform carrying around five thousand concurrent users, launched by the Chief Minister of Madhya Pradesh. The interesting part was a booking race condition double-allocating slots under peak load, killed with PostgreSQL row-level locking, then K6 stress tested down to a sub-100ms P95.',
 'https://play.google.com/store/apps/details?id=in.gov.mp.shree.yes', null,
 array['flutter', 'mern', 'postgresql', 'government'], 'Atishay Jain, 2027', 2027, 'Mech', 'approved', null),

(c, 'sram', 'SRAM',
 'Labour department platform for the Govt of MP, live on the Play Store',
 'Platform for the Madhya Pradesh Ministry of Labour, shipped to the Play Store. React Native and Django over AWS.',
 'https://play.google.com/store/apps/details?id=in.gov.mp.shree.sram', null,
 array['react-native', 'django', 'aws', 'government'], 'Atishay Jain, 2027', 2027, 'Mech', 'approved', null),

-- Open source and side projects
(c, 'tripkit', 'tripkit',
 'An open travel guide you can actually contribute to',
 'Open-source travel guide built as a real project rather than a toy: versioned content, contributions over pull requests, and lists that people outside the repo have added to.',
 null, 'https://github.com/Atishyy27/tripkit',
 array['open-source', 'travel', 'javascript'], 'Atishay Jain, 2027', 2027, 'Mech', 'approved', null),

(c, 'guardianagent-pro', 'GuardianAgent Pro',
 'Agentic AI system built for a client brief',
 'An agentic system in Python built to a client brief: tools, a planning loop, and guardrails that stop it doing something expensive on its own.',
 null, 'https://github.com/Atishyy27/GuardianAgent-Pro',
 array['agentic-ai', 'python'], 'Atishay Jain, 2027', 2027, 'Mech', 'approved', null),

(c, 'davv-incubation-centre', 'DAVV Incubation Centre',
 'CMS platform for the university incubation centre',
 'Content platform for the DAVV incubation centre, built so the centre could run it without calling a developer every week.',
 'https://davvincubationcentre.com/', null,
 array['wordpress', 'cms', 'college'], 'Atishay Jain, 2027', 2027, 'Mech', 'approved', null),

(c, 'genius-solar-services', 'Genius Solar Services',
 'Marketing and lead capture front end for a solar installer',
 'React front end for a solar installation business: the pitch, the pricing and a lead capture flow that actually reaches their inbox.',
 'https://geniussolarservices.com/', null,
 array['react', 'client-work'], 'Atishay Jain, 2027', 2027, 'Mech', 'approved', null);

end $$;
