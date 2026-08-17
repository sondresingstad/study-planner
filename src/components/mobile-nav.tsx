"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, GanttChart, Calendar, ListTodo, BookOpen, TrendingUp, Settings } from "lucide-react";
import { cn } from "@/lib/cn";

const NAV_ITEMS = [
  { href: "/", label: "Today", icon: LayoutDashboard },
  { href: "/timeline", label: "Timeline", icon: GanttChart },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden sticky top-0 z-10 flex items-center gap-1 overflow-x-auto border-b border-border bg-surface px-2 py-2">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm",
              active ? "bg-accent/10 text-accent font-medium" : "text-foreground/80"
            )}
          >
            <Icon size={15} strokeWidth={2} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
