"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/user";

// ─── CURRICULUM HUB (SUBJECTS & TOPICS) ───────────────────────────────────

export async function addSubject(formData: {
  name: string;
  color: string;
  targetHours: number;
  priority: number;
}) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  const subject = await prisma.subject.create({
    data: {
      userId: user.id,
      name: formData.name,
      color: formData.color,
      targetHours: Number(formData.targetHours),
      priority: Number(formData.priority),
    },
  });

  revalidatePath("/subjects");
  revalidatePath("/dashboard");
  return subject;
}

export async function deleteSubject(subjectId: string) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  // Verify ownership
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
  });

  if (!subject || subject.userId !== user.id) {
    throw new Error("Unauthorized");
  }

  // Delete all topics first, then subject (handled by relations or manually)
  await prisma.topic.deleteMany({
    where: { subjectId },
  });

  await prisma.studySession.deleteMany({
    where: { subjectId },
  });

  await prisma.schedule.deleteMany({
    where: { subjectId },
  });

  await prisma.subject.delete({
    where: { id: subjectId },
  });

  revalidatePath("/subjects");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function addTopic(subjectId: string, title: string) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
  });

  if (!subject || subject.userId !== user.id) {
    throw new Error("Unauthorized");
  }

  // Get max order
  const lastTopic = await prisma.topic.findFirst({
    where: { subjectId },
    orderBy: { order: "desc" },
  });
  const order = lastTopic ? lastTopic.order + 1 : 0;

  const topic = await prisma.topic.create({
    data: {
      subjectId,
      title,
      order,
    },
  });

  revalidatePath("/subjects");
  return topic;
}

export async function toggleTopic(topicId: string, completed: boolean) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: { subject: true },
  });

  if (!topic || topic.subject.userId !== user.id) {
    throw new Error("Unauthorized");
  }

  const updated = await prisma.topic.update({
    where: { id: topicId },
    data: { completed },
  });

  revalidatePath("/subjects");
  return updated;
}

// ─── SCHEDULE HUB ─────────────────────────────────────────────────────────

export async function addScheduleSlot(formData: {
  title: string;
  subjectId: string | null;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
}) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  const slot = await prisma.schedule.create({
    data: {
      userId: user.id,
      title: formData.title,
      subjectId: formData.subjectId || null,
      date: new Date(formData.date),
      startTime: formData.startTime,
      endTime: formData.endTime,
      isCompleted: false,
      isAIGenerated: false,
    },
  });

  revalidatePath("/schedule");
  revalidatePath("/dashboard");
  return slot;
}

export async function toggleScheduleSlot(slotId: string, isCompleted: boolean) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  const slot = await prisma.schedule.findUnique({
    where: { id: slotId },
  });

  if (!slot || slot.userId !== user.id) {
    throw new Error("Unauthorized");
  }

  const updated = await prisma.schedule.update({
    where: { id: slotId },
    data: { isCompleted },
  });

  revalidatePath("/schedule");
  revalidatePath("/dashboard");
  return updated;
}

export async function deleteScheduleSlot(slotId: string) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  const slot = await prisma.schedule.findUnique({
    where: { id: slotId },
  });

  if (!slot || slot.userId !== user.id) {
    throw new Error("Unauthorized");
  }

  await prisma.schedule.delete({
    where: { id: slotId },
  });

  revalidatePath("/schedule");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function generateSchedule() {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  // Get active subjects
  const subjects = await prisma.subject.findMany({
    where: { userId: user.id },
    orderBy: { priority: "asc" }, // 1 is highest priority
  });

  if (subjects.length === 0) {
    return { error: "No subjects found. Add some subjects first!" };
  }

  // Delete previous AI-generated slots
  await prisma.schedule.deleteMany({
    where: {
      userId: user.id,
      isAIGenerated: true,
    },
  });

  // Simple daily study slot algorithm
  // Generates 2 slots per day for the next 7 days based on subject priority
  const days = 7;
  const createdSlots = [];
  const startHours = ["09:00", "15:00"];
  const endHours = ["11:00", "17:00"];

  for (let d = 0; d < days; d++) {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() + d);

    // Pick 2 subjects for this day based on index
    for (let slotIndex = 0; slotIndex < 2; slotIndex++) {
      // Pick subject based on priorities (higher priority gets more weight)
      // For simplicity, cycle through subjects with priority influence
      const subjectsPool = [...subjects];
      // Sort subjects: priority 1 appears more often
      const chosenSubject = subjectsPool[(d * 2 + slotIndex) % subjectsPool.length];

      const slot = await prisma.schedule.create({
        data: {
          userId: user.id,
          title: `Study Session: ${chosenSubject.name}`,
          subjectId: chosenSubject.id,
          date,
          startTime: startHours[slotIndex],
          endTime: endHours[slotIndex],
          isCompleted: false,
          isAIGenerated: true,
        },
      });
      createdSlots.push(slot);
    }
  }

  revalidatePath("/schedule");
  revalidatePath("/dashboard");
  return { success: true, count: createdSlots.length };
}

