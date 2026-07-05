"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, BookOpen, Clock, Target, Trash2, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { addSubject, deleteSubject, addTopic, toggleTopic } from "@/app/actions";
import { cn } from "@/lib/utils";

interface Topic {
  id: string;
  title: string;
  completed: boolean;
  order: number;
}

interface Subject {
  id: string;
  name: string;
  color: string;
  targetHours: number;
  priority: number;
  topics: Topic[];
}

interface CurriculumViewProps {
  initialSubjects: Subject[];
}

const COLOR_PRESETS = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Emerald", value: "#10b981" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Amber", value: "#f59e0b" },
];

export function CurriculumView({ initialSubjects }: CurriculumViewProps) {
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeSubject, setActiveSubject] = useState<Subject | null>(null);
  
  // Add Subject Form State
  const [subName, setSubName] = useState("");
  const [subColor, setSubColor] = useState(COLOR_PRESETS[0].value);
  const [subHours, setSubHours] = useState("10");
  const [subPriority, setSubPriority] = useState("2");
  
  // Add Topic State
  const [topicTitle, setTopicTitle] = useState("");
  
  const [isPending, startTransition] = useTransition();

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) return;

    startTransition(async () => {
      try {
        const newSub = await addSubject({
          name: subName,
          color: subColor,
          targetHours: Number(subHours),
          priority: Number(subPriority),
        });
        
        setSubjects((prev) => [
          { ...newSub, topics: [] } as Subject,
          ...prev,
        ]);
        
        // Reset form
        setSubName("");
        setSubColor(COLOR_PRESETS[0].value);
        setSubHours("10");
        setSubPriority("2");
        setIsAddOpen(false);
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subject? All associated study sessions and schedule slots will be deleted.")) return;
    
    startTransition(async () => {
      try {
        await deleteSubject(id);
        setSubjects((prev) => prev.filter((s) => s.id !== id));
        if (activeSubject?.id === id) {
          setActiveSubject(null);
        }
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSubject || !topicTitle.trim()) return;

    const subId = activeSubject.id;
    const title = topicTitle;
    setTopicTitle("");

    startTransition(async () => {
      try {
        const newTopic = await addTopic(subId, title);
        
        // Update subjects state
        const updated = subjects.map((sub) => {
          if (sub.id === subId) {
            return {
              ...sub,
              topics: [...sub.topics, newTopic],
            };
          }
          return sub;
        });
        
        setSubjects(updated);
        
        // Update active subject detail view
        const currentActive = updated.find((s) => s.id === subId);
        if (currentActive) {
          setActiveSubject(currentActive);
        }
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleToggleTopic = async (topicId: string, currentCompleted: boolean) => {
    const nextCompleted = !currentCompleted;
    
    // Optimistic update
    const subId = activeSubject?.id;
    if (subId) {
      const updated = subjects.map((sub) => {
        if (sub.id === subId) {
          return {
            ...sub,
            topics: sub.topics.map((t) => (t.id === topicId ? { ...t, completed: nextCompleted } : t)),
          };
        }
        return sub;
      });
      setSubjects(updated);
      const currentActive = updated.find((s) => s.id === subId);
      if (currentActive) {
        setActiveSubject(currentActive);
      }
    }

    startTransition(async () => {
      try {
        await toggleTopic(topicId, nextCompleted);
      } catch (err) {
        console.error("Failed to toggle topic", err);
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white text-glow">Curriculum Hub</h1>
          <p className="text-muted-foreground">Manage your study catalog and map topics to finish.</p>
        </div>
        <Button 
          onClick={() => setIsAddOpen(true)}
          className="bg-primary hover:bg-primary/90 text-white rounded-full shadow-[0_0_20px_rgba(100,50,255,0.5)] border-0"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Subject
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Subjects List */}
        <div className="lg:col-span-2 space-y-4">
          {subjects.length === 0 ? (
            <Card className="glass border-white/5 shadow-none p-12 flex flex-col items-center justify-center text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground/60 mb-4" />
              <h3 className="font-semibold text-white text-lg">No Subjects Yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-6">
                Start building your curriculum catalog by adding your subjects.
              </p>
              <Button onClick={() => setIsAddOpen(true)} className="bg-primary hover:bg-primary/90 rounded-full">
                Add Your First Subject
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {subjects.map((sub) => (
                <Card 
                  key={sub.id} 
                  onClick={() => setActiveSubject(sub)}
                  className={cn(
                    "glass border-white/5 hover:border-white/10 hover:bg-white/5 transition-all shadow-none relative overflow-hidden group cursor-pointer",
                    activeSubject?.id === sub.id && "border-primary bg-primary/5 ring-1 ring-primary/30"
                  )}
                >
                  <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: sub.color }}></div>
                  <CardHeader className="pb-2 flex flex-row items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-bold text-white group-hover:text-primary transition-colors line-clamp-1">
                        {sub.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {sub.topics.filter(t => t.completed).length} / {sub.topics.length} Topics completed
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSubject(sub.id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Target className="h-3.5 w-3.5" />
                        <span>Priority {sub.priority}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{sub.targetHours}h Goal</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Selected Subject Details & Topic List */}
        <div className="lg:col-span-1">
          {activeSubject ? (
            <Card className="glass border-white/5 shadow-none sticky top-24 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: activeSubject.color }}></div>
              <CardHeader className="pb-3">
                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                  {activeSubject.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground">Curriculum topic breakdown and milestones</p>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Topic Add Form */}
                <form onSubmit={handleAddTopic} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add topic (e.g. Recursion)..."
                    value={topicTitle}
                    onChange={(e) => setTopicTitle(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary text-xs"
                    required
                  />
                  <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-semibold">
                    Add
                  </Button>
                </form>

                {/* Topics List */}
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {activeSubject.topics.length === 0 ? (
                    <div className="text-center py-8 text-xs text-muted-foreground space-y-1">
                      <AlertCircle className="w-5 h-5 mx-auto text-muted-foreground opacity-60 mb-2" />
                      <p>No topics added to this subject yet.</p>
                      <p className="text-[10px]">Add topics above to structure your studies.</p>
                    </div>
                  ) : (
                    activeSubject.topics
                      .sort((a, b) => a.order - b.order)
                      .map((topic) => (
                        <div 
                          key={topic.id} 
                          onClick={() => handleToggleTopic(topic.id, topic.completed)}
                          className={cn(
                            "flex items-center gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer transition-all border border-white/0",
                            topic.completed && "opacity-60 border-green-500/10 bg-green-500/5"
                          )}
                        >
                          {topic.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                          )}
                          <span className={cn("text-xs text-white", topic.completed && "line-through text-muted-foreground")}>
                            {topic.title}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="glass border-white/5 shadow-none p-8 text-center flex flex-col items-center justify-center min-h-[200px]">
              <AlertCircle className="w-8 h-8 text-muted-foreground opacity-40 mb-3" />
              <p className="text-sm text-muted-foreground font-medium">Select a Subject</p>
              <p className="text-xs text-muted-foreground/60 mt-1 max-w-[200px]">
                Click on any subject card to view, manage, and complete topics.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Add Subject Modal Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="glass border-white/10 p-6 sm:max-w-md bg-zinc-950/80 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white">Add New Subject</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define a new course or topic to include in your study curriculum.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubject} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Subject Name</label>
              <input
                type="text"
                placeholder="e.g. Computer Networks"
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Target Hours</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={subHours}
                  onChange={(e) => setSubHours(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary text-xs"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Priority (1-5)</label>
                <select
                  value={subPriority}
                  onChange={(e) => setSubPriority(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary text-xs"
                >
                  <option value="1">1 - Critical</option>
                  <option value="2">2 - High</option>
                  <option value="3">3 - Medium</option>
                  <option value="4">4 - Low</option>
                  <option value="5">5 - Elective</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Accent Color</label>
              <div className="flex gap-2 flex-wrap pt-1">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setSubColor(preset.value)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-all relative",
                      subColor === preset.value ? "border-white scale-110 shadow-lg" : "border-transparent opacity-80"
                    )}
                    style={{ backgroundColor: preset.value }}
                    title={preset.name}
                  />
                ))}
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
                className="bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-semibold shadow-[0_0_15px_rgba(100,50,255,0.4)]"
              >
                {isPending ? "Adding..." : "Add Subject"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
