"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GanttChart,
  Calendar,
  ListTodo,
  BookOpen,
  TrendingUp,
  Settings,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/timeline", label: "Timeline", icon: GanttChart },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-border md:bg-surface md:shrink-0">
      <div className="px-5 py-5">
        <span className="text-sm font-semibold tracking-tight">Study Planner</span>
      </div>

      <div className="px-3 pb-3">
        <Link
          href="/courses/new"
          className="flex items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
        >
          <Plus size={16} strokeWidth={2.5} />
          Add Course
        </Link>
      </div>

      <nav className="flex-1 px-3 py-1 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-accent/10 text-accent font-medium"
                  : "text-foreground/80 hover:bg-surface-hover hover:text-foreground"
              )}
            >
              <Icon size={17} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
