"use client";

import React, { useState, useEffect, useTransition, useRef } from "react";
import Link from "next/link";
import {
  FileText,
  Brain,
  MessageSquare,
  Sparkles,
  Trash2,
  Plus,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Send,
  FileUp,
  File,
  Loader2,
  GraduationCap,
  Trophy,
  RotateCcw,
  Check,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  createSyllabus,
  deleteSyllabus,
  generateQuiz,
  deleteQuiz,
  sendDocumentChat,
  getSpacedRepetitionData,
  reviewSpacedCard,
} from "@/app/actions";
import { Syllabus, Subject, Quiz, Question, QuizAttempt, SyllabusChunk, SpacedRepetitionCard } from "@prisma/client";

type SyllabusWithRelations = Syllabus & {
  subject: Subject | null;
  chunks: SyllabusChunk[];
  quizzes: (Quiz & {
    questions: Question[];
    attempts: QuizAttempt[];
  })[];
};

export type SpacedCardWithRelations = SpacedRepetitionCard & {
  question: Question & {
    quiz: (Quiz & {
      syllabus: Syllabus | null;
    }) | null;
  };
};

export type WeaknessStats = {
  syllabusId: string;
  name: string;
  subjectColor: string;
  avgScore: number;
  totalAttempts: number;
  totalQuestions: number;
  wrongAnswersCount: number;
};


interface StudyHubViewProps {
  initialSyllabi: SyllabusWithRelations[];
  subjects: Subject[];
}

