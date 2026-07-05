"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, SkipForward, Save, CheckCircle2 } from "lucide-react";
import { logStudySession } from "@/app/actions";
import { cn } from "@/lib/utils";

interface Subject {
  id: string;
  name: string;
  color: string;
}

interface TimerViewProps {
  subjects: Subject[];
}

export function TimerView({ subjects }: TimerViewProps) {
  const [mode, setMode] = useState<"work" | "break" | "custom">("work");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("general");
  
  // Custom Time Setup State
  const [inputHours, setInputHours] = useState("0");
  const [inputMinutes, setInputMinutes] = useState("25");
  const [inputSeconds, setInputSeconds] = useState("0");

  const [customDuration, setCustomDuration] = useState(25 * 60); // default 25 mins in seconds
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionLogged, setSessionLogged] = useState(false);

  const [, startTransition] = useTransition();

  const handleTimerExpiry = useCallback(() => {
    // Only log if it was a work or custom session (breaks shouldn't count for study XP)
    if (mode === "work" || mode === "custom") {
      const minutesStudied = Math.max(1, Math.round(customDuration / 60));
      const chosenSubjectId = selectedSubjectId === "general" ? null : selectedSubjectId;

      startTransition(async () => {
        try {
          await logStudySession({
            subjectId: chosenSubjectId,
            durationMin: minutesStudied,
            notes: `Completed ${mode === "work" ? "Pomodoro" : "Custom"} Study session`,
          });
          setSessionLogged(true);
          // Play a slight audio notification if possible
          if (typeof window !== "undefined") {
            try {
              const audioCtx = new (window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
              const oscillator = audioCtx.createOscillator();
              const gainNode = audioCtx.createGain();
              oscillator.connect(gainNode);
              gainNode.connect(audioCtx.destination);
              oscillator.type = "sine";
              oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
              gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
              oscillator.start();
              oscillator.stop(audioCtx.currentTime + 0.3);
            } catch {
              console.log("Audio not allowed / failed to play");
            }
          }
        } catch (err) {
          console.error("Failed to log study session", err);
        }
      });
    }
  }, [mode, customDuration, selectedSubjectId, startTransition]);

  // Tick effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setTimeout(() => {
        setIsActive(false);
        handleTimerExpiry();
      }, 0);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, handleTimerExpiry]);

  // Sync default mode times
  const setTimerMode = (newMode: "work" | "break" | "custom") => {
    setMode(newMode);
    setIsActive(false);
    setSessionLogged(false);

    if (newMode === "work") {
      setCustomDuration(25 * 60);
      setTimeLeft(25 * 60);
    } else if (newMode === "break") {
      setCustomDuration(5 * 60);
      setTimeLeft(5 * 60);
    } else {
      applyCustomTime();
    }
  };

  const applyCustomTime = () => {
    const hrs = parseInt(inputHours) || 0;
    const mins = parseInt(inputMinutes) || 0;
    const secs = parseInt(inputSeconds) || 0;
    const totalSecs = hrs * 3600 + mins * 60 + secs;

    if (totalSecs > 0) {
      setCustomDuration(totalSecs);
      setTimeLeft(totalSecs);
      setIsActive(false);
      setSessionLogged(false);
    }
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
    setSessionLogged(false);
  };
  
  const resetTimer = () => {
    setIsActive(false);
    setSessionLogged(false);
    setTimeLeft(customDuration);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = ((customDuration - timeLeft) / customDuration) * 100;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="text-center mb-6 mt-4">
        <h1 className="text-4xl font-bold tracking-tight mb-2 text-white text-glow">Focus Timer</h1>
        <p className="text-muted-foreground">Customize your study intervals and track sessions automatically.</p>
      </div>

      <div className="flex justify-center gap-4">
        <button 
          onClick={() => setTimerMode("work")}
          className={cn(
            "px-6 py-2 rounded-full font-medium transition-all",
            mode === "work" 
              ? "bg-primary text-white shadow-[0_0_20px_rgba(100,50,255,0.5)]" 
              : "bg-white/5 text-muted-foreground hover:bg-white/10"
          )}
        >
          Work Presets
        </button>
        <button 
          onClick={() => setTimerMode("break")}
          className={cn(
            "px-6 py-2 rounded-full font-medium transition-all",
            mode === "break" 
              ? "bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.5)]" 
              : "bg-white/5 text-muted-foreground hover:bg-white/10"
          )}
        >
          Short Break
        </button>
        <button 
          onClick={() => setTimerMode("custom")}
          className={cn(
            "px-6 py-2 rounded-full font-medium transition-all",
            mode === "custom" 
              ? "bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.5)]" 
              : "bg-white/5 text-muted-foreground hover:bg-white/10"
          )}
        >
          Custom Time
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left column: Setup parameters */}
        <div className="md:col-span-1 space-y-4">
          <Card className="glass border-white/5 shadow-none p-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Timer Setup</h3>
            
            {/* Subject Selector */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground font-semibold">Subject Association</label>
              <select
                value={selectedSubjectId}
                disabled={isActive}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary text-xs"
              >
                <option value="general">General Focus</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Input controls if custom mode */}
            {mode === "custom" && (
              <div className="space-y-3 pt-2">
                <label className="text-xs text-muted-foreground font-semibold">Custom Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={inputHours}
                      disabled={isActive}
                      onChange={(e) => setInputHours(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-xl bg-white/5 border border-white/10 text-center text-white text-xs"
                    />
                    <span className="text-[10px] text-muted-foreground mt-1 block">Hours</span>
                  </div>
                  <div className="text-center">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={inputMinutes}
                      disabled={isActive}
                      onChange={(e) => setInputMinutes(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-xl bg-white/5 border border-white/10 text-center text-white text-xs"
                    />
                    <span className="text-[10px] text-muted-foreground mt-1 block">Mins</span>
                  </div>
                  <div className="text-center">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={inputSeconds}
                      disabled={isActive}
                      onChange={(e) => setInputSeconds(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-xl bg-white/5 border border-white/10 text-center text-white text-xs"
                    />
                    <span className="text-[10px] text-muted-foreground mt-1 block">Secs</span>
                  </div>
                </div>
                <Button 
                  onClick={applyCustomTime}
                  disabled={isActive}
                  size="sm"
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-medium border-0"
                >
                  <Save className="w-3.5 h-3.5 mr-1" /> Apply Duration
                </Button>
              </div>
            )}
          </Card>
        </div>

        {/* Right column: Interactive Timer Ring */}
        <div className="md:col-span-2">
          <Card className="glass border-white/5 shadow-none p-10 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Glow behind timer */}
            <div className={cn(
              "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[80px] -z-10 transition-colors duration-1000",
              mode === "work" && "bg-primary/20",
              mode === "break" && "bg-green-500/20",
              mode === "custom" && "bg-orange-500/20"
            )}></div>

            <div className="relative w-72 h-72 flex items-center justify-center">
              {/* SVG Progress Circle */}
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle 
                  cx="144" cy="144" r="130" 
                  className="stroke-white/10 fill-none" 
                  strokeWidth="5" 
                />
                <circle 
                  cx="144" cy="144" r="130" 
                  className={cn(
                    "fill-none transition-all duration-1000 ease-linear",
                    mode === "work" && "stroke-primary",
                    mode === "break" && "stroke-green-500",
                    mode === "custom" && "stroke-orange-500"
                  )} 
                  strokeWidth="5" 
                  strokeDasharray="816" 
                  strokeDashoffset={816 - (816 * progress) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="text-5xl font-mono font-bold tracking-tighter text-white drop-shadow-lg">
                {formatTime(timeLeft)}
              </div>
            </div>

            <div className="flex items-center gap-6 mt-8">
              <Button variant="outline" size="icon" className="h-12 w-12 rounded-full bg-white/5 border-white/10 hover:bg-white/10 text-white" onClick={resetTimer}>
                <RotateCcw className="h-5 w-5" />
              </Button>
              <Button 
                size="icon" 
                className={cn(
                  "h-16 w-16 rounded-full text-white shadow-[0_0_20px_rgba(0,0,0,0.5)] hover:scale-105 transition-transform border-0",
                  mode === "work" && "bg-primary hover:bg-primary/90",
                  mode === "break" && "bg-green-500 hover:bg-green-600",
                  mode === "custom" && "bg-orange-500 hover:bg-orange-600"
                )} 
                onClick={toggleTimer}
              >
                {isActive ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current ml-1" />}
              </Button>
              <Button variant="outline" size="icon" className="h-12 w-12 rounded-full bg-white/5 border-white/10 hover:bg-white/10 text-white" onClick={() => setTimeLeft(0)}>
                <SkipForward className="h-5 w-5" />
              </Button>
            </div>

            {sessionLogged && (
              <div className="mt-6 flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" /> Study Session logged successfully!
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
