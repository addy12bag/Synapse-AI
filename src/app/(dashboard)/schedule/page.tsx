import { ScheduleView } from "@/components/ScheduleView";
import { getOrCreateUser } from "@/lib/user";
import { prisma } from "@/lib/db";

import { Schedule, Subject } from "@prisma/client";

export default async function SchedulePage() {
  const user = await getOrCreateUser();
  let slots: (Schedule & { subject: Subject | null })[] = [];
  let subjects: Subject[] = [];

  if (user) {
    slots = await prisma.schedule.findMany({
      where: { userId: user.id },
      include: { subject: true },
      orderBy: [
        { date: "asc" },
        { startTime: "asc" }
      ]
    });
    
    subjects = await prisma.subject.findMany({
      where: { userId: user.id }
    });
  }

  return (
    <ScheduleView initialSlots={slots} subjects={subjects} />
  );
}
