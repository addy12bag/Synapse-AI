import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, Clock, BarChart } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative background blurs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] -z-10"></div>

      <div className="max-w-3xl text-center space-y-8 glass p-12 rounded-3xl border border-white/10 relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-muted-foreground mb-4">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          StudyAI — Intelligent Learning Platform
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white drop-shadow-2xl">
          Master Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400 text-glow">Learning</span>
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Replace scattered notes and generic schedules with one intelligent study companion. Generate AI schedules, track progress, and focus with Pomodoro timers.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link href="/sign-in">
            <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_40px_-10px_rgba(100,50,255,0.8)] transition-all hover:scale-105 border-0">
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 mt-12 border-t border-white/10 text-left">
          <div className="space-y-2">
            <Brain className="h-8 w-8 text-primary" />
            <h3 className="font-semibold text-white">Smart Schedules</h3>
            <p className="text-sm text-muted-foreground">AI-generated study plans tailored to your goals.</p>
          </div>
          <div className="space-y-2">
            <Clock className="h-8 w-8 text-blue-400" />
            <h3 className="font-semibold text-white">Focus Timers</h3>
            <p className="text-sm text-muted-foreground">Built-in Pomodoro to maximize your productivity.</p>
          </div>
          <div className="space-y-2">
            <BarChart className="h-8 w-8 text-purple-400" />
            <h3 className="font-semibold text-white">Progress Tracking</h3>
            <p className="text-sm text-muted-foreground">Visualize your hard work with beautiful charts.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
