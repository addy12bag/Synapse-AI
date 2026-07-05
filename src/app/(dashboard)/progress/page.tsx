import { ProgressView } from "@/components/ProgressView";
import { getOrCreateUser } from "@/lib/user";
import { prisma } from "@/lib/db";

export default async function ProgressPage() {
  const user = await getOrCreateUser();
  
  let chartData: { name: string; hours: number }[] = [];
  let totalHours = "0.0";
  let weeklyDiff = "+0.0h logged in last 7 days";
  let streak = 0;
  
  let hasDeepWork = false;
  let hasEarlyBird = false;
  let hasNightOwl = false;

  if (user) {
    // 1. Fetch study sessions
    const sessions = await prisma.studySession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" }
    });

    // 2. Aggregate hours for the last 7 days
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toDateString();
      
      const daySessions = sessions.filter(s => new Date(s.createdAt).toDateString() === dateString);
      const totalMin = daySessions.reduce((acc, s) => acc + s.durationMin, 0);
      const hours = Number((totalMin / 60).toFixed(1));
      
      chartData.push({
        name: dayNames[date.getDay()],
        hours
      });
    }

    // 3. All time total
    const totalMin = sessions.reduce((acc, s) => acc + s.durationMin, 0);
    totalHours = (totalMin / 60).toFixed(1);

    // 4. Last 7 days total
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const lastWeekSessions = sessions.filter(s => new Date(s.createdAt) >= oneWeekAgo);
    const lastWeekMin = lastWeekSessions.reduce((acc, s) => acc + s.durationMin, 0);
    const lastWeekHours = (lastWeekMin / 60).toFixed(1);
    weeklyDiff = `+${lastWeekHours}h logged in last 7 days`;

    // 5. Streak from leaderboard entry
    const leaderboard = await prisma.leaderboardEntry.findUnique({
      where: { userId: user.id }
    });
    streak = leaderboard?.streak || 0;

    // 6. Check badges milestones
    hasDeepWork = sessions.some(s => s.durationMin >= 60);
    
    hasEarlyBird = sessions.some(s => {
      const time = new Date(s.endTime || s.createdAt);
      const hour = time.getHours();
      return hour >= 4 && hour < 9;
    });

    hasNightOwl = sessions.some(s => {
      const time = new Date(s.endTime || s.createdAt);
      const hour = time.getHours();
      return hour >= 21 || hour < 2;
    });
  } else {
    // Mock fallbacks if user is not loaded
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    chartData = dayNames.map(name => ({ name, hours: 0 }));
  }

  const badges = [
    {
      id: "b1",
      title: "Bronze Streak (1 Wk)",
      description: "Study consistently for 7 days in a row.",
      unlocked: streak >= 7,
      type: "bronze" as const
    },
    {
      id: "b2",
      title: "Silver Streak (2 Wks)",
      description: "Study consistently for 14 days in a row.",
      unlocked: streak >= 14,
      type: "silver" as const
    },
    {
      id: "b3",
      title: "Gold Streak (4 Wks)",
      description: "Study consistently for 30 days in a row.",
      unlocked: streak >= 30,
      type: "gold" as const
    },
    {
      id: "b4",
      title: "Deep Work Pioneer",
      description: "Complete a focus session of 1 hour or more.",
      unlocked: hasDeepWork,
      type: "deep" as const
    },
    {
      id: "b5",
      title: "Early Bird",
      description: "Log a study session between 4:00 AM and 9:00 AM.",
      unlocked: hasEarlyBird,
      type: "early" as const
    },
    {
      id: "b6",
      title: "Night Owl",
      description: "Log a study session between 9:00 PM and 2:00 AM.",
      unlocked: hasNightOwl,
      type: "night" as const
    }
  ];

  return (
    <ProgressView 
      chartData={chartData} 
      totalHours={totalHours} 
      weeklyDiff={weeklyDiff} 
      streak={streak} 
      badges={badges} 
    />
  );
}
