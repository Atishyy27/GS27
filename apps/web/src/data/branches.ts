// Branch names and which campus building houses them. No placement statistics live in GS27:
// the season's drive counts, CTC and funnel numbers are shown only in the live Placecom session,
// never on a public site (his instruction, 16 Oct 2026).

export type Branch = {
  code: string;
  name: string;
};

export const BRANCHES: Branch[] = [
  { code: "CSE", name: "Computer Engineering" },
  { code: "IT", name: "Information Technology" },
  { code: "ECE", name: "Electronics & Telecom" },
  { code: "EI", name: "Electronics & Instrumentation" },
  { code: "EE", name: "Electrical Engineering" },
  { code: "Mech", name: "Mechanical Engineering" },
  { code: "Civil", name: "Civil Engineering" },
  { code: "IP", name: "Industrial & Production" },
  { code: "BME", name: "Biomedical Engineering" },
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
