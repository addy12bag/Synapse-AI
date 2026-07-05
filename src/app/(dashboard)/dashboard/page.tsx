import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Flame, BookOpen, Target, Timer, Calendar, ChevronRight, GraduationCap, Brain } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import { getOrCreateUser } from "@/lib/user";
import { prisma } from "@/lib/db";
import { Schedule, Subject } from "@prisma/client";

export default async function DashboardPage() {
  const user = await getOrCreateUser();
  
  let hoursToday = "0.0";
  let streak = 0;
  let activeSubjectsCount = 0;
  let subjectListStr = "No subjects cataloged";
  let hoursThisWeek = 0;
  let progressPercent = 0;
  let scheduleSlots: (Schedule & { subject: Subject | null })[] = [];
  
  if (user) {
    // 1. Today's study hours
    const todayLocal = new Date();
    todayLocal.setHours(0, 0, 0, 0);
    const sessionsToday = await prisma.studySession.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: todayLocal }
      }
    });
    const totalMinToday = sessionsToday.reduce((acc, curr) => acc + curr.durationMin, 0);
    hoursToday = (totalMinToday / 60).toFixed(1);

    // 2. Streak
    const leaderboard = await prisma.leaderboardEntry.findUnique({
      where: { userId: user.id }
    });
    streak = leaderboard?.streak || 0;

    // 3. Active subjects count
    activeSubjectsCount = await prisma.subject.count({
      where: { userId: user.id }
    });
    const subjects = await prisma.subject.findMany({
      where: { userId: user.id },
      select: { name: true },
      take: 3
    });
    if (subjects.length > 0) {
      subjectListStr = subjects.map(s => s.name).join(', ');
    }

    // 4. Weekly Goal progress
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const sessionsThisWeek = await prisma.studySession.findMany({
      where: {
        userId: user.id,
        createdAt: { gte: startOfWeek }
      }
    });
    const totalMinThisWeek = sessionsThisWeek.reduce((acc, curr) => acc + curr.durationMin, 0);
    hoursThisWeek = Math.round(totalMinThisWeek / 60);
    progressPercent = Math.min(Math.round((hoursThisWeek / 20) * 100), 100);

    // 5. Today's schedule slots (UTC Midnight matched)
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);
    scheduleSlots = await prisma.schedule.findMany({
      where: {
        userId: user.id,
        date: {
          gte: todayUTC,
          lt: new Date(todayUTC.getTime() + 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { startTime: "asc" },
      include: { subject: true }
    });
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-white text-glow">
          Welcome back, {user?.name?.split(" ")[0] || "Student"}
        </h1>
        <p className="text-muted-foreground">Here is an overview of your study progress today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass border-white/5 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Hours Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{hoursToday}h</div>
            <p className="text-xs text-muted-foreground mt-1">
              Keep pushing toward your goals!
            </p>
          </CardContent>
        </Card>
        <Card className="glass border-white/5 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{streak} {streak === 1 ? "Day" : "Days"}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {streak > 0 ? "You're doing great!" : "Study today to start your streak!"}
            </p>
          </CardContent>
        </Card>
        <Card className="glass border-white/5 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Curriculum Hub</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{activeSubjectsCount}</div>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {subjectListStr}
            </p>
          </CardContent>
        </Card>
        <Card className="glass border-white/5 shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weekly Goal</CardTitle>
            <Target className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{hoursThisWeek} / 20h</div>
            <Progress value={progressPercent} className="h-2 mt-3 bg-white/10" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 glass border-white/5 shadow-none">
          <CardHeader>
            <CardTitle className="text-white">Today&apos;s Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {scheduleSlots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                <Calendar className="w-10 h-10 text-muted-foreground opacity-60" />
                <p className="text-sm text-muted-foreground">No tasks scheduled for today.</p>
                <Link href="/schedule">
                  <span className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1">
                    Go to Schedule <ChevronRight className="w-3 h-3" />
                  </span>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {scheduleSlots.map((slot) => (
                  <div 
                    key={slot.id} 
                    className={`flex items-center p-3 rounded-xl transition-all ${slot.isCompleted ? 'opacity-50 bg-white/0' : 'bg-white/5 hover:bg-white/10'}`}
                  >
                    <div className="w-1.5 h-10 rounded-full mr-4" style={{ backgroundColor: slot.subject?.color || '#6366f1' }}></div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">{slot.startTime} - {slot.endTime}</p>
                      <p className="text-sm font-medium text-white">{slot.title}</p>
                    </div>
                    {slot.isCompleted && (
                      <div className="ml-auto font-medium text-xs text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full border border-green-500/20">
                        Completed
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-3 glass border-white/5 shadow-none">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Link 
              href="/timer" 
              className="w-full text-left px-4 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all flex items-center gap-3 group"
            >
              <div className="p-2 bg-primary/20 rounded-lg group-hover:bg-primary/30 transition-colors">
                <Timer className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-medium text-white">Start Custom Timer</div>
                <div className="text-xs text-muted-foreground">Focus with flexible countdown intervals</div>
              </div>
            </Link>

            <Link 
              href="/study-hub" 
              className="w-full text-left px-4 py-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all flex items-center gap-3 group"
            >
              <div className="p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                <GraduationCap className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="font-medium text-white">Upload Study Material</div>
                <div className="text-xs text-muted-foreground">Upload docs and generate AI quizzes</div>
              </div>
            </Link>

            <Link 
              href="/study-hub" 
              className="w-full text-left px-4 py-3 rounded-xl bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 transition-all flex items-center gap-3 group"
            >
              <div className="p-2 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition-colors">
                <Brain className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="font-medium text-white">Take a Quiz</div>
                <div className="text-xs text-muted-foreground">Test your knowledge with AI-generated quizzes</div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
