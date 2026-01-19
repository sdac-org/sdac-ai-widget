export const REPORT_DATA = {
  districtName: "Maplewood-Richmond Heights",
  quarter: "Q3-2025",
  submissionDate: "June 24, 2025",
  positions: 18,
  totalSalary: 243980,
  totalFringe: 63548,
  prevSalary: 217500,
  prevFringe: 58450,
  salaryDiff: 12.3,
  fringeDiff: 8.7,
  justification: "General salary increases and fringe rate adjustments",
};

export const MOCK_ISSUES = [
  {
    id: 1,
    priority: "high",
    title: "Position #7 (Goldberg)",
    description: "Source code 4 with claimed costs ($7,196)",
    amount: 7196,
  },
  {
    id: 2,
    priority: "medium",
    title: "Position #12",
    description: "Missing comment on position #12 ($0 salary)",
    amount: 0,
  },
  {
    id: 3,
    priority: "medium",
    title: "Justification Issue",
    description: "Justification incomplete - doesn't explain new positions",
    amount: null,
  },
];

export const PERSONNEL_DATA = [
  { id: 1, name: "Smith, J.", title: "School Counselor", source: "1", function: "2122", pool: "2", salary: 45000, fringe: 12000 },
  { id: 2, name: "Doe, R.", title: "School Nurse", source: "1", function: "2134", pool: "2", salary: 42000, fringe: 11500 },
  { id: 3, name: "Johnson, L.", title: "Social Worker", source: "1", function: "2113", pool: "2", salary: 48000, fringe: 12500 },
  { id: 4, name: "Brown, M.", title: "Asst. Principal", source: "1", function: "2411", pool: "2", salary: 65000, fringe: 15000 },
  { id: 5, name: "Wilson, K.", title: "SpEd Director", source: "1", function: "2113", pool: "2", salary: 72000, fringe: 18000 },
  { id: 6, name: "Miller, P.", title: "Psychological Examiner", source: "1", function: "2122", pool: "2", salary: 55000, fringe: 14000 },
  { id: 7, name: "Goldberg, S.", title: "School Nurse", source: "4", function: "2134", pool: "2", salary: 7196, fringe: 1850, isError: true }, // The error
  { id: 8, name: "Davis, B.", title: "Counselor", source: "1", function: "2122", pool: "2", salary: 46000, fringe: 12100 },
  { id: 9, name: "Garcia, M.", title: "Social Worker", source: "1", function: "2113", pool: "2", salary: 49000, fringe: 12600 },
  { id: 10, name: "Martinez, H.", title: "Nurse", source: "1", function: "2134", pool: "2", salary: 43000, fringe: 11600 },
  { id: 11, name: "Robinson, E.", title: "Counselor", source: "1", function: "2122", pool: "2", salary: 45500, fringe: 12050 },
  { id: 12, name: "Clark, T.", title: "Counselor", source: "1", function: "2122", pool: "2", salary: 0, fringe: 0, isError: true }, // The error
  { id: 13, name: "Rodriguez, N.", title: "Social Worker", source: "1", function: "2113", pool: "2", salary: 48500, fringe: 12550 },
  { id: 14, name: "Lewis, A.", title: "Nurse", source: "1", function: "2134", pool: "2", salary: 42500, fringe: 11550 },
  { id: 15, name: "Lee, C.", title: "Alt Services Int.", source: "1", function: "1193", pool: "2", salary: 9212, fringe: 2500, isNew: true },
  { id: 16, name: "Walker, S.", title: "Counselor", source: "1", function: "2122", pool: "2", salary: 46500, fringe: 12150 },
  { id: 17, name: "Hall, D.", title: "Social Worker", source: "1", function: "2113", pool: "2", salary: 49500, fringe: 12650 },
  { id: 18, name: "Williams, R.", title: "Alt Ed Int.", source: "1", function: "1193", pool: "2", salary: 10268, fringe: 2800, isNew: true },
];

export const QA_PAIRS = [
  {
    triggers: ["fringe", "differential", "high"],
    answer: `The 8.7% fringe increase is driven by:

1) Two new positions added (Williams, Lee) contributing $7,108 in fringe
2) General fringe rate increases across existing staff

The salary differential is 12.3%, so the fringe increase is proportional. However, their justification doesn't mention the new positions—this should be addressed.`,
  },
  {
    triggers: ["last quarter", "q2", "previous"],
    answer: `In Q2-2025, Maplewood-Richmond Heights was validated with no issues.

In Q1-2025, they were sent back for:
1) Source code errors on 2 positions
2) Missing comments for vacant positions

They corrected these issues promptly and have not repeated them.`,
  },
  {
    triggers: ["rbt", "cost pool", "pool 1", "pool 2"],
    answer: `RBTs (Registered Behavior Technicians) should be in Cost Pool 1 if they are providing IEP-based services directly to students.

Based on this district's roster, I see no RBTs listed. Are you referring to a specific position? I can help verify their cost pool placement.`,
  },
  {
    triggers: ["justification", "acceptable"],
    answer: `The current justification states "general salary increases" but this doesn't fully explain the 12.3% salary differential.

The increase is actually caused by:
1) Two new positions totaling $19,480
2) General salary increases of ~4-5% for existing staff

I recommend asking them to update the justification to include the new positions.`,
  },
  {
    triggers: ["source code", "rules"],
    answer: `Source codes indicate funding source:
1 = Local
2 = County
3 = State
4 = Federal

Important rules:
• A position can have multiple source codes (e.g., '1,3')
• Source code 4 (federal) cannot be claimed for SDAC
• If a position has '4', the % state/local funds must be 0% or federal portion backed out
• Source codes must be verified each quarter`,
  },
  {
    triggers: ["history", "cost pool issues"],
    answer: `Maplewood-Richmond Heights has no recorded cost pool placement issues in the tracking database.

All positions have been consistently classified in Cost Pool 2 (counselors, nurses, admin).

This is a well-performing district in this area.`,
  },
  {
    triggers: ["function code", "problematic"],
    answer: `Function codes 2321 and 2546 are included in the indirect cost rate and are NOT eligible for SDAC reimbursement.

If these appear, costs must be removed.

I don't see any of these problematic codes in the current submission.`,
  },
  {
    triggers: ["validate", "can i validate"],
    answer: `Not yet—there are 3 issues that need to be resolved first.

You can either:
1) Send back with feedback for the district to fix
2) Contact the district directly to resolve

Would you like me to draft the sendback message?`,
  },
];
