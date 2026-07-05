"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Award, Flame, Lock, Check } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from "@/lib/utils";

interface ProgressViewProps {
  chartData: { name: string; hours: number }[];
  totalHours: string;
  weeklyDiff: string;
  streak: number;
  badges: {
    id: string;
    title: string;
    description: string;
    unlocked: boolean;
    type: "bronze" | "silver" | "gold" | "deep" | "early" | "night";
  }[];
}

export function ProgressView({ chartData, totalHours, weeklyDiff, streak, badges }: ProgressViewProps) {
  const getBadgeStyle = (type: string, unlocked: boolean) => {
    if (!unlocked) return "bg-zinc-900/40 text-muted-foreground border-white/5 opacity-50";

    switch (type) {
      case "bronze":
        return "bg-amber-700/10 text-amber-500 border-amber-500/20 shadow-[0_0_15px_rgba(180,83,9,0.15)]";
      case "silver":
        return "bg-slate-400/10 text-slate-300 border-slate-300/20 shadow-[0_0_15px_rgba(203,213,225,0.15)]";
      case "gold":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-400/20 shadow-[0_0_15px_rgba(234,179,8,0.2)]";
      case "deep":
        return "bg-primary/10 text-primary border-primary/20 shadow-[0_0_15px_rgba(100,50,255,0.2)]";
      case "early":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.2)]";
      case "night":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]";
      default:
        return "bg-green-500/10 text-green-400 border-green-500/20";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white text-glow">Progress & Milestones</h1>
          <p className="text-muted-foreground">Review your statistics and collect milestone badges.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Weekly Chart */}
        <Card className="glass shadow-none border-white/5 md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">Study Hours (Last 7 Days)</CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" tick={{fill: 'rgba(255,255,255,0.5)', fontSize: 12}} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(20,20,20,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="hours" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Dynamic Stats Cards */}
        <div className="space-y-6">
          <Card className="glass shadow-none border-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">All-Time Study Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-white text-glow flex items-baseline gap-1.5">
                {totalHours}
                <span className="text-lg font-normal text-muted-foreground">hours</span>
              </div>
              <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                {weeklyDiff}
              </p>
            </CardContent>
          </Card>
          
          <Card className="glass shadow-none border-white/5 bg-primary/10 border-primary/20">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                <Flame className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">{streak} Day Streak</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                  {streak > 0 
                    ? `You've studied ${streak} days in a row! Keep it burning!` 
                    : "Study today using the focus timer to start your daily streak."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Badges Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" /> Unlocked Milestones
        </h3>
        
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {badges.map((badge) => (
            <Card 
              key={badge.id} 
              className={cn(
                "glass transition-all border p-5 flex flex-col justify-between relative overflow-hidden",
                getBadgeStyle(badge.type, badge.unlocked)
              )}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
                    {badge.title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed pr-6">
                    {badge.description}
                  </p>
                </div>
                
                <div className="shrink-0 p-1">
                  {badge.unlocked ? (
                    <div className="p-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <div className="p-1 rounded-full bg-white/5 border border-white/10 text-muted-foreground">
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-4 flex items-center justify-between text-[10px]">
                <span className="font-semibold uppercase tracking-wider opacity-60">
                  {badge.type.includes("streak") ? "Streak Goal" : "Focus Goal"}
                </span>
                <span className={cn(
                  "font-bold",
                  badge.unlocked ? "text-white" : "text-muted-foreground"
                )}>
                  {badge.unlocked ? "UNLOCKED" : "LOCKED"}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
