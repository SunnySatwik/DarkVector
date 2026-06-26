FRONTEND_IMPLEMENTATION_GUIDE.md

Version 1.0

Internal Frontend Engineering Guide

Philosophy

The frontend should be engineered like a modern SaaS product.

Not like a collection of pages.

The frontend must remain:

scalable
maintainable
predictable
reusable
performant

Every engineering decision should reinforce the Product Bible and Design System.

Engineering Principles
Principle 1

The frontend is a platform.

Not a website.

Everything should be reusable.

Principle 2

Pages are assembled.

Never handcrafted.

Pages should be composed from reusable components.

Principle 3

Business logic never lives inside UI.

UI displays data.

Hooks manage behavior.

Services communicate with APIs.

Principle 4

One responsibility.

One file.

Principle 5

Refactor early.

Never duplicate components.

Technology Stack

Frontend

React 19
Vite
TypeScript
TailwindCSS
shadcn/ui
Framer Motion
React Router
TanStack Query
Lucide Icons
Recharts
Folder Structure
frontend/
│
├── public/
│
├── src/
│
│   ├── app/
│   │
│   ├── assets/
│   │
│   ├── components/
│   │
│   ├── layouts/
│   │
│   ├── pages/
│   │
│   ├── hooks/
│   │
│   ├── services/
│   │
│   ├── contexts/
│   │
│   ├── lib/
│   │
│   ├── styles/
│   │
│   ├── routes/
│   │
│   ├── types/
│   │
│   ├── constants/
│   │
│   ├── utils/
│   │
│   ├── mock/
│   │
│   ├── motion/
│   │
│   ├── theme/
│   │
│   └── App.tsx
│
└── package.json
Component Organization

Never create

components/

Dashboard.tsx

Instead

components/

navigation/

layout/

vector/

investigation/

graph/

reports/

charts/

common/

ui/
Routing

DarkVector uses

Workspace Routing.

/

↓

Overview
/investigate
/graph
/reports
/models
/settings

No nested routing unless necessary.

Layout Architecture

Every page uses

<AppLayout>

↓

<TopBar>

↓

<Sidebar>

↓

<Workspace>

↓

<VectorPanel>

Pages never recreate layouts.

State Management

Use the simplest tool that works.

Local UI

React State

useState()
Shared UI

Context

Examples

Theme

Workspace

Sidebar

Notifications

Server Data

TanStack Query

Never

useEffect(fetch...)
Future Real-time

WebSockets

Only when backend supports streaming.

API Layer

Never fetch directly inside components.

Wrong

fetch("/api/events")

inside component.

Correct

services/

events.ts

↓

hooks/

useEvents.ts

↓

component

Three layers.

Always.

Mock Data Strategy

During Phase 1

Everything uses

mock/

alerts.ts

events.ts

users.ts

reports.ts

Later

Replace

Service Layer

Only.

UI never changes.

Styling

Tailwind

Only.

No CSS files

unless

Global

Fonts

Variables

Theme

Colors never hardcoded.

Use

Theme Tokens

bg-surface

text-primary

border-default

bg-elevated

Never

bg-[#141414]
Motion

Never

animate={{}}

inside pages.

Instead

Create reusable motion presets.

motion/

card.ts

page.ts

sidebar.ts

panel.ts

modal.ts

Reuse.

Icons

Lucide only.

Never mix icon libraries.

Typography

Sentence case.

No ALL CAPS.

Never.

Error Handling

Every API request supports

Loading

Empty

Error

Retry

No blank screens.

Loading Strategy

Prefer

Skeletons.

Avoid

Loading spinners.

Accessibility

Every component

Keyboard

ARIA

Focus

Contrast

Reduced Motion

Performance

Lazy load

Pages

Graphs

Reports

Never

Layout.

Graph Optimization

Graph is expensive.

Load

Only

when

needed.

Charts

Charts never own data.

Props only.

Vector

Vector components never call APIs.

They receive

processed data.

Investigation

Everything investigation-related lives

inside

components/investigation/

No scattered files.

Naming

Components

PascalCase

Hooks

camelCase

Files

PascalCase

Utilities

camelCase

Types

PascalCase

React Principles

Prefer

Composition

Over inheritance.

Prefer

Small

Components.

Maximum

~200 lines

per component.

Cursor Rules

Whenever Cursor creates code

it must

reuse components
follow Design System
follow Motion System
follow Product Bible
never duplicate UI
never hardcode colors
never invent layouts
AI Rules

Whenever an AI edits code

it should

read

docs/

PRODUCT_BIBLE.md

DESIGN_SYSTEM.md

INFORMATION_ARCHITECTURE.md

COMPONENT_LIBRARY.md

MOTION_SYSTEM.md

UX_WRITING_GUIDE.md

before making changes.

Git Philosophy

Every feature

gets

its own branch.

Commits

should describe

intent.

Example

feat: build investigation timeline

refactor: extract reusable metric card

fix: improve graph node animation

style: simplify vector panel typography
Future Backend Integration

UI

↓

Hook

↓

Service

↓

FastAPI

↓

Database

The UI never knows

where data comes from.

Refactoring Rule

Before creating

a new component

ask

Can an existing component solve this?

If yes

reuse.

If no

create

reusable.

Anti-Patterns

Never

800-line page components
API calls inside JSX
Hardcoded colors
Duplicate cards
Inline styles
Anonymous utility functions everywhere
Massive prop chains
Unused components
Success Criteria

A new engineer should be able to:

understand the project in under 30 minutes
locate any component in under 60 seconds
add a new workspace without redesigning anything
replace mock APIs with FastAPI without touching UI
reuse existing components instead of rewriting them

If they can't, the architecture needs improvement.