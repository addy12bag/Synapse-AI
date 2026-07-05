import { StudyHubView } from "@/components/StudyHubView";
import { getOrCreateUser } from "@/lib/user";
import { prisma } from "@/lib/db";
import { Syllabus, Subject, Quiz, Question, QuizAttempt, SyllabusChunk } from "@prisma/client";

export default async function StudyHubPage() {
  const user = await getOrCreateUser();
  
  let syllabi: (Syllabus & { 
    subject: Subject | null; 
    chunks: SyllabusChunk[]; 
    quizzes: (Quiz & { questions: Question[]; attempts: QuizAttempt[] })[] 
  })[] = [];
  let subjects: Subject[] = [];

  if (user) {
    syllabi = await prisma.syllabus.findMany({
      where: { userId: user.id },
      include: {
        subject: true,
        chunks: true,
        quizzes: {
          include: {
            questions: true,
            attempts: { where: { userId: user.id }, orderBy: { completedAt: "desc" } }
          }
        }
      },
      orderBy: { uploadedAt: "desc" }
    });
    subjects = await prisma.subject.findMany({ where: { userId: user.id } });
  }

  return <StudyHubView initialSyllabi={syllabi} subjects={subjects} />;
}