// ─── FOCUS TIMER & STUDY SESSIONS ────────────────────────────────────────

export async function logStudySession(formData: {
  subjectId: string | null;
  durationMin: number;
  notes?: string;
}) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  const session = await prisma.studySession.create({
    data: {
      userId: user.id,
      subjectId: formData.subjectId || null,
      startTime: new Date(Date.now() - formData.durationMin * 60 * 1000),
      endTime: new Date(),
      durationMin: formData.durationMin,
      type: "pomodoro",
      notes: formData.notes || "Pomodoro Session completed",
    },
  });

  // Update User Leaderboard/XP & Streak
  let leaderboard = await prisma.leaderboardEntry.findUnique({
    where: { userId: user.id },
  });

  const xpEarned = formData.durationMin * 10; // 10 XP per minute of study

  if (!leaderboard) {
    leaderboard = await prisma.leaderboardEntry.create({
      data: {
        userId: user.id,
        totalXP: xpEarned,
        weeklyXP: xpEarned,
        streak: 1,
        level: 1,
      },
    });
  } else {
    // Check if last study session was yesterday or today
    const lastSession = await prisma.studySession.findFirst({
      where: {
        userId: user.id,
        id: { not: session.id },
      },
      orderBy: { createdAt: "desc" },
    });

    let newStreak = leaderboard.streak;
    if (lastSession) {
      const lastDate = new Date(lastSession.createdAt).toDateString();
      const todayDate = new Date().toDateString();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDate = yesterday.toDateString();

      if (lastDate === yesterdayDate) {
        newStreak += 1;
      } else if (lastDate !== todayDate) {
        // Streak broken
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    const newTotalXP = leaderboard.totalXP + xpEarned;
    const newLevel = Math.floor(newTotalXP / 1000) + 1; // 1000 XP per level

    await prisma.leaderboardEntry.update({
      where: { userId: user.id },
      data: {
        totalXP: newTotalXP,
        weeklyXP: leaderboard.weeklyXP + xpEarned,
        streak: newStreak,
        level: newLevel,
      },
    });
  }

  revalidatePath("/progress");
  revalidatePath("/dashboard");
  return session;
}

// ─── PHASE 2: SYLLABUS / DOCUMENT MANAGEMENT ─────────────────────────────

export async function createSyllabus(formData: {
  fileName: string;
  fileUrl: string;
  parsedText: string;
  subjectId?: string | null;
}) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  const syllabus = await prisma.syllabus.create({
    data: {
      userId: user.id,
      fileName: formData.fileName,
      fileUrl: formData.fileUrl,
      parsedText: formData.parsedText || "",
      subjectId: formData.subjectId || null,
      status: formData.parsedText ? "done" : "failed",
    },
  });

  // Chunk the parsed text into ~500-word segments
  if (formData.parsedText) {
    const words = formData.parsedText.split(/\s+/);
    const chunkSize = 500;
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(" "));
    }

    for (let i = 0; i < chunks.length; i++) {
      await prisma.syllabusChunk.create({
        data: {
          syllabusId: syllabus.id,
          content: chunks[i],
          chunkIndex: i,
          embedding: [], // placeholder – no vector search for now
        },
      });
    }
  }

  revalidatePath("/study-hub");
  revalidatePath("/dashboard");
  return syllabus;
}

export async function deleteSyllabus(syllabusId: string) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  const syllabus = await prisma.syllabus.findUnique({
    where: { id: syllabusId },
  });

  if (!syllabus || syllabus.userId !== user.id) {
    throw new Error("Unauthorized");
  }

  // Cascade: chunks, quiz questions, quiz attempts, quizzes
  const quizzes = await prisma.quiz.findMany({
    where: { syllabusId },
    select: { id: true },
  });
  const quizIds = quizzes.map((q) => q.id);

  if (quizIds.length > 0) {
    await prisma.quizAttempt.deleteMany({ where: { quizId: { in: quizIds } } });
    await prisma.question.deleteMany({ where: { quizId: { in: quizIds } } });
    await prisma.quiz.deleteMany({ where: { id: { in: quizIds } } });
  }

  await prisma.syllabusChunk.deleteMany({ where: { syllabusId } });
  await prisma.syllabus.delete({ where: { id: syllabusId } });

  revalidatePath("/study-hub");
  revalidatePath("/dashboard");
  return { success: true };
}

