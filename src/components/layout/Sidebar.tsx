"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Calendar, Timer, BookOpen, TrendingUp, LogOut, GraduationCap } from "lucide-react";
import { SignOutButton } from "@clerk/nextjs";

const routes = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Schedule", icon: Calendar, href: "/schedule" },
  { label: "Timer", icon: Timer, href: "/timer" },
  { label: "Curriculum Hub", icon: BookOpen, href: "/subjects" },
  { label: "Study Hub", icon: GraduationCap, href: "/study-hub" },
  { label: "Progress", icon: TrendingUp, href: "/progress" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-card/50 backdrop-blur-xl border-r border-white/5 text-card-foreground">
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold">S</span>
          <h2 className="text-xl font-bold text-glow tracking-tight text-white">StudyAI</h2>
        </Link>
      </div>
      
      <div className="flex-1 px-4 py-6 space-y-2">
        {routes.map((route) => {
          const isActive = pathname === route.href || pathname.startsWith(`${route.href}/`);
          
          return (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                isActive 
                  ? "bg-primary/20 text-primary font-medium" 
                  : "text-muted-foreground hover:bg-white/5 hover:text-white"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-0 w-1 h-full bg-primary shadow-[0_0_10px_rgba(100,50,255,0.8)]"></div>
              )}
              <route.icon className={cn("h-5 w-5", isActive ? "text-primary" : "group-hover:text-white transition-colors")} />
              {route.label}
            </Link>
          );
        })}
      </div>
      
      <div className="p-4 border-t border-white/5">
        <SignOutButton>
          <button className="flex items-center gap-3 px-3 py-3 rounded-xl w-full text-muted-foreground hover:bg-white/5 hover:text-destructive transition-all">
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
