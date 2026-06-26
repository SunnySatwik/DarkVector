UX_WRITING_GUIDE.md

Version 1.0

Internal Content & Communication Guidelines

Philosophy

DarkVector never tries to sound smart.

DarkVector helps the user feel smart.

Every word should reduce cognitive load.

Never increase it.

Product Voice

DarkVector speaks like

an experienced security engineer
calm
concise
confident
factual
helpful

Never

dramatic
robotic
marketing-heavy
military
cyberpunk
Voice Attributes
Calm

Good

New anomaly detected.

Bad

⚠️ CRITICAL SECURITY INCIDENT DETECTED!
Helpful

Good

3 related events were identified.

Bad

Correlation complete.
Human

Good

No active investigations.

Bad

No investigation entities currently exist.
Precise

Good

Authentication failed from a new location.

Bad

Authentication event anomaly detected.
Tone

DarkVector never panics.

Even when something is critical.

Good

Potential ransomware behavior detected.

Recommended action:

Isolate the affected endpoint.

Bad

SYSTEM COMPROMISED

IMMEDIATE ACTION REQUIRED
Vector's Personality

Vector is not ChatGPT.

Vector is not a chatbot.

Vector is your investigation partner.

Vector speaks like an experienced analyst.

Vector Never Says
Hello!

How can I help you today?

😊

No.

Instead

I've identified unusual process behavior.

The execution chain differs from previous observations.

Three factors contributed to the elevated risk score.
Writing Rules

Every sentence should be

short
direct
useful

Maximum:

20 words.

Break long explanations into sections.

Progressive Disclosure

Never show

500 words.

Instead

Summary

↓

Evidence

↓

Reasoning

↓

Confidence

↓

Recommendations
Labels

Use natural language.

Good

Overview

Investigate

Reports

Models

Settings

Bad

Threat Operations Center

Security Management Interface

Correlation Engine

Advanced Forensics Console
Buttons

Buttons should describe actions.

Good

Open Investigation

Generate Report

Ask Vector

Export PDF

Compare Events

Mark Reviewed

Bad

Submit

Execute

Continue

Launch

Proceed
Empty States

Never

No data.

Instead

No investigations require your attention.

Vector hasn't detected unusual activity in the last 24 hours.

Another example

No reports yet.

Generate an incident report after completing an investigation.
Errors

Never blame users.

Bad

Invalid request.

Better

We couldn't process that request.

Try again or review your filters.

Network

Connection lost.

We'll reconnect automatically.
Success Messages

Keep them subtle.

Report generated.

Copied.

Changes saved.

Investigation archived.

No celebration.

Notifications

Only interrupt when necessary.

Examples

New investigation available.

Vector found additional evidence.

Model retrained successfully.

Report export completed.
Severity Labels

Instead of

LOW

MEDIUM

HIGH

CRITICAL

Display

Low

Medium

High

Critical

Sentence case.

Always.

Risk Scores

Never write

Risk Score = 81

Instead

Risk

81

High

Much cleaner.

Dates

Instead of

2026-06-27 17:42:33

Use

2 min ago

Expanded

26 Jun 2026 · 17:42

Only when needed.

Numbers

Don't overload precision.

Instead of

83.456778%

Use

83%

Unless precision matters.

Search

Search should feel conversational.

Placeholder

Search investigations...


Examples

Show failed logins

Investigate Alice

Open Case #142

Generate report

Explain anomaly
Command Palette

Examples

Open Investigations

Generate Incident Report

Show today's alerts

Compare two hosts

Find suspicious logins

Not

Navigate

Launch

Execute
AI Citations

Vector should explain

where information came from.

Example

Reasoning

↓

Based on:

Authentication Logs

Process Tree

Historical Baseline

SHAP Analysis

Never

Trust me.
Loading Messages

Keep them useful.

Instead of

Loading...

Use

Preparing investigation...

Analyzing telemetry...

Loading evidence...

Never fake progress.

Welcome Screen

Instead of

Welcome back

Use

Good morning.

Two investigations require attention.

or

Nothing urgent.

You're all caught up.

Feels much more personal.

Report Language

Reports should read like professional security documents.

Not AI essays.

Good

Executive Summary

Evidence

Timeline

Assessment

Recommended Actions

Never

Here's what happened...
Terminology

Always use

Investigation

Evidence

Timeline

Alert

Finding

Recommendation

Risk

Analysis

Avoid

Cyber Matrix

Threat Engine

Deep Neural Security Core

Quantum Detection

Buzzwords reduce trust.

Writing Checklist

Before adding text ask

Is it necessary?
Can it be shorter?
Would a security analyst naturally say this?
Does it reduce cognitive load?
Does it guide the next action?

If not,

rewrite it.

Things We Never Say

Never

Utilize

Use

Use

Never

Leverage

Use

Apply

Never

Initiate

Use

Start

Never

Execute

Use

Run

Never

Optimize

Use

Improve

Simple language is stronger.

Product Motto

This isn't shown in the UI, but it guides every decision:

Understand first. Act with confidence.

That is what DarkVector is about.

Not finding the most alerts.

Helping analysts understand what matters.

Vector's Golden Rule

Every response from Vector should answer these four questions:

What happened?
Why does it matter?
What evidence supports this?
What should I do next?

If a response doesn't answer all four, it's incomplete.