// ─── PHASE 2: QUIZ GENERATION ────────────────────────────────────────────

export async function generateQuiz(formData: {
  syllabusId: string;
  title: string;
  numQuestions: number;
  questionType: "mcq" | "flashcard" | "short";
}) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  const syllabus = await prisma.syllabus.findUnique({
    where: { id: formData.syllabusId },
    include: { chunks: { orderBy: { chunkIndex: "asc" } } },
  });

  if (!syllabus || syllabus.userId !== user.id) {
    throw new Error("Unauthorized or syllabus not found");
  }

  // Combine chunks for context
  const fullText = syllabus.chunks.map((c) => c.content).join("\n\n");

  if (!fullText.trim()) {
    throw new Error("Syllabus has no parsed text to generate questions from.");
  }

  const { generateQuizQuestions } = await import("@/lib/ai");
  const questions = await generateQuizQuestions(
    fullText,
    formData.numQuestions,
    formData.questionType
  );

  if (questions.length === 0) {
    throw new Error("AI failed to generate quiz questions. Please try again.");
  }

  const quiz = await prisma.quiz.create({
    data: {
      title: formData.title,
      subjectId: syllabus.subjectId,
      syllabusId: syllabus.id,
      isAIGenerated: true,
    },
  });

  for (let i = 0; i < questions.length; i++) {
    await prisma.question.create({
      data: {
        quizId: quiz.id,
        text: questions[i].text,
        type: questions[i].type,
        options: questions[i].options,
        answer: questions[i].answer,
        explanation: questions[i].explanation || "",
        order: i,
      },
    });
  }

  revalidatePath("/study-hub");
  return quiz;
}

export async function submitQuizAttempt(formData: {
  quizId: string;
  answers: Record<string, string>;
  timeTaken: number;
}) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  const quiz = await prisma.quiz.findUnique({
    where: { id: formData.quizId },
    include: { questions: true },
  });

  if (!quiz) throw new Error("Quiz not found");

  // Score the attempt
  let correct = 0;
  const results: Record<string, { correct: boolean; correctAnswer: string; explanation: string }> = {};

  for (const question of quiz.questions) {
    const userAnswer = formData.answers[question.id] || "";
    const isCorrect =
      userAnswer.trim().toLowerCase() === question.answer.trim().toLowerCase();
    if (isCorrect) correct++;
    results[question.id] = {
      correct: isCorrect,
      correctAnswer: question.answer,
      explanation: question.explanation || "",
    };

    // Spaced Repetition Card Update
    try {
      const grade = isCorrect ? 5 : 1;
      const existingCard = await prisma.spacedRepetitionCard.findUnique({
        where: {
          userId_questionId: {
            userId: user.id,
            questionId: question.id,
          },
        },
      });

      let interval = 0;
      let repetitions = 0;
      let easiness = 2.5;

      if (existingCard) {
        interval = existingCard.interval;
        repetitions = existingCard.repetitions;
        easiness = existingCard.easiness;
      }

      if (grade >= 3) {
        if (repetitions === 0) {
          interval = 1;
        } else if (repetitions === 1) {
          interval = 6;
        } else {
          interval = Math.round(interval * easiness);
        }
        repetitions++;
      } else {
        repetitions = 0;
        interval = 1;
      }

      easiness = easiness + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
      if (easiness < 1.3) easiness = 1.3;

      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + interval);

      await prisma.spacedRepetitionCard.upsert({
        where: {
          userId_questionId: {
            userId: user.id,
            questionId: question.id,
          },
        },
        create: {
          userId: user.id,
          questionId: question.id,
          interval,
          repetitions,
          easiness,
          nextReview,
          lastReviewed: new Date(),
        },
        update: {
          interval,
          repetitions,
          easiness,
          nextReview,
          lastReviewed: new Date(),
        },
      });
    } catch (err) {
      console.error("Spaced repetition card update failed:", err);
    }
  }

  const totalQ = quiz.questions.length;
  const score = totalQ > 0 ? (correct / totalQ) * 100 : 0;

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: user.id,
      quizId: formData.quizId,
      score,
      totalQ,
      answers: formData.answers,
      timeTaken: formData.timeTaken,
    },
  });

  // Run Weakness Analyzer Agent
  try {
    await runWeaknessAnalyzerAgent();
  } catch (err) {
    console.error("Weakness analyzer agent execution failed:", err);
  }

  // Award XP: 50 XP per correct answer
  const xpEarned = correct * 50;
  if (xpEarned > 0) {
    const leaderboard = await prisma.leaderboardEntry.findUnique({
      where: { userId: user.id },
    });

    if (leaderboard) {
      const newTotalXP = leaderboard.totalXP + xpEarned;
      await prisma.leaderboardEntry.update({
        where: { userId: user.id },
        data: {
          totalXP: newTotalXP,
          weeklyXP: leaderboard.weeklyXP + xpEarned,
          level: Math.floor(newTotalXP / 1000) + 1,
        },
      });
    } else {
      await prisma.leaderboardEntry.create({
        data: {
          userId: user.id,
          totalXP: xpEarned,
          weeklyXP: xpEarned,
          streak: 0,
          level: Math.floor(xpEarned / 1000) + 1,
        },
      });
    }
  }

  revalidatePath("/study-hub");
  revalidatePath("/progress");
  return { attempt, results, correct, totalQ, score, xpEarned };
}

