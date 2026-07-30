---
title: Why this site has zero dependencies
date: 2026-07-30
---

This site is a static page built by one TypeScript script. No framework, no packages, no JavaScript shipped to your browser. The build reads a few markdown and config files and writes plain HTML and CSS. That is the whole system.

I work in cybersecurity, mostly risk assessments for financial firms. A big part of that job is looking at systems and asking what could go wrong, and the honest answer usually starts with the parts nobody is watching: the dependency nobody remembers adding, the plugin that quietly went unmaintained, the build chain with more moving pieces than the product it ships.

So when I built my own site I kept the attack surface as close to zero as I could get it:

- No third party JavaScript, so there is nothing to hijack in your browser.
- No packages, so there is no supply chain to audit and re-audit.
- No CMS or database, so there is nothing to patch on a Tuesday night.
- Static files behind a standard web server, so serving it is boring in the best way.

There is a time argument too. I run my practice solo and my spare hours are spoken for. A site I cannot break is a site I never have to fix. Publishing a post here means dropping a markdown file in a folder and running one command:

```
bun src/build.ts
```

Simple systems fail less, and when they do fail they fail loudly and get fixed fast. That is the same advice I give clients, applied to my own corner of the internet.
