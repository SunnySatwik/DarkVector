MOTION_SYSTEM.md

Version 1.0

Internal Motion Language & Interaction Specification

Philosophy

Motion exists to communicate.

Never to decorate.

If an animation does not improve understanding, remove it.

Every animation should answer one of these questions:

What changed?
Where did it go?
What's important?
What should I look at next?

DarkVector should feel calm, intelligent and responsive.

Never flashy.

Never distracting.

Motion Personality

DarkVector moves like:

Raycast
Cursor
Arc Browser
Linear

DarkVector never moves like:

Gaming UI
Mobile app demos
Marketing landing pages
Cyberpunk interfaces
Core Principles
1. Motion Has Meaning

Every animation communicates state.

Good:

Sidebar collapses → creates more workspace.

Investigation opens → focus shifts.

Vector updates → new reasoning appears.

Bad:

Cards bounce because they look cool.

2. Fast but Calm

Target feel:

Immediate.

Not instant.

Users should perceive continuity.

Not teleportation.

3. Layered Motion

Elements move according to importance.

Example:

Sidebar
↓

Content

↓

Panel

↓

Button

Not everything animates at once.

4. Preserve Context

Users should always understand

where they came from

and

where they are going.

Nothing should suddenly appear.

Nothing should disappear without explanation.

Timing
Interaction	Duration
Hover	120 ms
Button press	100 ms
Card hover	150 ms
Sidebar collapse	220 ms
Panel transition	250 ms
Modal	220 ms
Page transition	300 ms
Investigation Mode	450 ms
Skeleton fade	180 ms

Consistency matters more than perfection.

Easing

Use only smooth easing.

Preferred:

easeOut
easeInOut

Avoid:

Bounce
Elastic
Back
Overshoot

The product should never feel playful.

Animation Hierarchy

Primary

Workspace transitions

Investigation Mode

Command Palette

Sidebar

Secondary

Panels

Cards

Charts

Dialogs

Tertiary

Buttons

Badges

Icons

Tooltips

The more important the interaction,

the more attention it deserves.

Sidebar

Expand

Width transitions smoothly.
Labels fade in after expansion.
Icons remain fixed.
Never push content abruptly.

Collapse

Labels fade first.
Sidebar compresses.
Content expands naturally.
Workspace Transitions

Changing workspaces should feel like moving between rooms.

Not loading pages.

Sequence:

Current content fades.
Layout shifts.
New content settles.
Vector updates context.
Investigation Mode (Signature Interaction)

This is DarkVector's defining motion.

Trigger:

User selects an investigation.

Sequence:

Background dims slightly.
Sidebar compresses.
Overview widgets fade.
Investigation timeline expands.
Evidence panel slides into view.
Vector switches context.
Focus ring appears around active investigation.

Total duration:

≈ 450 ms

No loading spinner unless data is genuinely unavailable.

Command Palette

Open

Fade
Scale from 98% → 100%
Backdrop blur increases slightly

Close

Fade out
Scale back to 98%

Never fly in from the edge.

Cards

On initial load:

Fade
Slide upward 12 px
Settle

Never pop.

Never bounce.

Hover States

Hover should feel tactile.

Cards:

Slight elevation
Slight border highlight
Tiny shadow increase

Buttons:

Background shifts subtly
No dramatic scaling

Interactive rows:

Soft background tint
Charts

Charts should never redraw abruptly.

Animate:

Line interpolation
Bar growth
Point transitions

Do not animate every refresh.

Animate only when values change meaningfully.

Threat Graph

Nodes:

Fade into existence
Expand naturally

Edges:

Draw progressively

Selection:

Connected nodes brighten
Unrelated nodes dim

Camera:

Smooth pan
Smooth zoom

Never snap.

Vector

Vector should feel alive without being distracting.

When reasoning updates:

Typing indicator (subtle)
New sections fade in
Confidence meter animates
Evidence cards appear sequentially

Never simulate long typing for dramatic effect.

Prioritize speed.

Loading States

Always prefer skeletons.

Never show blank screens.

Skeletons should shimmer gently.

Not pulse aggressively.

Empty States

Fade into view.

Include:

Friendly illustration or icon
Clear explanation
Primary action

Never show

"No Data"

alone.

Notifications

Slide down gently.

Disappear automatically.

Never cover important investigation content.

Critical notifications require user dismissal.

Focus

Keyboard navigation should feel premium.

Focus rings:

Thin
Blue accent
Soft outer glow

Never use browser defaults.

Microinteractions

Examples:

Copy IP → checkmark appears.

Report generated → button transforms into success state.

Alert acknowledged → card subtly compresses then fades.

Filters applied → count animates.

Small details create delight.

Motion Budget

Never animate more than:

3 large elements
5 cards
1 panel

at the same time.

If everything moves,

nothing feels important.

Performance Rules

Maintain 60 FPS.

Prefer transforms over layout changes.

Use GPU-friendly animations.

Respect reduced-motion preferences.

Never sacrifice responsiveness for aesthetics.

Accessibility

Support prefers-reduced-motion.

When enabled:

Remove non-essential animations.
Keep transitions short.
Preserve state changes without motion.

Accessibility is a feature.

Motion Anti-Patterns

Never use:

Bounce
Infinite floating
Constant pulsing
Flashing alerts
Screen shakes
Spinning icons
Random particle effects
Animated backgrounds

Motion should never become visual noise.

Motion Checklist

Before shipping an interaction, ask:

Does this explain something?
Does it preserve context?
Is it subtle?
Is it fast?
Does it feel calm?
Would Raycast ship this?

If the answer is "no",

remove or redesign it.

Signature Experience

The interaction users should remember:

Clicking an investigation doesn't "open a page." It smoothly transforms the entire workspace into Focus Mode, where everything unrelated fades away and the investigation becomes the center of attention. It should feel like entering a state of deep work rather than navigating to another screen.

That is the interaction people will remember when they close DarkVector.