export async function deleteQuiz(quizId: string) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { syllabus: true },
  });

  if (!quiz || (quiz.syllabus && quiz.syllabus.userId !== user.id)) {
    throw new Error("Unauthorized");
  }

  await prisma.quizAttempt.deleteMany({ where: { quizId } });
  await prisma.question.deleteMany({ where: { quizId } });
  await prisma.quiz.delete({ where: { id: quizId } });

  revalidatePath("/study-hub");
  return { success: true };
}

// ─── PHASE 2: CHAT ───────────────────────────────────────────────────────

export async function sendDocumentChat(formData: {
  content: string;
  syllabusId: string;
}) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  // Save user message
  await prisma.chatMessage.create({
    data: {
      userId: user.id,
      role: "user",
      content: formData.content,
      subjectId: null,
    },
  });

  // Get syllabus context
  const syllabus = await prisma.syllabus.findUnique({
    where: { id: formData.syllabusId },
    include: { chunks: { orderBy: { chunkIndex: "asc" } } },
  });

  const docContext = syllabus
    ? syllabus.chunks.map((c) => c.content).join("\n\n")
    : "";

  // Get last 10 messages for conversation context
  const recentMessages = await prisma.chatMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const { chatWithDocContext } = await import("@/lib/ai");
  const aiResponse = await chatWithDocContext(
    recentMessages.reverse().map((m) => ({ role: m.role, content: m.content })),
    docContext
  );

  // Save AI response
  const aiMessage = await prisma.chatMessage.create({
    data: {
      userId: user.id,
      role: "assistant",
      content: aiResponse,
      subjectId: syllabus?.subjectId || null,
    },
  });

  return aiMessage;
}

export async function sendTutorMessage(formData: {
  content: string;
  subjectId?: string | null;
}) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  // Save user message
  await prisma.chatMessage.create({
    data: {
      userId: user.id,
      role: "user",
      content: formData.content,
      subjectId: formData.subjectId || null,
    },
  });

  // Get last 10 messages for context
  const recentMessages = await prisma.chatMessage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const { tutorChat } = await import("@/lib/ai");
  const aiResponse = await tutorChat(
    recentMessages.reverse().map((m) => ({ role: m.role, content: m.content }))
  );

  // Save AI response
  const aiMessage = await prisma.chatMessage.create({
    data: {
      userId: user.id,
      role: "assistant",
      content: aiResponse,
      subjectId: formData.subjectId || null,
    },
  });

  return aiMessage;
}

export async function clearChatHistory() {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.chatMessage.deleteMany({
    where: { userId: user.id },
  });

  return { success: true };
}

