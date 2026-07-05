import { QuizTakeView } from "@/components/QuizTakeView";
import { getOrCreateUser } from "@/lib/user";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';


interface QuizPageProps {
  params: Promise<{ id: string }>;
}

export default async function QuizPage({ params }: QuizPageProps) {
  const { id } = await params;
  const user = await getOrCreateUser();
  if (!user) return notFound();

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: "asc" } },
      syllabus: { select: { fileName: true } },
      attempts: {
        where: { userId: user.id },
        orderBy: { completedAt: "desc" },
        take: 1,
      },
    },
  });

  if (!quiz) return notFound();

  return <QuizTakeView quiz={quiz} />;
}
