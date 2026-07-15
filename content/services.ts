// Typed services list. Copy is verbatim from the site spec — do not invent facts.

export interface ServicesConfig {
  intro: string;
  items: string[];
  ctaLabel: string;
  ctaEmail: string;
}

export const services: ServicesConfig = {
  intro: "I take on a small number of consulting engagements with financial firms:",
  items: [
    "Cybersecurity risk assessments aligned to NIST CSF 2.0, FTC Safeguards, and NYDFS Part 500",
    "vCISO advisory — ongoing security leadership without the full-time hire",
    "AI policy, governance, and staff training",
  ],
  ctaLabel: "Get in touch",
  ctaEmail: "mailto:arfiala@gmail.com",
};
