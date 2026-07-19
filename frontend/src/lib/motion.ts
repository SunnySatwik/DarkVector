/**
 * Motion Design Tokens & Primitives
 *
 * Centralized easing, spring configurations, durations, and animation presets
 * to ensure visual consistency across the entire DarkVector application.
 */

export const DURATIONS = {
  instant: 0.05,
  fast: 0.12,
  standard: 0.22,
  slow: 0.35,
  expand: 0.45,
};

export const EASINGS = {
  // Premium custom bezier matching high-end design systems
  emphasized: [0.16, 1, 0.3, 1] as [number, number, number, number],
  decelerate: [0.05, 0.7, 0.1, 1] as [number, number, number, number],
  accelerate: [0.3, 0, 0.8, 0.15] as [number, number, number, number],
  easeInOut: "easeInOut" as const,
  easeOut: "easeOut" as const,
};

export const SPRINGS = {
  // Soft layout changes, sidebar collapse
  gentle: {
    type: "spring" as const,
    stiffness: 220,
    damping: 24,
    mass: 1,
  },
  // Bouncy settings for interactive objects, graph nodes
  bouncy: {
    type: "spring" as const,
    stiffness: 260,
    damping: 18,
    mass: 0.85,
  },
  // Snappy focus, tooltips, selection highlights
  snappy: {
    type: "spring" as const,
    stiffness: 380,
    damping: 30,
    mass: 0.6,
  },
  // Graph construction settling
  graphSettling: {
    type: "spring" as const,
    stiffness: 140,
    damping: 15,
    mass: 0.7,
  },
  // Dialogs, modals, expanded panels — elevated entry feel
  dialog: {
    type: "spring" as const,
    stiffness: 420,
    damping: 34,
    mass: 0.7,
  },
  // Timeline expansion — gentle unfold
  unfold: {
    type: "spring" as const,
    stiffness: 180,
    damping: 22,
    mass: 0.9,
  },
  // Evidence inspector side panel
  panel: {
    type: "spring" as const,
    stiffness: 280,
    damping: 28,
    mass: 0.8,
  },
};

// ─── Reusable Framer Motion presets ──────────────────────────────────────────

export const fadeUp = (delay = 0, distance = 8) => ({
  initial: { opacity: 0, y: distance },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -distance / 2 },
  transition: { duration: DURATIONS.standard, ease: EASINGS.emphasized, delay },
});

export const fadeRight = (delay = 0, distance = 8) => ({
  initial: { opacity: 0, x: -distance },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: distance / 2 },
  transition: { duration: DURATIONS.standard, ease: EASINGS.emphasized, delay },
});

export const scaleIn = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.97 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.97 },
  transition: { duration: DURATIONS.standard, ease: EASINGS.easeOut, delay },
});

export const staggerContainer = (staggerDelay = 0.04) => ({
  animate: {
    transition: {
      staggerChildren: staggerDelay,
    },
  },
});

/**
 * Dialog reveal — coordinate 3-phase entry.
 * Use with AnimatePresence on the outer wrapper.
 */
export const dialogReveal = (prefersReducedMotion = false) =>
  prefersReducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: DURATIONS.fast },
      }
    : {
        initial: { opacity: 0, y: 14, scale: 0.97 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 8, scale: 0.98 },
        transition: SPRINGS.dialog,
      };

/**
 * Workspace slide — entering from right, lighter than dialog.
 * Reduced compared to before: short x offset, quick opacity.
 */
export const workspaceSlide = (prefersReducedMotion = false) =>
  prefersReducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: DURATIONS.fast },
      }
    : {
        initial: { opacity: 0, x: 5 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -4 },
        transition: { duration: DURATIONS.standard, ease: EASINGS.emphasized },
      };

/**
 * Timeline item unfold — used for investigaton event items.
 */
export const timelineItem = (delay = 0) => ({
  initial: { opacity: 0, x: -6, height: 0 },
  animate: { opacity: 1, x: 0, height: "auto" },
  exit: { opacity: 0, x: -4, height: 0 },
  transition: { ...SPRINGS.unfold, delay },
});

export type Easing = typeof EASINGS[keyof typeof EASINGS];
export type Spring = typeof SPRINGS[keyof typeof SPRINGS];
