import { CurriculumView } from "@/components/CurriculumView";
import { getOrCreateUser } from "@/lib/user";
import { prisma } from "@/lib/db";

import { Subject, Topic } from "@prisma/client";

export default async function SubjectsPage() {
  const user = await getOrCreateUser();
  let subjects: (Subject & { topics: Topic[] })[] = [];

  if (user) {
    subjects = await prisma.subject.findMany({
      where: { userId: user.id },
      include: {
        topics: {
          orderBy: { order: "asc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  return (
    <CurriculumView initialSubjects={subjects} />
  );
}
