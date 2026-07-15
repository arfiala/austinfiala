// Typed site configuration. Copy is verbatim from the site spec — do not invent facts.

export interface SiteLink {
  label: string;
  href: string;
}

export interface SiteConfig {
  name: string;
  tagline: string;
  location: string;
  links: SiteLink[];
  footerLinks: SiteLink[];
}

export const site: SiteConfig = {
  name: "Austin Fiala",
  tagline:
    "Cybersecurity consultant for financial firms — risk assessments, vCISO advisory, and AI governance for RIAs, funds, and community financial institutions.",
  location: "New Jersey, USA",
  links: [
    { label: "Email", href: "mailto:arfiala@gmail.com" },
    { label: "GitHub", href: "https://github.com/arfiala" },
  ],
  footerLinks: [
    { label: "Email", href: "mailto:arfiala@gmail.com" },
    { label: "GitHub", href: "https://github.com/arfiala" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/austin-fiala/" },
  ],
};
