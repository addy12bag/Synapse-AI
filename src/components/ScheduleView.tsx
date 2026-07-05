"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar as CalendarIcon, Sparkles, Plus, CheckCircle2, Circle, Clock, Trash2 } from "lucide-react";
import { addScheduleSlot, toggleScheduleSlot, generateSchedule, deleteScheduleSlot } from "@/app/actions";
import { cn } from "@/lib/utils";
import { useSearchParams, useRouter } from "next/navigation";

interface Subject {
  id: string;
  name: string;
  color: string;
}

interface ScheduleSlot {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  isCompleted: boolean;
  isAIGenerated: boolean;
  subjectId: string | null;
  subject?: Subject | null;
}

interface ScheduleViewProps {
  initialSlots: ScheduleSlot[];
  subjects: Subject[];
}

export function ScheduleView({ initialSlots, subjects }: ScheduleViewProps) {
  const [slots, setSlots] = useState<ScheduleSlot[]>(initialSlots);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Manual Add Form State
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState<string>("general");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");

  const [isPending, startTransition] = useTransition();

  const handleAutoGenerate = useCallback(async () => {
    if (subjects.length === 0) {
      alert("Please catalog at least one subject in your Curriculum Hub before generating a plan!");
      return;
    }

    startTransition(async () => {
      try {
        const res = await generateSchedule();
        if (res.error) {
          alert(res.error);
          return;
        }
        
        // Refresh schedule page to fetch newly generated blocks from server
        window.location.reload();
      } catch (err) {
        console.error("Failed to generate schedule", err);
      }
    });
  }, [subjects, startTransition]);

  // Auto-generate if query parameter ?generate=true is present
  useEffect(() => {
    if (searchParams.get("generate") === "true") {
      // Clear URL parameter first
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete("generate");
      router.replace(`/schedule?${newParams.toString()}`);
      
      // Trigger auto-schedule
      handleAutoGenerate();
    }
  }, [searchParams, router, handleAutoGenerate]);

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    const chosenSubjectId = subjectId === "general" ? null : subjectId;

    startTransition(async () => {
      try {
        const newSlot = await addScheduleSlot({
          title,
          subjectId: chosenSubjectId,
          date,
          startTime,
          endTime,
        });

        // Match local subject relationship for UI rendering
        const localSubject = subjects.find(s => s.id === chosenSubjectId) || null;
        
        setSlots(prev => [
          ...prev, 
          { 
            ...newSlot, 
            date: new Date(date),
            subject: localSubject 
          } as ScheduleSlot
        ].sort((a, b) => {
          const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
          if (dateDiff !== 0) return dateDiff;
          return a.startTime.localeCompare(b.startTime);
        }));

        setTitle("");
        setSubjectId("general");
        setIsAddOpen(false);
      } catch (err) {
        console.error("Failed to add slot", err);
      }
    });
  };

  const handleToggleCompleted = async (id: string, currentCompleted: boolean) => {
    const nextCompleted = !currentCompleted;
    
    // Optimistic Update
    setSlots(prev => prev.map(s => s.id === id ? { ...s, isCompleted: nextCompleted } : s));

    startTransition(async () => {
      try {
        await toggleScheduleSlot(id, nextCompleted);
      } catch (err) {
        console.error("Failed to update slot status", err);
        // Revert
        setSlots(prev => prev.map(s => s.id === id ? { ...s, isCompleted: currentCompleted } : s));
      }
    });
  };

  const handleDeleteSlot = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggling completed status when clicking delete
    if (!confirm("Are you sure you want to delete this study task?")) return;

    startTransition(async () => {
      try {
        await deleteScheduleSlot(id);
        setSlots(prev => prev.filter(s => s.id !== id));
      } catch (err) {
        console.error("Failed to delete slot", err);
      }
    });
  };

  // Group slots by day
  const groupedSlots = slots.reduce((groups: { [key: string]: ScheduleSlot[] }, slot) => {
    const dateStr = new Date(slot.date).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    if (!groups[dateStr]) {
      groups[dateStr] = [];
    }
    groups[dateStr].push(slot);
    return groups;
  }, {});

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white text-glow">Smart Schedule</h1>
          <p className="text-muted-foreground">Manage your studies day-by-day or auto-schedule with AI.</p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => setIsAddOpen(true)}
            variant="outline"
            className="border-white/10 text-white hover:bg-white/5 rounded-full text-xs font-semibold px-4 py-2"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Manual Slot
          </Button>
          <Button 
            onClick={handleAutoGenerate}
            disabled={isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-[0_0_20px_rgba(37,99,235,0.5)] border-0 text-xs font-semibold px-4 py-2"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> {isPending ? "Planning..." : "Generate AI Plan"}
          </Button>
        </div>
      </div>

      {slots.length === 0 ? (
        <Card className="glass border-white/5 shadow-none flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4 flex flex-col items-center p-8">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center animate-pulse">
              <CalendarIcon className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Your study calendar is empty</h3>
            <p className="text-muted-foreground max-w-sm text-sm">
              Either add a manual study session or click &quot;Generate AI Plan&quot; to let the algorithm construct a weekly plan for you.
            </p>
            <div className="flex gap-3 pt-4">
              <Button onClick={() => setIsAddOpen(true)} variant="outline" className="rounded-full">
                Add Manual Task
              </Button>
              <Button onClick={handleAutoGenerate} className="bg-blue-600 hover:bg-blue-700 rounded-full border-0 text-white">
                Generate Plan
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-8 max-w-4xl mx-auto">
          {Object.entries(groupedSlots).map(([dayStr, daySlots]) => (
            <div key={dayStr} className="space-y-4">
              <h3 className="text-sm font-bold text-primary tracking-wider uppercase border-l-2 border-primary pl-3">
                {dayStr}
              </h3>
              
              <div className="grid gap-3">
                {daySlots
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((slot) => (
                    <div 
                      key={slot.id}
                      onClick={() => handleToggleCompleted(slot.id, slot.isCompleted)}
                      className={cn(
                        "glass border border-white/5 hover:border-white/10 hover:bg-white/5 transition-all p-4 rounded-2xl flex items-center justify-between cursor-pointer group",
                        slot.isCompleted && "opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <button className="focus:outline-none shrink-0 p-1">
                          {slot.isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-green-400" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground group-hover:text-white transition-colors" />
                          )}
                        </button>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span 
                              className={cn(
                                "text-sm font-semibold text-white",
                                slot.isCompleted && "line-through text-muted-foreground"
                              )}
                            >
                              {slot.title}
                            </span>
                            {slot.isAIGenerated && (
                              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                <Sparkles className="w-2.5 h-2.5" /> AI
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" /> {slot.startTime} - {slot.endTime}
                            </span>
                            {slot.subject && (
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: slot.subject.color }}></span>
                                {slot.subject.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDeleteSlot(slot.id, e)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="glass border-white/10 p-6 sm:max-w-md bg-zinc-950/80 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Add Study Task</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Schedule a specific subject block in your study calendar.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleManualAdd} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Task Title</label>
              <input
                type="text"
                placeholder="e.g. Read Chapter 4 / Review Homework"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary text-xs"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Subject</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary text-xs"
              >
                <option value="general">General Studies (No Subject)</option>
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary text-xs"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary text-xs"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsAddOpen(false)}
                className="rounded-xl text-xs hover:bg-white/5 hover:text-white"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isPending}
                className="bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-semibold shadow-[0_0_15px_rgba(100,50,255,0.4)] border-0"
              >
                {isPending ? "Scheduling..." : "Schedule Task"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
