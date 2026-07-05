"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  RotateCcw,
  Trophy,
  Brain,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { submitQuizAttempt } from "@/app/actions";

interface Question {
  id: string;
  text: string;
  type: string; // "mcq" | "flashcard" | "short"
  options: string[];
  answer: string;
  explanation: string | null;
  order: number;
}

interface QuizAttempt {
  id: string;
  score: number;
  totalQ: number;
  timeTaken: number;
  completedAt: Date;
}

interface QuizData {
  id: string;
  title: string;
  questions: Question[];
  syllabus: { fileName: string } | null;
  attempts: QuizAttempt[];
}

interface QuizTakeViewProps {
  quiz: QuizData;
}

export function QuizTakeView({ quiz }: QuizTakeViewProps) {
  const [phase, setPhase] = useState<"start" | "taking" | "results">("start");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeTaken, setTimeTaken] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false); // Flashcard state
  const [shortAnswerText, setShortAnswerText] = useState(""); // Short answer state

  const [isPending, startTransition] = useTransition();

  // Results state from server response
  const [resultsData, setResultsData] = useState<{
    correct: number;
    totalQ: number;
    score: number;
    xpEarned: number;
    results: Record<string, { correct: boolean; correctAnswer: string; explanation: string }>;
  } | null>(null);

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isAnswered = currentQuestion ? !!answers[currentQuestion.id] : false;

  // ─── ELAPSED TIMER EFFECT ──────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "taking") return;

    const interval = setInterval(() => {
      setTimeTaken((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
  };

  // ─── HANDLERS ──────────────────────────────────────────────────────────
  const handleStart = () => {
    setAnswers({});
    setTimeTaken(0);
    setCurrentQuestionIndex(0);
    setIsFlipped(false);
    setShortAnswerText("");
    setPhase("taking");
  };

  const handleSelectMCQ = (optionText: string) => {
    if (isPending) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionText,
    }));
  };

  const handleSelfGradeFlashcard = (isCorrect: boolean) => {
    if (isPending) return;
    // Set answer as either correct answer or wrong depending on user self grading
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: isCorrect ? currentQuestion.answer : `Incorrect: ${currentQuestion.answer}`,
    }));
  };

  const handleSubmitShortAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortAnswerText.trim() || isPending) return;

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: shortAnswerText,
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setIsFlipped(false);
      setShortAnswerText("");
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    startTransition(async () => {
      try {
        const result = await submitQuizAttempt({
          quizId: quiz.id,
          answers,
          timeTaken,
        });
        setResultsData(result);
        setPhase("results");
      } catch (err) {
        console.error(err);
      }
    });
  };

  const bestScore = quiz.attempts.length > 0 ? Math.max(...quiz.attempts.map((a) => a.score)) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back to Hub Header Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/study-hub"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Study Hub
        </Link>
        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
          StudyAI Quiz Module
        </span>
      </div>

      {/* ─── PHASE 1: START SCREEN ───────────────────────────────────────── */}
      {phase === "start" && (
        <Card className="glass border-white/5 shadow-none overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="p-8 text-center space-y-6 flex flex-col items-center">
            <div className="p-4 bg-primary/10 rounded-full border border-primary/20 text-glow">
              <Brain className="w-10 h-10 text-primary" />
            </div>

            <div className="space-y-2 max-w-md">
              <h2 className="text-2xl font-extrabold text-white tracking-tight">{quiz.title}</h2>
              {quiz.syllabus && (
                <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> {quiz.syllabus.fileName}
                </p>
              )}
            </div>

            {/* Quiz Info Badges */}
            <div className="grid grid-cols-3 gap-4 w-full max-w-sm py-4 border-y border-white/5">
              <div className="text-center">
                <span className="block text-[10px] uppercase font-bold text-muted-foreground">Questions</span>
                <span className="text-sm font-semibold text-white">{quiz.questions.length}</span>
              </div>
              <div className="text-center">
                <span className="block text-[10px] uppercase font-bold text-muted-foreground">Type</span>
                <span className="text-sm font-semibold text-white capitalize">
                  {quiz.questions[0]?.type === "mcq" ? "Multiple Choice" : quiz.questions[0]?.type || "Quiz"}
                </span>
              </div>
              <div className="text-center">
                <span className="block text-[10px] uppercase font-bold text-muted-foreground">Best Score</span>
                <span className={cn("text-sm font-semibold text-white", bestScore !== null && "text-green-400")}>
                  {bestScore !== null ? `${bestScore.toFixed(0)}%` : "N/A"}
                </span>
              </div>
            </div>

            <Button onClick={handleStart} className="w-full sm:w-48 bg-primary hover:bg-primary/80 text-xs font-semibold py-5">
              Start Quiz
            </Button>
          </div>
        </Card>
      )}

      {/* ─── PHASE 2: TAKING QUIZ ────────────────────────────────────────── */}
      {phase === "taking" && currentQuestion && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Progress Bar & Timer */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
                <span>
                  Question {currentQuestionIndex + 1} of {quiz.questions.length}
                </span>
                <span>{Math.round(((currentQuestionIndex + 1) / quiz.questions.length) * 100)}%</span>
              </div>
              {/* Progress Slider Track */}
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-white shrink-0">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>{formatTime(timeTaken)}</span>
            </div>
          </div>

          {/* Question Card */}
          <Card className="glass border-white/5 shadow-none overflow-hidden min-h-[220px] flex flex-col justify-between p-6">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-bold text-primary uppercase tracking-wider">
                {currentQuestion.type}
              </span>
              <h3 className="text-base font-bold text-white leading-snug">{currentQuestion.text}</h3>
            </div>

            {/* MCQ Answers Options */}
            {currentQuestion.type === "mcq" && (
              <div className="grid grid-cols-1 gap-3 mt-6">
                {currentQuestion.options.map((option, idx) => {
                  const label = ["A", "B", "C", "D"][idx];
                  const isSelected = answers[currentQuestion.id] === option;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectMCQ(option)}
                      className={cn(
                        "w-full text-left p-3.5 rounded-xl border transition-all text-xs flex items-center gap-3",
                        isSelected
                          ? "bg-primary/10 border-primary shadow-[0_0_15px_rgba(99,102,241,0.15)] text-white"
                          : "bg-white/[0.02] border-white/5 text-muted-foreground hover:text-white hover:border-white/10"
                      )}
                    >
                      <span
                        className={cn(
                          "w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 border",
                          isSelected
                            ? "bg-primary border-primary text-white"
                            : "bg-white/5 border-white/10 text-muted-foreground"
                        )}
                      >
                        {label}
                      </span>
                      <span className="flex-1">{option}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Flashcard Component (With flipping) */}
            {currentQuestion.type === "flashcard" && (
              <div className="my-6 flex flex-col items-center justify-center">
                <div
                  className="w-full max-w-sm h-48 cursor-pointer relative"
                  style={{ perspective: "1000px" }}
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  <div
                    className="w-full h-full rounded-2xl transition-all duration-500 transform-style-3d relative"
                    style={{
                      transformStyle: "preserve-3d",
                      transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    }}
                  >
                    {/* Front Side */}
                    <div
                      className="absolute inset-0 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col items-center justify-center p-6 text-center"
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      <p className="text-xs text-muted-foreground mb-4 uppercase tracking-wider font-semibold">
                        Question (Click to flip)
                      </p>
                      <p className="text-sm text-white font-medium">{currentQuestion.text}</p>
                    </div>

                    {/* Back Side */}
                    <div
                      className="absolute inset-0 bg-primary/10 border border-primary/30 rounded-2xl flex flex-col items-center justify-center p-6 text-center rotate-y-180"
                      style={{
                        backfaceVisibility: "hidden",
                        transform: "rotateY(180deg)",
                      }}
                    >
                      <p className="text-[10px] text-primary mb-3 uppercase tracking-wider font-bold">
                        Answer
                      </p>
                      <p className="text-sm text-white font-semibold leading-relaxed">
                        {currentQuestion.answer}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Got it / Didn't get it grading (Only show when flipped) */}
                {isFlipped && (
                  <div className="flex items-center gap-4 mt-6 animate-in fade-in duration-300">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-9 border-destructive/20 text-destructive hover:bg-destructive/10"
                      onClick={() => handleSelfGradeFlashcard(false)}
                    >
                      Didn&apos;t get it ✗
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="text-xs h-9 bg-green-500 hover:bg-green-600 text-white"
                      onClick={() => handleSelfGradeFlashcard(true)}
                    >
                      Got it ✓
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Short Answer Component */}
            {currentQuestion.type === "short" && (
              <div className="mt-6 space-y-4">
                {!isAnswered ? (
                  <form onSubmit={handleSubmitShortAnswer} className="space-y-3">
                    <textarea
                      value={shortAnswerText}
                      onChange={(e) => setShortAnswerText(e.target.value)}
                      placeholder="Type your answer here..."
                      rows={4}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary text-xs"
                      required
                    />
                    <Button type="submit" size="sm" className="text-xs h-8 bg-primary hover:bg-primary/80">
                      Submit Answer
                    </Button>
                  </form>
                ) : (
                  <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-white">
                    <span className="block text-[10px] uppercase font-bold text-primary mb-1">Your Submitted Answer</span>
                    {answers[currentQuestion.id]}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Navigation Bar */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-[10px] text-muted-foreground">
              {isAnswered ? "✓ Answered" : "⏳ Awaiting answer"}
            </span>

            <Button
              onClick={handleNext}
              disabled={!isAnswered || isPending}
              className="text-xs gap-1.5 h-9 bg-primary"
            >
              {currentQuestionIndex === quiz.questions.length - 1 ? (
                isPending ? "Submitting..." : "Finish Quiz"
              ) : (
                <>
                  Next Question <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ─── PHASE 3: RESULTS SCREEN ─────────────────────────────────────── */}
      {phase === "results" && resultsData && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <Card className="glass border-white/5 shadow-none overflow-hidden">
            <div className="p-8 text-center flex flex-col items-center space-y-6">
              <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full">
                <Trophy className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-bold text-white tracking-tight">Quiz Completed!</h2>
                <p className="text-xs text-muted-foreground">You study session was cataloged</p>
              </div>

              {/* Progress Ring and Stats */}
              <div className="flex flex-col sm:flex-row items-center gap-8 py-4 w-full justify-center">
                {/* SVG Progress Circle */}
                <div className="relative flex items-center justify-center">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle cx="64" cy="64" r="54" className="stroke-white/5 fill-none" strokeWidth="8" />
                    <circle
                      cx="64"
                      cy="64"
                      r="54"
                      className="stroke-primary fill-none transition-all duration-1000 ease-out"
                      strokeWidth="8"
                      strokeDasharray={2 * Math.PI * 54}
                      strokeDashoffset={2 * Math.PI * 54 - (resultsData.score / 100) * (2 * Math.PI * 54)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-xl font-extrabold text-white">{resultsData.score.toFixed(0)}%</span>
                    <span className="text-[9px] text-muted-foreground uppercase font-bold">Score</span>
                  </div>
                </div>

                <div className="space-y-3 text-left">
                  <div className="text-xs text-muted-foreground">
                    <span className="block text-[9px] uppercase font-bold text-muted-foreground/60">Correct Answers</span>
                    <span className="text-sm font-semibold text-white">
                      {resultsData.correct} / {resultsData.totalQ} questions
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="block text-[9px] uppercase font-bold text-muted-foreground/60">Time Taken</span>
                    <span className="text-sm font-semibold text-white">{formatTime(timeTaken)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <div className="p-1 bg-yellow-500/10 border border-yellow-500/20 rounded-md text-yellow-400">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="block text-[9px] uppercase font-bold text-muted-foreground/60">XP Earned</span>
                      <span className="text-sm font-bold text-yellow-400">+{resultsData.xpEarned} XP</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm pt-2">
                <Button variant="outline" onClick={handleStart} className="flex-1 text-xs h-9 border-white/10">
                  <RotateCcw className="w-3.5 h-3.5 mr-1" /> Retry Quiz
                </Button>
                <Link href="/study-hub" className="flex-1">
                  <Button variant="default" className="w-full text-xs h-9 bg-primary">
                    Back to Study Hub
                  </Button>
                </Link>
              </div>
            </div>
          </Card>

          {/* Per Question Breakdown */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Question Breakdown</h3>

            <div className="space-y-3">
              {quiz.questions.map((question, index) => {
                const answerRes = resultsData.results[question.id];
                const isCorrect = answerRes?.correct;

                return (
                  <Card key={question.id} className="glass border-white/5 shadow-none p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-semibold text-white">
                        {index + 1}. {question.text}
                      </span>
                      {isCorrect ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-t border-white/5 pt-3">
                      <div>
                        <span className="block text-[9px] uppercase font-bold text-muted-foreground mb-1">Your Answer</span>
                        <span className={cn(isCorrect ? "text-green-400" : "text-destructive font-medium")}>
                          {answers[question.id] || "No answer submitted"}
                        </span>
                      </div>
                      {!isCorrect && (
                        <div>
                          <span className="block text-[9px] uppercase font-bold text-muted-foreground mb-1">Correct Answer</span>
                          <span className="text-green-400 font-medium">{question.answer}</span>
                        </div>
                      )}
                    </div>

                    {question.explanation && (
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-muted-foreground leading-relaxed mt-2">
                        <span className="block text-[9px] uppercase font-bold text-white mb-1">Explanation</span>
                        {question.explanation}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
