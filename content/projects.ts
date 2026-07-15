// Typed project list. Copy is verbatim from the site spec — do not invent facts.

export interface Project {
  name: string;
  description: string;
  status: string;
  tags: string[];
}

export const projects: Project[] = [
  {
    name: "AI Policy & Training for Investment Advisers",
    description:
      "A reusable AI governance policy and staff training curriculum for advisory firms — regulator-aware, plain-English, built for firms without a CISO.",
    status: "Active",
    tags: ["AI governance", "NIST", "training"],
  },
  {
    name: "Personal AI Infrastructure",
    description:
      "A heavily customized personal AI system built on the open-source PAI framework — agents, hooks, and verification-first automation for work and life admin.",
    status: "Active",
    tags: ["TypeScript", "Bun", "agents"],
  },
];