export async function runWeaknessAnalyzerAgent() {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  // 1. Fetch all quiz attempts for this user
  const attempts = await prisma.quizAttempt.findMany({
    where: { userId: user.id },
    include: {
      quiz: {
        include: {
          subject: true,
          syllabus: true,
        },
      },
    },
    orderBy: { completedAt: "desc" },
  });

  if (attempts.length === 0) return null;

  // 2. Aggregate scores by Syllabus
  const syllabusScores: Record<string, { total: number; count: number; name: string; subjectId: string | null }> = {};
  
  for (const attempt of attempts) {
    if (attempt.quiz.syllabus) {
      const syl = attempt.quiz.syllabus;
      if (!syllabusScores[syl.id]) {
        syllabusScores[syl.id] = { total: 0, count: 0, name: syl.fileName, subjectId: syl.subjectId };
      }
      syllabusScores[syl.id].total += attempt.score;
      syllabusScores[syl.id].count += 1;
    }
  }

  // Find the weakest syllabus (average score < 75%)
  let weakestSyllabusId: string | null = null;
  let weakestScore = 100;
  let weakestName = "";
  let subjectId: string | null = null;

  for (const [id, data] of Object.entries(syllabusScores)) {
    const avg = data.total / data.count;
    if (avg < 75 && avg < weakestScore) {
      weakestScore = avg;
      weakestSyllabusId = id;
      weakestName = data.name;
      subjectId = data.subjectId;
    }
  }

  if (!weakestSyllabusId) {
    return { status: "success", message: "All study materials have strong scores! No weak spots detected." };
  }

  // 3. Check if we already have an AI scheduled review slot for this syllabus in the next 3 days
  const futureSlots = await prisma.schedule.findMany({
    where: {
      userId: user.id,
      title: { startsWith: "🤖 Review:" },
      date: {
        gte: new Date(new Date().setUTCHours(0, 0, 0, 0)),
      },
    },
  });

  const alreadyScheduled = futureSlots.some(
    (slot) => slot.title.includes(weakestName) || (subjectId && slot.subjectId === subjectId)
  );

  if (alreadyScheduled) {
    return {
      status: "info",
      message: `Weakness detected in '${weakestName}' (${weakestScore.toFixed(0)}% avg accuracy), but a review session is already scheduled.`,
    };
  }

  // 4. Create an automated review schedule slot for the next day
  const tomorrow = new Date();
  tomorrow.setUTCHours(0, 0, 0, 0);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  // Pick a free hour slot (11:00 or 15:00 or 19:00)
  const tomorrowsSlots = await prisma.schedule.findMany({
    where: {
      userId: user.id,
      date: {
        gte: tomorrow,
        lt: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000),
      },
    },
  });

  let startTime = "11:00";
  let endTime = "12:00";

  if (tomorrowsSlots.some(s => s.startTime === "11:00")) {
    if (tomorrowsSlots.some(s => s.startTime === "15:00")) {
      startTime = "19:00";
      endTime = "20:00";
    } else {
      startTime = "15:00";
      endTime = "16:00";
    }
  }

  const slot = await prisma.schedule.create({
    data: {
      userId: user.id,
      title: `🤖 Review: ${weakestName} (${weakestScore.toFixed(0)}% accuracy)`,
      subjectId,
      date: tomorrow,
      startTime,
      endTime,
      isCompleted: false,
      isAIGenerated: true,
    },
  });

  revalidatePath("/schedule");
  revalidatePath("/study-hub");
  revalidatePath("/dashboard");

  return {
    status: "scheduled",
    message: `Weakness detected in '${weakestName}' (${weakestScore.toFixed(0)}% avg accuracy). Scheduled review tomorrow at ${startTime}.`,
    slot,
  };
}

