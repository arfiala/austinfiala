---
title: Cadence: a training app built by directing AI agents
date: 2026-08-03
---

Cadence is a personal training app I run at [fit.austinfiala.com](https://fit.austinfiala.com). It sits behind a login because it is built for exactly one user, me. It syncs my workouts from Garmin, tracks my swim and bike volume against a weekly goal, computes training load the way the serious platforms do, pulls my Zwift race results, keeps my golf scorecards, tracks nutrition, and runs a twelve week training plan that adjusts itself after each workout based on what I actually did. It also has a conversational interface, so I can ask my AI assistant what my week looks like or log a session without opening the app at all.

The part worth writing about is not the feature list. It is that I did not write most of the code by hand. I directed AI agents that did the typing, and my job was everything around the typing: deciding what to build, deciding what not to build, reviewing what came back, and refusing to call anything done until I had proof it worked. I work in cybersecurity, mostly risk assessments for financial firms, and it turns out that job is excellent training for this one. Both come down to asking what could go wrong and not accepting a confident answer as evidence.

Here is a concrete example of why the human in the loop still matters. The first Garmin integration library the project selected looked great on paper: typed, maintained, full API coverage. In production it crashed the service on the first real sync, because it depended on a native module the runtime could not load. The checklist said yes. Reality said no. Two things saved the project. First, the integration had been deliberately isolated to a single folder, so swapping to a different library was a one file change instead of a rewrite. Second, the failure produced a rule that now gates every library decision in the project: on this runtime, zero native modules, checked before features are even compared. That rule came from judgment about a failure, and no amount of code generation would have produced it on its own.

The discipline that makes the whole approach work is verification. An AI agent will tell you the work is done, and it will sound sure. So nothing in Cadence counts as finished until it is proven: automated tests pass, the real page renders in a real browser, and the data lands in the database and comes back out correctly. When a feature touched the live database schema, the migration was rehearsed on a copy of the real data before it ever ran in production. That habit has caught real bugs that the tests missed, including one where a passing test suite hid a timing failure that only showed up on a real network socket.

The stack is deliberately boring: Bun, TypeScript, and SQLite on a five dollar server, with almost no dependencies. Boring is a feature. Every package you do not add is a package that cannot break, leak, or go unmaintained. The app currently has over four hundred automated tests, and the entire system is small enough that I can hold it in my head, which is more than I can say for most software I have assessed professionally.

The takeaway, for me, is that the typing was never the valuable part of building software. The valuable part is knowing what to build, noticing what is wrong, and being accountable for the result. AI made that judgment cheaper to apply and more valuable to have. The robots type. I decide. Cadence is what that division of labor looks like when it ships.

Let me know if you have any questions, happy to talk through any of it.
