// Counts only. Source: the T&P cell's 2026-27 sheets, read 15 Oct 2026
// (cnc/college/placecom-data/insights.json). No student names ever go in this file.

export const SEASON = {
  asOf: "15 Oct 2026",
  drives: 40,
  byType: { internship: 16, internPlusJob: 9, job: 15 },
  medianCtcLpa: 7.7,
  ctcN: 28,
  ctcRange: [3.6, 21],
  medianStipend: 25000,
  stipendN: 18,
  registered2027: 1179,
  clearedAny2027: 454,
};

export type Branch = {
  code: string;
  name: string;
  drivesOpen: number;
  registered: number;
  clearedAny: number;
};

export const BRANCHES: Branch[] = [
  { code: "CSE", name: "Computer Engineering", drivesOpen: 29, registered: 165, clearedAny: 86 },
  { code: "IT", name: "Information Technology", drivesOpen: 29, registered: 156, clearedAny: 87 },
  { code: "ECE", name: "Electronics & Telecom", drivesOpen: 28, registered: 116, clearedAny: 55 },
  { code: "EI", name: "Electronics & Instrumentation", drivesOpen: 32, registered: 117, clearedAny: 58 },
  { code: "EE", name: "Electrical Engineering", drivesOpen: 26, registered: 119, clearedAny: 51 },
  { code: "Mech", name: "Mechanical Engineering", drivesOpen: 28, registered: 116, clearedAny: 45 },
  { code: "Civil", name: "Civil Engineering", drivesOpen: 20, registered: 118, clearedAny: 28 },
  { code: "IP", name: "Industrial & Production", drivesOpen: 19, registered: 115, clearedAny: 35 },
  { code: "BME", name: "Biomedical Engineering", drivesOpen: 13, registered: 87, clearedAny: 9 },
];

// OSM building name (upper case substring) -> branches housed there.
// IT has no named building in OpenStreetMap, so it is reachable from the list only.
export const BUILDING_BRANCHES: [string, string[]][] = [
  ["COMPUTER ENGG", ["CSE", "EI"]],
  ["ELEX AND T.C.", ["ECE"]],
  ["ELECTRICAL", ["EE"]],
  ["MECHANICAL", ["Mech"]],
  ["CIVIL", ["Civil"]],
  ["INDUSTRIAL", ["IP"]],
  ["BIOMEDICAL", ["BME"]],
];

export function branchesFor(buildingName: string): string[] {
  const n = buildingName.toUpperCase();
  return BUILDING_BRANCHES.find(([k]) => n.includes(k))?.[1] ?? [];
}
