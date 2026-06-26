COMPONENT_LIBRARY.md

Version 1.0

Internal Frontend Component Specification

Philosophy

DarkVector should never become a collection of random React components.

Every component belongs to a family.

Every component solves exactly one problem.

Every component should be composable.

If a component grows beyond one responsibility, split it.

Component Hierarchy
Application
        │
        ▼
Layouts
        │
        ▼
Workspaces
        │
        ▼
Sections
        │
        ▼
Components
        │
        ▼
Primitives

Never skip layers.

Folder Structure
components/

ui/
layout/
navigation/
cards/
investigation/
graph/
vector/
reports/
charts/
feedback/
common/

No dumping everything into one folder.

1. UI Primitives

These are the building blocks.

Button

IconButton

Input

SearchBar

Badge

Chip

Tag

Avatar

Tooltip

Divider

Spinner

Skeleton

Modal

Drawer

Tabs

Accordion

Dropdown

Toast

ProgressBar

Rules

Completely generic
Never contain business logic
Reusable everywhere
2. Layout Components

Responsible only for structure.

AppLayout

WorkspaceLayout

Sidebar

TopBar

PageContainer

ContentGrid

Panel

ResizablePanel

SectionHeader

Never fetch data.

Never know about investigations.

3. Navigation Components
SidebarItem

SidebarSection

WorkspaceSwitcher

Breadcrumb

CommandPalette

QuickActions

SearchOverlay

NotificationsMenu

ProfileMenu

Navigation should never contain business logic.

4. Dashboard Components

(Mission Control)

OverviewCard

ActivityFeed

QuickActionCard

ThreatLevelCard

InvestigationPreview

RecommendationCard

MetricCard

These are summary components.

Never show deep information.

5. Investigation Components

The heart of DarkVector.

InvestigationHeader

EvidenceTimeline

EvidenceCard

AlertCard

LogViewer

HostInformation

AttackChain

ProcessTree

TelemetryStream

RelatedAssets

AnalystNotes

ActionPanel

Everything here should support investigation.

No unnecessary decoration.

6. Vector Components

The most important family.

Everything AI belongs here.

VectorPanel

VectorSummary

VectorReasoning

EvidenceSummary

ConfidenceMeter

RecommendationList

CitationList

FollowUpQuestions

SuggestedActions

VectorStatus

TypingIndicator

Vector components should never look like ChatGPT.

They should look like analysis tools.

7. Graph Components
ThreatGraph

GraphNode

GraphEdge

RelationshipCard

NodeInspector

MiniMap

GraphToolbar

Filters

Graph always remains the visual hero.

Supporting UI stays minimal.

8. Report Components
ReportPreview

ExecutiveSummary

TimelineExport

EvidenceTable

RecommendationSection

PDFToolbar

ReportHeader

Reports should feel like documents.

Not dashboards.

9. Charts

Charts answer questions.

Never display data for decoration.

RiskDistribution

TimelineChart

AlertTrend

ModelPerformance

ThreatMap

SeverityBreakdown

Every chart must have one purpose.

10. Feedback Components
LoadingState

EmptyState

ErrorState

OfflineBanner

SuccessBanner

StatusIndicator

Feedback should always explain what is happening.

11. Shared Components
Timestamp

RiskBadge

SeverityBadge

UserChip

HostChip

IPAddress

StatusDot

CopyButton

FavoriteButton

These become heavily reused.

Component Rules

Every component should satisfy these principles.

Single Responsibility

Good

RiskBadge

Bad

RiskBadgeWithTooltipAndPopoverAndAnalytics
Composable

Instead of

ThreatInvestigationPanel

compose

Panel

↓

Header

↓

Timeline

↓

Evidence

↓

Vector
Stateless when possible

Business logic belongs in

hooks/

services/

contexts/

Not inside UI.

Accessible

Every component must support

keyboard navigation
focus states
screen readers

Accessibility is built-in.

Not added later.

Design Rules

Every component should have

Hover

Focus

Loading

Empty

Error

Disabled

Selected

Active

states.

Never design only the happy path.

Naming Convention

Avoid

CoolCard

FancyPanel

CyberWidget

Instead

EvidenceCard

Timeline

VectorPanel

RiskBadge

AlertCard

Names describe purpose.

Not appearance.

Props Philosophy

Components should accept data.

Not fetch data.

Example

Good

<InvestigationCard investigation={investigation} />

Bad

<InvestigationCard />

that internally fetches APIs.

Animation Rules

Components should never invent animations.

All animations come from

Motion System.

This keeps the experience consistent.

Component States

Every component should be designed for

Loading

Empty

Partial

Complete

Error

before implementation.

What We Never Build

Never create

DashboardCard1

DashboardCard2

DashboardCard3

Never create

Widget

Widget2

WidgetNew

Never duplicate components.

Refactor instead.

Growth Strategy

Whenever a new feature is added,

first ask

Can an existing component solve this?

If yes,

reuse it.

If no,

create a new reusable component.

Never create feature-specific UI without considering reuse.

Quality Checklist

Before merging a new component, verify:

One clear responsibility
Reusable outside current page
Uses design tokens
Supports loading/empty/error states
Accessible
Responsive
Follows typography system
Uses approved colors
Uses approved spacing
Uses Motion System
No duplicated functionality
Component Relationships
AppLayout
│
├── Sidebar
├── TopBar
├── WorkspaceLayout
│   ├── SectionHeader
│   ├── OverviewCard
│   ├── InvestigationCard
│   ├── ThreatGraph
│   ├── EvidenceTimeline
│   └── VectorPanel
│
└── CommandPalette

This should remain stable even as new features are added.

Future Components (Reserved)

These are intentionally not part of v1, but we reserve names so the design language stays consistent later.

CaseComparison

ThreatReplay

AttackSimulation

PlaybookRunner

KnowledgeExplorer

PromptHistory

ModelInspector

EvidenceDiff

SessionReplay
Component Philosophy

DarkVector should feel like LEGO, not concrete.

Every feature should be assembled from small, reusable, predictable components rather than giant page-specific widgets. If we build it this way, Cursor will naturally generate cleaner code, refactors will be easier, and the UI will stay consistent as the project grows.