export async function getSpacedRepetitionData() {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  const now = new Date();

  // 1. Fetch all spaced repetition cards that are due
  const dueCards = await prisma.spacedRepetitionCard.findMany({
    where: {
      userId: user.id,
      nextReview: {
        lte: now,
      },
    },
    include: {
      question: {
        include: {
          quiz: {
            include: {
              syllabus: true,
            },
          },
        },
      },
    },
    orderBy: { nextReview: "asc" },
  });

  // 2. Fetch total count of cards
  const totalCardsCount = await prisma.spacedRepetitionCard.count({
    where: { userId: user.id },
  });

  // 3. Compute weaknesses from quiz attempts
  const attempts = await prisma.quizAttempt.findMany({
    where: { userId: user.id },
    include: {
      quiz: {
        include: {
          syllabus: true,
          subject: true,
        },
      },
    },
    orderBy: { completedAt: "desc" },
  });

  // Aggregate stats per syllabus/document
  const syllabusStats: Record<
    string,
    {
      syllabusId: string;
      name: string;
      subjectColor: string;
      avgScore: number;
      totalAttempts: number;
      totalQuestions: number;
      wrongAnswersCount: number;
    }
  > = {};

  for (const attempt of attempts) {
    const quiz = attempt.quiz;
    if (quiz.syllabus) {
      const syl = quiz.syllabus;
      if (!syllabusStats[syl.id]) {
        syllabusStats[syl.id] = {
          syllabusId: syl.id,
          name: syl.fileName,
          subjectColor: quiz.subject?.color || "#818cf8",
          avgScore: 0,
          totalAttempts: 0,
          totalQuestions: 0,
          wrongAnswersCount: 0,
        };
      }
      const stats = syllabusStats[syl.id];
      stats.avgScore += attempt.score;
      stats.totalAttempts += 1;
      stats.totalQuestions += attempt.totalQ;
      // Calculate wrong answers
      const correctCount = Math.round((attempt.score / 100) * attempt.totalQ);
      stats.wrongAnswersCount += (attempt.totalQ - correctCount);
    }
  }

  const weaknesses = Object.values(syllabusStats).map((stats) => ({
    ...stats,
    avgScore: Math.round(stats.avgScore / stats.totalAttempts),
  })).sort((a, b) => a.avgScore - b.avgScore); // Weakest first

  // 4. Find the latest AI-generated review slot in the schedule
  const latestAiReviewSlot = await prisma.schedule.findFirst({
    where: {
      userId: user.id,
      isAIGenerated: true,
      title: { startsWith: "🤖 Review:" },
      date: {
        gte: new Date(new Date().setUTCHours(0, 0, 0, 0)),
      },
    },
    orderBy: { date: "asc" },
  });

  let agentLog = "Agent status: Active 🤖 - Ready to analyze learning performance.";
  if (latestAiReviewSlot) {
    const formattedDate = latestAiReviewSlot.date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    agentLog = `Weakness Analyzer Agent scheduled a review session: '${latestAiReviewSlot.title}' on ${formattedDate} at ${latestAiReviewSlot.startTime}.`;
  } else if (weaknesses.length > 0) {
    agentLog = "Weakness Analyzer Agent: All study documents are in excellent standing. Keep it up!";
  }

  return {
    dueCards: dueCards.map((c) => ({
      id: c.id,
      questionId: c.questionId,
      text: c.question.text,
      options: c.question.options,
      answer: c.question.answer,
      explanation: c.question.explanation || "",
      quizTitle: c.question.quiz.title,
      fileName: c.question.quiz.syllabus?.fileName || "Unknown PDF",
      interval: c.interval,
      repetitions: c.repetitions,
      easiness: c.easiness,
      nextReview: c.nextReview,
    })),
    totalCardsCount,
    weaknesses,
    agentLog,
  };
}

export async function reviewSpacedCard(formData: { cardId: string; grade: number }) {
  const user = await getOrCreateUser();
  if (!user) throw new Error("Unauthorized");

  const card = await prisma.spacedRepetitionCard.findUnique({
    where: { id: formData.cardId },
  });

  if (!card || card.userId !== user.id) {
    throw new Error("Card not found");
  }

  const grade = formData.grade; // 5 = got it, 1 = didn't get it

  // Apply SM-2 update
  let interval = card.interval;
  let repetitions = card.repetitions;
  let easiness = card.easiness;

  if (grade >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easiness);
    }
    repetitions++;
  } else {
    repetitions = 0;
    interval = 1;
  }

  easiness = easiness + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (easiness < 1.3) easiness = 1.3;

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  await prisma.spacedRepetitionCard.update({
    where: { id: card.id },
    data: {
      interval,
      repetitions,
      easiness,
      nextReview,
      lastReviewed: new Date(),
    },
  });

  // Award 15 XP for review
  const xpEarned = 15;
  const leaderboard = await prisma.leaderboardEntry.findUnique({
    where: { userId: user.id },
  });

  if (leaderboard) {
    const newTotalXP = leaderboard.totalXP + xpEarned;
    await prisma.leaderboardEntry.update({
      where: { userId: user.id },
      data: {
        totalXP: newTotalXP,
        weeklyXP: leaderboard.weeklyXP + xpEarned,
        level: Math.floor(newTotalXP / 1000) + 1,
      },
    });
  } else {
    await prisma.leaderboardEntry.create({
      data: {
        userId: user.id,
        totalXP: xpEarned,
        weeklyXP: xpEarned,
        streak: 0,
        level: Math.floor(xpEarned / 1000) + 1,
      },
    });
  }

  revalidatePath("/study-hub");
  revalidatePath("/progress");
  revalidatePath("/dashboard");

  return { success: true, nextReview, interval };
}