export function StudyHubView({ initialSyllabi, subjects }: StudyHubViewProps) {
  const [activeTab, setActiveTab] = useState<"documents" | "quizzes" | "chat" | "spaced-repetition">("documents");
  const [syllabi, setSyllabi] = useState<SyllabusWithRelations[]>(initialSyllabi);
  const [isPending, startTransition] = useTransition();

  // ─── SPACED REPETITION & WEAKNESS STATE ──────────────────────────────────
  const [spacedData, setSpacedData] = useState<{
    dueCards: SpacedCardWithRelations[];
    totalCardsCount: number;
    weaknesses: WeaknessStats[];
    agentLog: string;
  } | null>(null);
  const [isSpacedLoading, setIsSpacedLoading] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [recentReviewSuccess, setRecentReviewSuccess] = useState<string | null>(null);

  const fetchSpacedData = async () => {
    setIsSpacedLoading(true);
    try {
      const data = await getSpacedRepetitionData();
      setSpacedData(data as unknown as {
        dueCards: SpacedCardWithRelations[];
        totalCardsCount: number;
        weaknesses: WeaknessStats[];
        agentLog: string;
      });
    } catch (err) {
      console.error("Failed to fetch spaced repetition data:", err);
    } finally {
      setIsSpacedLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSpacedData();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleReviewCard = async (cardId: string, isCorrect: boolean) => {
    setShowAnswer(false);
    startTransition(async () => {
      try {
        const res = await reviewSpacedCard({ cardId, grade: isCorrect ? 5 : 1 });
        if (res.success) {
          setRecentReviewSuccess(`+15 XP! Card scheduled in ${res.interval} days.`);
          setTimeout(() => setRecentReviewSuccess(null), 3000);
          
          // Re-fetch data to update the due list
          const data = await getSpacedRepetitionData();
          setSpacedData(data as unknown as {
            dueCards: SpacedCardWithRelations[];
            totalCardsCount: number;
            weaknesses: WeaknessStats[];
            agentLog: string;
          });
          
          if (data && activeCardIndex >= (data as unknown as { dueCards: SpacedCardWithRelations[] }).dueCards.length) {
            setActiveCardIndex(Math.max(0, (data as unknown as { dueCards: SpacedCardWithRelations[] }).dueCards.length - 1));
          }
        }
      } catch (err) {
        console.error("Review card action failed:", err);
      }
    });
  };

  // ─── DOCUMENT UPLOAD STATE ─────────────────────────────────────────────
  const [uploadSubjectId, setUploadSubjectId] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── MODALS STATE ──────────────────────────────────────────────────────
  const [previewDoc, setPreviewDoc] = useState<SyllabusWithRelations | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<SyllabusWithRelations | null>(null);
  const [generateQuizDoc, setGenerateQuizDoc] = useState<SyllabusWithRelations | null>(null);
  const [quizToDelete, setQuizToDelete] = useState<string | null>(null);

  // ─── QUIZ GENERATION STATE ─────────────────────────────────────────────
  const [quizTitle, setQuizTitle] = useState("");
  const [quizNumQuestions, setQuizNumQuestions] = useState<number>(10);
  const [quizType, setQuizType] = useState<"mcq" | "flashcard" | "short">("mcq");

  // ─── CHAT STATE ────────────────────────────────────────────────────────
  const [selectedDocForChat, setSelectedDocForChat] = useState<SyllabusWithRelations | null>(
    syllabi[0] || null
  );
  const [chatMessages, setChatMessages] = useState<
    Record<string, { role: "user" | "assistant"; content: string }[]>
  >({});
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Helper: Get quizzes from all syllabi
  const allQuizzes = syllabi.flatMap((s) =>
    s.quizzes.map((q) => ({
      ...q,
      syllabusName: s.fileName,
      bestScore: q.attempts.length > 0 ? Math.max(...q.attempts.map((a) => a.score)) : null,
    }))
  );

  // ─── FILE UPLOAD HANDLERS ──────────────────────────────────────────────
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Upload failed");
      }

      const uploadResult = await res.json();

      startTransition(async () => {
        try {
          const newSyllabus = await createSyllabus({
            fileName: uploadResult.fileName,
            fileUrl: uploadResult.fileUrl,
            parsedText: uploadResult.parsedText,
            subjectId: uploadSubjectId || null,
          });

          // Fetch fresh list or append
          const updatedSyllabus: SyllabusWithRelations = {
            ...newSyllabus,
            subject: subjects.find((s) => s.id === uploadSubjectId) || null,
            chunks: [],
            quizzes: [],
          };

          setSyllabi((prev) => [updatedSyllabus, ...prev]);
          if (!selectedDocForChat) {
            setSelectedDocForChat(updatedSyllabus);
          }
        } catch (err) {
          setUploadError(err instanceof Error ? err.message : "Failed to create syllabus record");
        } finally {
          setIsUploading(false);
        }
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to parse document");
      setIsUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isUploading) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  // ─── DELETE DOCUMENT ───────────────────────────────────────────────────
  const handleDeleteDocument = () => {
    if (!deleteDoc) return;
    startTransition(async () => {
      try {
        await deleteSyllabus(deleteDoc.id);
        setSyllabi((prev) => prev.filter((s) => s.id !== deleteDoc.id));
        if (selectedDocForChat?.id === deleteDoc.id) {
          setSelectedDocForChat(syllabi.find((s) => s.id !== deleteDoc.id) || null);
        }
        setDeleteDoc(null);
      } catch (err) {
        console.error(err);
      }
    });
  };

  // ─── QUIZ GENERATION HANDLER ───────────────────────────────────────────
  const handleGenerateQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!generateQuizDoc) return;

    startTransition(async () => {
      try {
        const quiz = await generateQuiz({
          syllabusId: generateQuizDoc.id,
          title: quizTitle || `Quiz: ${generateQuizDoc.fileName.split(".")[0]}`,
          numQuestions: quizNumQuestions,
          questionType: quizType,
        });

        // Update local state by refetching/updating syllabus structure
        setSyllabi((prev) =>
          prev.map((s) => {
            if (s.id === generateQuizDoc.id) {
              return {
                ...s,
                quizzes: [
                  ...s.quizzes,
                  {
                    ...quiz,
                    questions: [],
                    attempts: [],
                  },
                ],
              };
            }
            return s;
          })
        );

        setGenerateQuizDoc(null);
        setQuizTitle("");
        setActiveTab("quizzes");
      } catch (err) {
        console.error(err);
      }
    });
  };

  // ─── DELETE QUIZ ───────────────────────────────────────────────────────
  const handleDeleteQuiz = (quizId: string) => {
    startTransition(async () => {
      try {
        await deleteQuiz(quizId);
        setSyllabi((prev) =>
          prev.map((s) => ({
            ...s,
            quizzes: s.quizzes.filter((q) => q.id !== quizId),
          }))
        );
        setQuizToDelete(null);
      } catch (err) {
        console.error(err);
      }
    });
  };

  // ─── DOCUMENT CHAT HANDLERS ────────────────────────────────────────────
  const handleSendDocMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !selectedDocForChat || isChatLoading) return;

    const userMsg = chatInput;
    setChatInput("");
    setIsChatLoading(true);

    const docId = selectedDocForChat.id;
    const currentMsgs = chatMessages[docId] || [];

    // Append user message instantly
    setChatMessages((prev) => ({
      ...prev,
      [docId]: [...currentMsgs, { role: "user", content: userMsg }],
    }));

    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);

    try {
      const response = await sendDocumentChat({
        content: userMsg,
        syllabusId: docId,
      });

      setChatMessages((prev) => ({
        ...prev,
        [docId]: [
          ...(prev[docId] || []),
          { role: "assistant", content: response.content },
        ],
      }));
    } catch (err) {
      console.error(err);
      setChatMessages((prev) => ({
        ...prev,
        [docId]: [
          ...(prev[docId] || []),
          { role: "assistant", content: "Error: Failed to fetch AI answer. Please try again." },
        ],
      }));
    } finally {
      setIsChatLoading(false);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setChatInput(prompt);
    setTimeout(() => {
      handleSendDocMessage();
    }, 50);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3 text-glow">
            <GraduationCapIcon className="w-8 h-8 text-primary" /> Study Hub
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Supercharge your learning. Upload materials, generate quizzes, and chat with your documents.
          </p>
        </div>

        {/* Custom Tab Switcher */}
        <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("documents")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300",
              activeTab === "documents"
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:text-white"
            )}
          >
            <FileText className="w-4 h-4" />
            Documents
            <span className="bg-white/10 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1 font-bold">
              {syllabi.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("quizzes")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300",
              activeTab === "quizzes"
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:text-white"
            )}
          >
            <Brain className="w-4 h-4" />
            AI Quizzes
            <span className="bg-white/10 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1 font-bold">
              {allQuizzes.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300",
              activeTab === "chat"
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:text-white"
            )}
          >
            <MessageSquare className="w-4 h-4" />
            Doc Chat
          </button>
          <button
            onClick={() => setActiveTab("spaced-repetition")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-300",
              activeTab === "spaced-repetition"
                ? "bg-primary text-white shadow-lg shadow-primary/20"
                : "text-muted-foreground hover:text-white"
            )}
          >
            <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
            Review & Weaknesses
            {spacedData && spacedData.dueCards.length > 0 && (
              <span className="bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] px-1.5 py-0.5 rounded-full ml-1 font-bold animate-pulse">
                {spacedData.dueCards.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ─── TAB 1: DOCUMENTS ─────────────────────────────────────────────── */}
      {activeTab === "documents" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Upload Card */}
          <Card className="glass border-white/5 shadow-none overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold text-white text-sm">Upload Study Resource</h3>
                  <p className="text-xs text-muted-foreground">
                    Upload lectures, syllabus docs, notes or chapters (PDF, DOCX, TXT, MD)
                  </p>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {/* Subject Dropdown */}
                  <select
                    value={uploadSubjectId}
                    onChange={(e) => setUploadSubjectId(e.target.value)}
                    className="w-full sm:w-48 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="" className="bg-zinc-900">General (No Subject)</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id} className="bg-zinc-900">
                        {sub.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Drag & Drop Area */}
              <div
                onDragOver={onDragOver}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed border-white/10 hover:border-primary/50 bg-white/[0.02] hover:bg-white/[0.04] transition-all rounded-2xl p-8 text-center cursor-pointer flex flex-col items-center justify-center space-y-3",
                  isUploading && "pointer-events-none opacity-50"
                )}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".pdf,.docx,.txt,.md"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      handleFileUpload(files[0]);
                    }
                  }}
                />

                {isUploading ? (
                  <>
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-xs text-white font-medium">Extracting content and parsing text...</p>
                    <p className="text-[10px] text-muted-foreground">Please wait a few seconds...</p>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-white/5 rounded-full border border-white/10">
                      <FileUp className="w-8 h-8 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-white font-semibold">
                        Drag and drop your file here, or click to browse
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Supports PDF, DOCX, TXT, MD up to 10MB
                      </p>
                    </div>
                  </>
                )}
              </div>

              {uploadError && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents Grid */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-white">Your Documents</h2>
            {syllabi.length === 0 ? (
              <div className="p-8 text-center border border-white/5 rounded-2xl bg-white/[0.01] flex flex-col items-center justify-center">
                <FileText className="w-8 h-8 text-muted-foreground opacity-30 mb-2" />
                <p className="text-xs text-muted-foreground font-medium">No study materials uploaded yet</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1 max-w-xs">
                  Drag and drop a file above to build your document context and generate tailored quizzes.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {syllabi.map((doc) => {
                  const wordCount = doc.parsedText ? doc.parsedText.split(/\s+/).length : 0;
                  return (
                    <Card
                      key={doc.id}
                      className="glass border-white/5 hover:border-white/10 shadow-none transition-all group relative overflow-hidden"
                    >
                      {/* Left colored bar if subject matches */}
                      {doc.subject && (
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1"
                          style={{ backgroundColor: doc.subject.color }}
                        />
                      )}

                      <CardHeader className="p-4 flex flex-row items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0 flex-1">
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="font-semibold text-white text-xs hover:text-primary transition-colors text-left truncate block w-full outline-none"
                            title={doc.fileName}
                          >
                            {doc.fileName}
                          </button>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground" suppressHydrationWarning>
                              {new Date(doc.uploadedAt).toLocaleDateString()}
                            </span>
                            {doc.subject && (
                              <Badge
                                variant="outline"
                                className="text-[9px] px-1.5 py-0 border-white/10"
                                style={{
                                  color: doc.subject.color,
                                  borderColor: `${doc.subject.color}30`,
                                  backgroundColor: `${doc.subject.color}10`,
                                }}
                              >
                                {doc.subject.name}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          {doc.status === "done" ? (
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                          ) : doc.status === "failed" ? (
                            <AlertCircle className="w-4 h-4 text-destructive" />
                          ) : (
                            <Loader2 className="w-4 h-4 text-primary animate-spin" />
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="px-4 pb-4 pt-0">
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground border-t border-white/5 pt-3">
                          <div>
                            <span className="block font-medium text-white">Words</span>
                            {wordCount.toLocaleString()}
                          </div>
                          <div>
                            <span className="block font-medium text-white">Quiz Count</span>
                            {doc.quizzes.length}
                          </div>
                        </div>

                        {/* Action buttons (only show if done) */}
                        {doc.status === "done" && (
                          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[10px] flex-1 h-7 border-white/5 hover:border-white/10"
                              onClick={() => {
                                setGenerateQuizDoc(doc);
                                setQuizTitle(`Quiz: ${doc.fileName.split(".")[0]}`);
                              }}
                            >
                              <Brain className="w-3.5 h-3.5 mr-1" /> Quiz
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[10px] flex-1 h-7 border-white/5 hover:border-white/10"
                              onClick={() => {
                                setSelectedDocForChat(doc);
                                setActiveTab("chat");
                              }}
                            >
                              <MessageSquare className="w-3.5 h-3.5 mr-1" /> Chat
                            </Button>
                            <Button
                              variant="destructive"
                              size="icon-sm"
                              className="h-7 w-7 text-destructive border-transparent"
                              onClick={() => setDeleteDoc(doc)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: QUIZZES ──────────────────────────────────────────────── */}
      {activeTab === "quizzes" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">AI Quizzes</h2>
            {syllabi.some((s) => s.status === "done") && (
              <Button
                size="sm"
                className="text-xs h-8 gap-1.5"
                onClick={() => {
                  const firstDoc = syllabi.find((s) => s.status === "done");
                  if (firstDoc) {
                    setGenerateQuizDoc(firstDoc);
                    setQuizTitle(`Quiz: ${firstDoc.fileName.split(".")[0]}`);
                  }
                }}
              >
                <Plus className="w-4 h-4" /> Generate New Quiz
              </Button>
            )}
          </div>

          {allQuizzes.length === 0 ? (
            <div className="p-8 text-center border border-white/5 rounded-2xl bg-white/[0.01] flex flex-col items-center justify-center">
              <Brain className="w-8 h-8 text-muted-foreground opacity-30 mb-2" />
              <p className="text-xs text-muted-foreground font-medium">No quizzes generated yet</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1 max-w-xs">
                To create a quiz, upload a study resource first, then click &quot;Generate Quiz&quot; on the card.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allQuizzes.map((quiz) => (
                <Card
                  key={quiz.id}
                  className="glass border-white/5 hover:border-white/10 shadow-none transition-all relative overflow-hidden"
                >
                  <CardHeader className="p-4 flex flex-row items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <h3 className="font-semibold text-white text-xs truncate" title={quiz.title}>
                        {quiz.title}
                      </h3>
                      <p className="text-[10px] text-muted-foreground truncate">
                        Source: {quiz.syllabusName}
                      </p>
                    </div>

                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 shrink-0 font-bold">
                      {quiz.questions.length} Qs
                    </Badge>
                  </CardHeader>

                  <CardContent className="px-4 pb-4 pt-0">
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground border-t border-white/5 pt-3">
                      <div>
                        <span className="block font-medium text-white">Best Score</span>
                        <span className={cn(quiz.bestScore !== null && "text-green-400 font-bold")}>
                          {quiz.bestScore !== null ? `${quiz.bestScore.toFixed(0)}%` : "Not attempted"}
                        </span>
                      </div>
                      <div>
                        <span className="block font-medium text-white">Attempts</span>
                        {quiz.attempts.length}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/5">
                      <Link href={`/study-hub/quiz/${quiz.id}`} className="flex-1">
                        <Button
                          variant="default"
                          size="sm"
                          className="w-full text-[10px] h-7 bg-primary hover:bg-primary/80"
                        >
                          <BookOpen className="w-3.5 h-3.5 mr-1" /> Start Quiz
                        </Button>
                      </Link>
                      <Button
                        variant="destructive"
                        size="icon-sm"
                        className="h-7 w-7 text-destructive border-transparent"
                        onClick={() => setQuizToDelete(quiz.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 3: DOCUMENT CHAT ─────────────────────────────────────────── */}
      {activeTab === "chat" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-auto md:h-[600px] border border-white/5 rounded-2xl overflow-hidden glass animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Left Panel: File list */}
          <div className="md:col-span-1 border-r border-white/5 bg-white/[0.01] flex flex-col p-4 space-y-4 min-h-0">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Documents Context</h3>
            <div className="space-y-1.5 overflow-y-auto flex-1 pr-1">
              {syllabi.filter((s) => s.status === "done").length === 0 ? (
                <p className="text-[10px] text-muted-foreground">No parsed documents available.</p>
              ) : (
                syllabi
                  .filter((s) => s.status === "done")
                  .map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDocForChat(doc)}
                      className={cn(
                        "w-full text-left p-2 rounded-xl text-xs flex items-center gap-2 group transition-all",
                        selectedDocForChat?.id === doc.id
                          ? "bg-primary/10 border border-primary/30 text-white font-medium"
                          : "border border-transparent text-muted-foreground hover:text-white hover:bg-white/5"
                      )}
                    >
                      <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate flex-1">{doc.fileName}</span>
                    </button>
                  ))
              )}
            </div>
          </div>

          {/* Right Panel: Chat area */}
          <div className="md:col-span-3 flex flex-col h-full min-h-0 bg-white/[0.01]">
            {selectedDocForChat ? (
              <>
                {/* Chat Header */}
                <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-xs font-semibold text-white truncate">
                      Chatting about: {selectedDocForChat.fileName}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[9px] text-muted-foreground border-white/5 shrink-0">
                    {selectedDocForChat.chunks.length} chunks context
                  </Badge>
                </div>

                {/* Messages Box */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                  {(chatMessages[selectedDocForChat.id] || []).length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 p-8">
                      <div className="p-3 bg-primary/10 rounded-full border border-primary/20">
                        <Sparkles className="w-6 h-6 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-white font-semibold">Ask StudyAI helper about this material</p>
                        <p className="text-[10px] text-muted-foreground max-w-xs">
                          AI will read and answer based exclusively on the context of this document.
                        </p>
                      </div>

                      {/* Prompt Suggestions */}
                      <div className="flex flex-wrap gap-2 justify-center pt-2 max-w-md">
                        {[
                          "Summarize this document",
                          "What are the main concepts?",
                          "Give me 5 key takeaways",
                        ].map((prompt, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleQuickPrompt(prompt)}
                            className="px-2.5 py-1 text-[10px] rounded-lg bg-white/5 border border-white/10 hover:border-primary/50 text-white transition-colors cursor-pointer"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {(chatMessages[selectedDocForChat.id] || []).map((msg, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex gap-3 max-w-[80%]",
                        msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                      )}
                    >
                      {/* Avatar */}
                      <div
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center shrink-0 border",
                          msg.role === "user"
                            ? "bg-white/10 border-white/20 text-white"
                            : "bg-primary/10 border-primary/20 text-primary"
                        )}
                      >
                        {msg.role === "user" ? (
                          <span className="text-[10px] font-bold">U</span>
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div
                        className={cn(
                          "p-3 rounded-2xl text-xs space-y-1.5",
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-white/5 border border-white/5 text-white"
                        )}
                      >
                        <div className="prose prose-invert max-w-none text-xs leading-relaxed [&_p]:m-0 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Typing Indicator */}
                  {isChatLoading && (
                    <div className="flex gap-3 max-w-[80%] mr-auto">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border bg-primary/10 border-primary/20 text-primary">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div className="p-3 bg-white/5 border border-white/5 rounded-2xl text-xs flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"></span>
                      </div>
                    </div>
                  )}

                  <div ref={chatBottomRef} />
                </div>

                {/* Input Bar */}
                <form
                  onSubmit={handleSendDocMessage}
                  className="p-3 border-t border-white/5 bg-white/[0.02] flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a question about this document..."
                    disabled={isChatLoading}
                    className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary text-xs"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!chatInput.trim() || isChatLoading}
                    className="h-8 w-8 bg-primary hover:bg-primary/80"
                  >
                    <Send className="w-3.5 h-3.5 text-white" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-2">
                <FileText className="w-12 h-12 text-muted-foreground opacity-20 mb-2" />
                <p className="text-xs text-muted-foreground font-semibold">Select a document to begin chatting</p>
                <p className="text-[10px] text-muted-foreground/60 max-w-xs">
                  Upload PDF, DOCX, TXT or MD files in the Documents tab to chat with them.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 4: SPACED REPETITION & WEAKNESS ANALYZER ───────────────── */}
      {activeTab === "spaced-repetition" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* Agent Activity Banner */}
          <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg text-primary shrink-0 animate-pulse">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  Weakness Analyzer Agent <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                </h4>
                <p className="text-xs text-slate-300 font-medium">
                  {spacedData?.agentLog || "Analyzing learning performance and scheduling reviews..."}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchSpacedData}
              disabled={isSpacedLoading}
              className="text-[10px] px-3 py-1.5 h-auto border-white/10 text-white hover:bg-white/5"
            >
              {isSpacedLoading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  Analyzing...
                </>
              ) : (
                <>
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Analyze Now
                </>
              )}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left Column: Weakness List */}
            <div className="space-y-6 md:col-span-1">
              <Card className="glass border-white/5 shadow-none">
                <CardHeader className="p-4 border-b border-white/5">
                  <h3 className="font-bold text-white text-xs flex items-center gap-2">
                    <Brain className="w-4 h-4 text-indigo-400" />
                    Accuracy by Document
                  </h3>
                  <p className="text-[10px] text-muted-foreground">
                    Sorted by weak areas needing review
                  </p>
                </CardHeader>
                <CardContent className="p-4 space-y-4 max-h-[350px] overflow-y-auto">
                  {spacedData?.weaknesses && spacedData.weaknesses.length > 0 ? (
                    spacedData.weaknesses.map((weak, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white font-medium truncate max-w-[130px]" title={weak.name}>
                            {weak.name}
                          </span>
                          <span className={cn(
                            "font-bold",
                            weak.avgScore < 60 ? "text-rose-400" : weak.avgScore < 75 ? "text-amber-400" : "text-emerald-400"
                          )}>
                            {weak.avgScore}% accuracy
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              weak.avgScore < 60 ? "bg-rose-500" : weak.avgScore < 75 ? "bg-amber-500" : "bg-emerald-500"
                            )}
                            style={{ width: `${weak.avgScore}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{weak.totalAttempts} attempts</span>
                          <span className="text-rose-400">{weak.wrongAnswersCount} incorrect</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-6 text-center text-muted-foreground text-[10px]">
                      Take quizzes to build your weakness profile.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Spaced repetition queue stats */}
              <Card className="glass border-white/5 shadow-none">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Cards</div>
                    <div className="text-xl font-extrabold text-white">{spacedData?.totalCardsCount || 0}</div>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Due Today</div>
                    <div className="text-xl font-extrabold text-amber-400 animate-pulse">{spacedData?.dueCards.length || 0}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Review Deck */}
            <div className="md:col-span-2 space-y-4">
              <Card className="glass border-white/5 shadow-none h-full min-h-[400px] flex flex-col">
                <CardHeader className="p-4 border-b border-white/5 flex flex-row items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-xs flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-emerald-400" />
                      Active Spaced Repetition Deck
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      SM-2 algorithm dynamically calculates review intervals based on scores.
                    </p>
                  </div>
                  {spacedData?.dueCards && spacedData.dueCards.length > 0 && (
                    <Badge variant="outline" className="text-[10px] border-amber-500/20 bg-amber-500/10 text-amber-300">
                      Card {activeCardIndex + 1} of {spacedData.dueCards.length}
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="p-6 flex-1 flex flex-col justify-center items-center">
                  {recentReviewSuccess && (
                    <div className="w-full max-w-lg mb-4 text-center py-2 px-4 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium animate-bounce">
                      {recentReviewSuccess}
                    </div>
                  )}

                  {spacedData?.dueCards && spacedData.dueCards.length > 0 ? (
                    (() => {
                      const card = spacedData.dueCards[activeCardIndex];
                      if (!card) return null;
                      return (
                        <div className="w-full flex flex-col items-center space-y-6">
                          
                          {/* Perspective 3D Flip Card */}
                          <div 
                            onClick={() => setShowAnswer(!showAnswer)} 
                            className="perspective-1000 w-full max-w-lg h-[240px] cursor-pointer"
                          >
                            <div 
                              style={{ 
                                transform: showAnswer ? 'rotateY(180deg)' : 'none', 
                                transformStyle: 'preserve-3d', 
                                transition: 'transform 0.6s' 
                              }}
                              className="relative w-full h-full transform-style-3d"
                            >
                              {/* Front side */}
                              <div 
                                style={{ backfaceVisibility: 'hidden' }}
                                className="absolute inset-0 bg-white/[0.03] border border-white/10 rounded-2xl p-6 flex flex-col justify-between"
                              >
                                <div className="flex items-center justify-between">
                                  <Badge className="bg-primary/20 border border-primary/30 text-primary text-[9px] uppercase tracking-wider">Question</Badge>
                                  <span className="text-[9px] text-muted-foreground truncate max-w-[150px]">{card.question.quiz?.syllabus?.fileName || "General"}</span>
                                </div>
                                <div className="text-sm font-semibold text-white text-center flex items-center justify-center flex-1 my-4 leading-relaxed overflow-y-auto max-h-[120px]">
                                  {card.question.text}
                                </div>
                                <div className="text-[9px] text-center text-slate-400 animate-pulse">Click card to reveal answer</div>
                              </div>

                              {/* Back side */}
                              <div 
                                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                                className="absolute inset-0 bg-indigo-950/40 border border-primary/20 rounded-2xl p-6 flex flex-col justify-between"
                              >
                                <div className="flex items-center justify-between">
                                  <Badge className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[9px] uppercase tracking-wider">Correct Answer</Badge>
                                  <span className="text-[9px] text-muted-foreground truncate max-w-[150px]">{card.question.quiz?.title || "Syllabus Quiz"}</span>
                                </div>
                                <div className="text-sm font-bold text-white text-center flex items-center justify-center flex-1 my-2 overflow-y-auto max-h-[100px]">
                                  {card.question.answer}
                                </div>
                                {card.question.explanation && (
                                  <div className="text-[9px] text-muted-foreground/90 border-t border-white/5 pt-1.5 text-center overflow-y-auto max-h-[50px] leading-relaxed">
                                    <span className="font-bold text-slate-200">Explanation:</span> {card.question.explanation}
                                  </div>
                                )}
                                <div className="text-[9px] text-center text-emerald-400 font-semibold">Click to flip back</div>
                              </div>
                            </div>
                          </div>

                          {/* Controls */}
                          <div className="flex flex-col items-center gap-3 w-full max-w-lg">
                            {showAnswer ? (
                              <div className="flex gap-4 w-full">
                                <Button
                                  variant="outline"
                                  onClick={() => handleReviewCard(card.id, false)}
                                  disabled={isPending}
                                  className="flex-1 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold"
                                >
                                  <X className="w-4 h-4 mr-1.5" />
                                  Didn&apos;t get it
                                </Button>
                                <Button
                                  onClick={() => handleReviewCard(card.id, true)}
                                  disabled={isPending}
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                                >
                                  <Check className="w-4 h-4 mr-1.5" />
                                  Got it ✓
                                </Button>
                              </div>
                            ) : (
                              <Button
                                onClick={() => setShowAnswer(true)}
                                className="w-full bg-primary hover:bg-primary/80 text-white text-xs font-semibold"
                              >
                                Reveal Answer
                              </Button>
                            )}

                            {/* Deck Navigation if multiple cards */}
                            {spacedData.dueCards.length > 1 && (
                              <div className="flex gap-2 justify-center pt-2">
                                <button
                                  onClick={() => {
                                    setShowAnswer(false);
                                    setActiveCardIndex((prev) => (prev > 0 ? prev - 1 : spacedData.dueCards.length - 1));
                                  }}
                                  className="px-2.5 py-1 text-[10px] rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-colors"
                                >
                                  Prev
                                </button>
                                <button
                                  onClick={() => {
                                    setShowAnswer(false);
                                    setActiveCardIndex((prev) => (prev < spacedData.dueCards.length - 1 ? prev + 1 : 0));
                                  }}
                                  className="px-2.5 py-1 text-[10px] rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-colors"
                                >
                                  Next
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center space-y-4 py-12 max-w-sm">
                      <div className="p-4 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                        <Trophy className="w-8 h-8 text-emerald-400 animate-bounce" />
                      </div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">All caught up! 🎉</h4>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        You have successfully reviewed all due cards. The Spaced Repetition Agent will notify you when new cards are ready for review.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={fetchSpacedData}
                        disabled={isSpacedLoading}
                        className="text-[10px] border-white/10 text-white"
                      >
                        Check for Updates
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: PREVIEW TEXT ───────────────────────────────────────── */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="glass border-white/10 p-6 sm:max-w-2xl bg-zinc-950/90 backdrop-blur-3xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> {previewDoc?.fileName}
            </DialogTitle>
            <DialogDescription className="text-[10px] text-muted-foreground">
              Full text extracted from the document.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 max-h-[350px] overflow-y-auto p-4 rounded-xl bg-white/5 border border-white/10 text-xs text-white/90 whitespace-pre-wrap leading-relaxed">
            {previewDoc?.parsedText || "No text available."}
          </div>

          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-white/10"
              onClick={() => setPreviewDoc(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 2: DELETE DOCUMENT CONFIRMATION ───────────────────────── */}
      <Dialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <DialogContent className="glass border-white/10 p-6 sm:max-w-md bg-zinc-950/90 backdrop-blur-3xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-destructive" /> Delete Document?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete <span className="text-white font-semibold">{deleteDoc?.fileName}</span>?
              This will also permanently delete all associated quizzes, questions, and attempt records.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-white/10"
              onClick={() => setDeleteDoc(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="text-xs"
              onClick={handleDeleteDocument}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 3: GENERATE QUIZ OPTIONS ─────────────────────────────── */}
      <Dialog open={!!generateQuizDoc} onOpenChange={() => setGenerateQuizDoc(null)}>
        <DialogContent className="glass border-white/10 p-6 sm:max-w-md bg-zinc-950/90 backdrop-blur-3xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" /> Generate AI Study Quiz
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure parameters to auto-generate a quiz from <span className="text-white font-semibold">{generateQuizDoc?.fileName}</span>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleGenerateQuiz} className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-muted-foreground uppercase">Quiz Title</label>
              <input
                type="text"
                placeholder="e.g. Midterm Exam Prep"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Questions</label>
                <select
                  value={quizNumQuestions}
                  onChange={(e) => setQuizNumQuestions(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary text-xs [&>option]:bg-zinc-950"
                >
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                  <option value={15}>15 Questions</option>
                  <option value={20}>20 Questions</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Type</label>
                <select
                  value={quizType}
                  onChange={(e) => setQuizType(e.target.value as "mcq" | "flashcard" | "short")}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-primary text-xs [&>option]:bg-zinc-950"
                >
                  <option value="mcq">Multiple Choice</option>
                  <option value="flashcard">Flashcards</option>
                  <option value="short">Short Answer</option>
                </select>
              </div>
            </div>

            <DialogFooter className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs border-white/10"
                onClick={() => setGenerateQuizDoc(null)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" className="text-xs bg-primary" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Create Quiz
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── MODAL 4: DELETE QUIZ CONFIRMATION ───────────────────────────── */}
      <Dialog open={!!quizToDelete} onOpenChange={() => setQuizToDelete(null)}>
        <DialogContent className="glass border-white/10 p-6 sm:max-w-md bg-zinc-950/90 backdrop-blur-3xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-destructive" /> Delete Quiz?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to permanently delete this quiz and all its score attempts? This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-white/10"
              onClick={() => setQuizToDelete(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="text-xs"
              onClick={() => quizToDelete && handleDeleteQuiz(quizToDelete)}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete Quiz"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Simple placeholder for GraduationCap icon since it's not imported directly or might not exist in Lucide
function GraduationCapIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
      <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
    </svg>
  );
}
