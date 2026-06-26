INFORMATION_ARCHITECTURE.md

Version 1.0

DarkVector User Journey

The user never thinks about pages.

The user thinks about work.

DarkVector is organized around workspaces, each supporting a stage of the investigation lifecycle.

Mission Control
        │
        ▼
Choose Investigation
        │
        ▼
Investigation Workspace
        │
        ▼
Evidence Analysis
        │
        ▼
AI Reasoning (Vector)
        │
        ▼
Analyst Decision
        │
        ▼
Incident Report
Primary Navigation

The application contains only six top-level workspaces.

Overview

Investigate

Graph

Reports

Models

Settings

No more.

If a new feature doesn't fit under one of these, we question whether it belongs.

Workspace Philosophy
1. Overview (Mission Control)

Purpose:

Provide immediate awareness.

Questions answered:

What needs attention?
What changed?
What should I investigate?

This is not a dashboard full of metrics.

It is a launchpad for investigations.

Key content:

Active investigations
Critical alerts
Recent activity
Threat level
Suggested next action
Continue previous investigation
2. Investigate (Flagship)

Purpose:

Deep investigation.

This is the heart of DarkVector.

The layout transforms into a focused investigation environment.

Key sections:

Evidence timeline
Event stream
AI reasoning (Vector)
SHAP explanation
Related assets
Analyst notes
Actions

No KPI cards.

Everything supports understanding.

3. Graph

Purpose:

Relationship exploration.

Displays connections between:

Users
Devices
IPs
Processes
Alerts

Supports filtering, zooming, and contextual details.

4. Reports

Purpose:

Communicate findings.

Generate and review incident reports.

Includes:

Executive summary
Timeline
Evidence
AI summary
Recommendations

Reports should feel like professional documents, not dashboards.

5. Models

Purpose:

Transparency.

Displays ML system status.

Not for data scientists.

For analysts.

Includes:

Isolation Forest status
Dataset information
Model version
SHAP insights
Detection metrics
6. Settings

Purpose:

Application preferences.

Simple.

No unnecessary complexity.

Global Features

These are available from every workspace.

Sidebar

Top Navigation

Search

Command Palette

Notifications

Vector Panel

Profile

Theme

Workspace Switcher
Sidebar Rules

Sidebar is always visible.

Except

Investigation Focus Mode

where it compresses.

The sidebar should never dominate the interface.

Top Navigation

Contains only

Search

Workspace

Notifications

Profile

Nothing else.

Avoid toolbar clutter.

Vector Panel

Vector is globally available.

It is never hidden behind menus.

The panel adapts to the current workspace.

Examples:

Overview

↓

Summary

Investigate

↓

Evidence

Graph

↓

Relationship explanation

Reports

↓

Executive summary

The AI always understands context.

Focus Mode

DarkVector's signature interaction.

Entering an investigation activates Focus Mode.

Changes include:

Sidebar compresses
Secondary content fades
Investigation becomes dominant
Vector updates context automatically
Related panels slide into place

No page reload.

No popup.

Just transformation.

Navigation Rules

Every interaction should reduce cognitive load.

Avoid:

Deep menu trees
Nested sidebars
Multi-step navigation

Target:

Maximum two clicks to reach any major feature.

Search Philosophy

Search is not for finding pages.

Search is for finding knowledge.

Examples:

Show failed logins

Open Case #42

Investigate Alice

Explain anomaly

Generate report

Search becomes more powerful as backend capabilities grow.

Empty States

Every empty screen should teach the user.

Instead of:

No investigations

Show:

No active investigations.

Vector has not detected any anomalous behavior in the last 24 hours.

Provide a clear next action.

Success Criteria

A new user should be able to:

Understand the product in under 60 seconds.
Begin an investigation within two clicks.
Never feel lost within the navigation hierarchy.
Recognize the current workspace instantly.
Know what action to take next without reading documentation.