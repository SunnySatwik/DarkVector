import React from "react";
import { motion, type HTMLMotionProps } from "motion/react";
// Simple class utility if lib/utils is missing or custom
const joinClasses = (...classes: (string | undefined | null | boolean)[]) => {
  return classes.filter(Boolean).join(" ");
};

/* ==========================================================================
   1. PREMIUM CARD WITH SETTLE ANIMATION & SUBTLE HOVER
   ========================================================================== */
interface CardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  delay?: number;
  hoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, delay = 0, hoverable = true, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.28,
          delay,
          ease: [0.16, 1, 0.3, 1], // premium custom cubic-bezier
        }}
        className={joinClasses(
          "bg-surface border border-border-custom/60 rounded-2xl p-4 overflow-hidden relative",
          hoverable && "hover:border-gray-500/20 hover:bg-elevated hover:-translate-y-[2px] hover:shadow-lg hover:shadow-black/40 transition-all duration-150 ease-out",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
Card.displayName = "Card";

/* ==========================================================================
   2. TACTILE BUTTONS
   ========================================================================== */
type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "success"
  | "danger";

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: ButtonVariant;
  size?: "xs" | "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, variant = "secondary", size = "sm", ...props }, ref) => {
    const baseStyle =
      "font-mono font-medium rounded-lg inline-flex items-center justify-center gap-1.5 transition-all duration-120 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.97]";

    const variants = {
      primary:
        "bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/10 border border-blue-500/30",
      secondary:
        "bg-elevated hover:bg-surface border border-border-custom/80 text-gray-300 hover:text-white",
      ghost: "hover:bg-elevated/45 text-gray-400 hover:text-gray-200 border border-transparent",
      danger:
        "bg-red-950/40 hover:bg-red-900/30 border border-red-500/30 text-red-400 hover:text-red-300",
      success:
        "bg-emerald-950/40 hover:bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300",
    };

    const sizes = {
      xs: "text-[10px] px-2 py-1 rounded-md",
      sm: "text-[11px] px-3 py-1.5 rounded-lg",
      md: "text-xs px-4 py-2 rounded-lg",
      lg: "text-sm px-5 py-2.5 rounded-xl",
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        className={joinClasses(baseStyle, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";

/* ==========================================================================
   3. RESTRAINED BADGES & TAGS
   ========================================================================== */
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "critical" | "high" | "medium" | "low" | "success" | "blue" | "purple";
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = "default",
  ...props
}) => {
  const baseStyle =
    "text-[10px] font-sans font-semibold px-1.5 py-0.5 rounded-md border inline-flex items-center select-none";

  const variants = {
    default: "bg-[#161A22] border-[#23262F]/80 text-gray-400",
    critical: "bg-red-500/10 border-red-500/25 text-red-400",
    high: "bg-orange-500/10 border-orange-500/25 text-orange-400",
    medium: "bg-yellow-500/10 border-yellow-500/25 text-yellow-400",
    low: "bg-blue-500/10 border-blue-500/25 text-blue-400",
    success: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400",
    blue: "bg-sky-500/10 border-sky-500/25 text-sky-400",
    purple: "bg-purple-500/10 border-purple-500/25 text-purple-400",
    ghost: "bg-transparent hover:bg-white/5 text-gray-300",
    danger: "bg-red-600 hover:bg-red-700 text-white",
  };

  return (
    <span className={joinClasses(baseStyle, variants[variant], className)} {...props}>
      {children}
    </span>
  );
};

/* ==========================================================================
   4. COHESIVE TABLES
   ========================================================================== */
export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div className="w-full overflow-x-auto">
      <table className={joinClasses("w-full border-collapse text-left", className)} {...props}>
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <thead
      className={joinClasses("border-b border-border-custom/40 bg-black/10", className)}
      {...props}
    >
      {children}
    </thead>
  );
};

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <tr
      className={joinClasses(
        "border-b border-border-custom/30 hover:bg-elevated/20 transition-colors duration-150",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
};

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <th
      className={joinClasses(
        "text-[10px] font-mono font-bold text-gray-500 py-2.5 px-3",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
};

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <td
      className={joinClasses("text-[11px] py-3 px-3 text-gray-300 align-middle", className)}
      {...props}
    >
      {children}
    </td>
  );
};

/* ==========================================================================
   5. PREMIUM TABS (ARC / CURSOR INSPIRED GLIDING INDICATOR)
   ========================================================================== */
interface TabOption {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface TabGroupProps {
  options: TabOption[];
  activeId: string;
  onChange: (id: string) => void;
  layoutId: string;
  className?: string;
}

export const TabGroup: React.FC<TabGroupProps> = ({
  options,
  activeId,
  onChange,
  layoutId,
  className,
}) => {
  return (
    <div
      className={joinClasses(
        "flex p-0.5 bg-black/40 border border-border-custom/60 rounded-lg shrink-0",
        className
      )}
    >
      {options.map((opt) => {
        const isActive = opt.id === activeId;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={joinClasses(
              "flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium rounded-md relative cursor-pointer select-none transition-colors duration-200 focus:outline-none",
              isActive ? "text-gray-100 font-semibold" : "text-gray-500 hover:text-gray-300"
            )}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute inset-0 bg-elevated border border-border-custom/60 rounded-md z-0"
                transition={{ type: "spring", damping: 28, stiffness: 350 }}
              />
            )}
            <span className="flex items-center gap-1.5 relative z-10">
              {Icon && (
                <Icon
                  className={joinClasses(
                    "w-3.5 h-3.5",
                    isActive ? "text-blue-400" : "text-gray-600"
                  )}
                />
              )}
              <span>{opt.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
};

/* ==========================================================================
   6. SLEEK UTILITY HEADER / PANEL CAPTION
   ========================================================================== */
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  action,
  className,
}) => {
  return (
    <div
      className={joinClasses(
        "flex items-center justify-between pb-3 border-b border-border-custom/40 mb-4",
        className
      )}
    >
      <div>
        <h2 className="text-xs font-mono font-bold text-gray-400">
          {title}
        </h2>
        {subtitle && <p className="text-[10px] text-gray-500 mt-0.5 font-sans">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

/* ==========================================================================
   7. PAGE HEADER — h1 + optional subtitle used at the top of every page
   ========================================================================== */
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  action,
  className,
}) => {
  return (
    <div className={joinClasses("flex items-start justify-between", className)}>
      <div>
        <h1 className="text-xl font-display font-bold text-gray-100 tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-1 font-sans">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

/* ==========================================================================
   8. PANEL HEADER — icon + title row inside a card section
   ========================================================================== */
interface PanelHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  iconClassName?: string;
  className?: string;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  icon: Icon,
  title,
  iconClassName,
  className,
}) => {
  return (
    <div
      className={joinClasses(
        "flex items-center gap-2 border-b border-border-custom/40 pb-3 mb-4",
        className
      )}
    >
      <Icon
        className={joinClasses("w-4 h-4 shrink-0", iconClassName ?? "text-blue-400")}
      />
      <h3 className="text-xs font-mono font-semibold text-gray-200">{title}</h3>
    </div>
  );
};

/* ==========================================================================
   9. PREMIUM SHIMMERING SKELETON
   ========================================================================== */
interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  width,
  height,
  circle = false,
}) => {
  return (
    <div
      className={joinClasses(
        "shimmer rounded-md",
        circle ? "rounded-full" : "",
        className
      )}
      style={{
        width: width !== undefined ? width : "100%",
        height: height !== undefined ? height : "1rem",
      }}
    />
  );
};

