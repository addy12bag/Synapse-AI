import { TimerView } from "@/components/TimerView";
import { getOrCreateUser } from "@/lib/user";
import { prisma } from "@/lib/db";

import { Subject } from "@prisma/client";

export default async function TimerPage() {
  const user = await getOrCreateUser();
  let subjects: Pick<Subject, "id" | "name" | "color">[] = [];

  if (user) {
    subjects = await prisma.subject.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, color: true }
    });
  }

  return (
    <TimerView subjects={subjects} />
  );
}
