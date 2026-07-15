// Typed project list. Copy is verbatim from the site spec — do not invent facts.

export interface Project {
  name: string;
  description: string;
  status: string;
  tags: string[];
}

export const projects: Project[] = [
  {
    name: "Personal AI Infrastructure",
    description:
      "A heavily customized personal AI system built on the open-source PAI framework — agents, hooks, and verification-first automation for work and life admin.",
    status: "Active",
    tags: ["TypeScript", "Bun", "agents"],
  },
];
