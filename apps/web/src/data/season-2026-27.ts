// Placement season 2026-27, as of 15 Oct 2026. Counts only: no student names, enrollment numbers or contacts.
// Source: the T&P cell's own sheets, copied read-only and summarised in
// cnc/college/placecom-data/insights.json (built by insights.py). "Cleared a round" comes from stage
// result sheets, which are not final offers; nothing here is an offer or placement count.

export const AS_OF = "15 Oct 2026";
export const SOURCE = "T&P cell sheets, 2026-27 season";

export const DRIVES = { total: 40, internship: 16, internPlusJob: 9, job: 15 };

export const DRIVES_BY_MONTH: { month: string; n: number }[] = [
  { month: "Feb", n: 1 },
  { month: "Jul", n: 3 },
  { month: "Aug", n: 14 },
  { month: "Sep", n: 13 },
  { month: "Oct", n: 9 },
];

export const CTC = {
  n: 28,
  medianLpa: 7.7,
  minLpa: 3.6,
  maxLpa: 21,
  buckets: [
    { label: "under 5", n: 4 },
    { label: "5 to 8", n: 11 },
    { label: "8 to 12", n: 10 },
    { label: "12 and up", n: 3 },
  ],
  top: [
    { lpa: 21, company: "Infosys" },
    { lpa: 18.87, company: "Futures First" },
    { lpa: 16.62, company: "Addverb Technologies" },
    { lpa: 11.6, company: "Asian Paints" },
  ],
};

export const STIPEND = { n: 18, median: 25000, min: 7000, max: 110000 };

// 10th / 12th percentage cut-off asked by each drive that states one
export const CUTOFFS = [
  { pct: 50, n: 2 },
  { pct: 60, n: 13 },
  { pct: 65, n: 14 },
  { pct: 70, n: 8 },
  { pct: 75, n: 1 },
  { pct: 80, n: 2 },
];

export const BOND = { n: 4, of: 40 };

// People completing each interview round, per drive (date of drive). Drives from Feb 2025 to Sep 2026
// whose tracking sheet records at least two rounds.
export const INTERVIEW_ROUNDS: { date: string; rounds: number[] }[] = [
  { date: "24 Aug 2026", rounds: [105, 35, 14, 3] },
  { date: "5 Aug 2025", rounds: [82, 31, 23] },
  { date: "18 Feb 2025", rounds: [70, 22] },
  { date: "5 Aug 2025", rounds: [63, 32, 22] },
  { date: "29 Jul 2025", rounds: [59, 29, 5] },
  { date: "30 Sep 2026", rounds: [29, 10, 4] },
  { date: "7 Jan 2026", rounds: [25, 7, 3] },
  { date: "20 Nov 2025", rounds: [22, 12] },
  { date: "12 Nov 2025", rounds: [21, 4, 1] },
  { date: "5 Aug 2025", rounds: [18, 10, 4] },
  { date: "7 May 2025", rounds: [13, 3, 3] },
  { date: "6 Feb 2025", rounds: [12, 7, 4] },
];

export const SUMMER_CALLING = { companies: 1904, peerColleges: 31, cameThisSeason: 14, priority10Plus: 105 };
