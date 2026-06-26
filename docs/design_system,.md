DarkVector Design System v1.0

Internal Product Specification

1. Product Personality

Every design decision should reinforce the same personality.

DarkVector is
Intelligent
Calm
Confident
Curious
Precise
Fast
Helpful
Explainable
Engineer-first
Beautiful without trying too hard
DarkVector is NOT
Hacker-themed
Corporate
Government software
Military
Sci-fi
Cyberpunk
Enterprise committee designed
Noisy
Over-engineered
The Feeling

Imagine someone opening DarkVector.

The first thought should be:

"This feels like Cursor."

The second:

"Wait... this is cybersecurity software?"

2. Product Principles

These become our rules.

Rule 1

Every screen has ONE purpose.

Never try to show everything.

Rule 2

The UI never competes with the investigation.

The investigation is the hero.

Rule 3

Everything should feel handcrafted.

Nothing should feel generated.

Rule 4

Reduce.

Merge.

Simplify.

Every iteration removes more than it adds.

Rule 5

Motion should explain.

Not decorate.

3. Information Architecture

Instead of

Dashboard

↓

Threat Feed

↓

Reports

↓

Settings

DarkVector becomes

Mission Control
        │
        ▼
Investigate
        │
        ▼
Evidence
        │
        ▼
Vector
        │
        ▼
Decision
        │
        ▼
Report

Notice

The investigation becomes the journey.

4. Navigation

I would completely redesign it.

Current AI Studio

Threat Explorer

Threat Graph

Threat Timeline

Threat Feed

Forensic Studio

Knowledge

Way too many nouns.

Instead

Overview

Investigate

Graph

Reports

Models

Settings

That's it.

Simple.

Memorable.

5. Layout System

DarkVector uses

Workspace Layout

Not dashboard layout.

──────────────────────────────────────────

Sidebar

──────────────────────────────────────────

Top Bar

──────────────────────────────────────────

Primary Workspace

─────────────────────────┬────────────────

                         │

                    Vector Panel

─────────────────────────┴────────────────

Notice

The AI panel isn't floating.

It's part of the workspace.

6. Spacing System

Everything follows an 8px grid.

No random values.

Token	Value
xs	4
sm	8
md	16
lg	24
xl	32
xxl	48
hero	64

Every component follows these.

7. Border Radius

Nothing should be sharp.

Nothing should be bubble-like.

Buttons

10px

Cards

18px

Panels

22px

Dialogs

24px

8. Color System

This is where I want to change AI Studio's version.

Current

Too much purple.

Instead

Background
#090B11
Surface
#11141B
Elevated
#171C26
Border
#232833
Text

Primary

#F8F9FB

Secondary

#A5ADBA

Muted

#70788A
Accent

Blue

#4C8DFF

Purple

#7B61FF

Only use purple for AI-related elements.

Danger
#FF5A5F

Only for real danger.

Never decoration.

9. Typography

This is one of our biggest improvements.

Current

ACTIVE THREAT VECTORS

Instead

Threat graph

Sentence case.

Always.

Hierarchy

H1

40

H2

30

H3

22

Body

16

Caption

13

Mono

JetBrains Mono

10. Icon System

Lucide.

Only.

Consistent stroke width.

No mixed icon packs.

11. Cards

One thing AI Studio still does wrong.

Everything

is

a

card.

No.

Cards should represent

objects.

Examples

Investigation

Report

Threat

Evidence

Containers

don't need cards.

Whitespace is enough.

12. Buttons

Only three types.

Primary

Filled

Secondary

Subtle

Ghost

Text only

No gradients.

13. AI

The AI

is called

Vector

Not Gemini.

Not GPT.

Not Claude.

Implementation is hidden.

Vector has its own design language.

Minimal.

Conversational.

Never flashy.

Vector messages

Vector

I've identified a new execution chain.

The behavior differs from this host's baseline.

Simple.

14. AI Panel

Instead of

ChatGPT.

We make

Vector

────────────────────

Summary

Evidence

Reasoning

Confidence

Actions

References

Each collapsible.

No walls of text.

15. Data Visualization

This is important.

Not every chart

needs

a chart.

Sometimes

18

Critical Alerts

is better.

Charts should answer

one question.

Not

"display data."

16. Motion Language

This is probably my favorite section.

Everything

has weight.

Cards

↓

Fade

↓

Slide

↓

Settle

Sidebar

↓

Compress

↓

Expand

Pages

↓

Crossfade

Investigation

↓

Morph

No bounce.

Ever.

17. Shadows

Very subtle.

No glowing.

No heavy blur.

Just depth.

18. Component Library

This becomes Cursor's reference.

Core

Sidebar

TopBar

Workspace

Panel

Card

Button

Data

ThreatCard

InvestigationCard

Timeline

EvidenceItem

Metric

RiskBadge

Alert

NodeGraph

AI

VectorPanel

Reasoning

EvidenceList

ConfidenceBar

Recommendation

Citation

Navigation

Breadcrumb

CommandPalette

Tabs

Search

Filters
19. Naming Rules

No buzzwords.

Instead of

Telemetry Matrix

Use

Telemetry

Instead of

Threat Vector Correlation Engine

Use

Threat graph

Instead of

Forensic Studio

Use

Investigate

Every label should sound like something a real team would ship.

20. The Signature Interaction

This is where DarkVector becomes memorable.

When the user clicks an investigation:

The UI doesn't open a modal.

It transforms.

The workspace smoothly shifts into Investigation Mode:

Sidebar compresses.
Context fades.
The evidence timeline becomes the hero.
Vector focuses on the selected case.
Related assets and telemetry slide into view.

It should feel less like "opening a page" and more like "entering a focused workspace."