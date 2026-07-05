"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, Trash2, Calendar, Award, Flame, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  read: boolean;
  type: "streak" | "schedule" | "subject" | "general";
}

const defaultNotifications: Notification[] = [
  {
    id: "1",
    title: "Consistent Learner Milestone!",
    description: "You've studied 4 days in a row! Claim your Bronze Streak badge.",
    time: "2 hours ago",
    read: false,
    type: "streak",
  },
  {
    id: "2",
    title: "AI Study Schedule Ready",
    description: "Your smart study schedule was successfully generated. Go check it out!",
    time: "5 hours ago",
    read: false,
    type: "schedule",
  },
  {
    id: "3",
    title: "Subject Catalog Updated",
    description: "You added Data Structures & Algorithms to your Curriculum Hub.",
    time: "1 day ago",
    read: true,
    type: "subject",
  },
];

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load from local storage or set defaults
  useEffect(() => {
    const saved = localStorage.getItem("studyai_notifications");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setTimeout(() => setNotifications(parsed), 0);
      } catch {
        setTimeout(() => setNotifications(defaultNotifications), 0);
      }
    } else {
      setTimeout(() => {
        setNotifications(defaultNotifications);
        localStorage.setItem("studyai_notifications", JSON.stringify(defaultNotifications));
      }, 0);
    }
  }, []);

  const saveNotifications = (updated: Notification[]) => {
    setNotifications(updated);
    localStorage.setItem("studyai_notifications", JSON.stringify(updated));
  };

  const toggleOpen = () => setIsOpen(!isOpen);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const markAsRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    saveNotifications(updated);
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = notifications.filter((n) => n.id !== id);
    saveNotifications(updated);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case "streak":
        return <Flame className="h-4 w-4 text-orange-500" />;
      case "schedule":
        return <Calendar className="h-4 w-4 text-blue-400" />;
      case "subject":
        return <Star className="h-4 w-4 text-primary" />;
      default:
        return <Award className="h-4 w-4 text-green-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleOpen}
        className={cn(
          "p-2 rounded-full hover:bg-white/5 text-muted-foreground hover:text-white transition-colors relative focus:outline-none",
          isOpen && "bg-white/5 text-white"
        )}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(100,50,255,0.8)]"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 glass border border-white/5 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-3 duration-250">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <h3 className="font-bold text-white text-base">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 font-medium transition-colors"
              >
                <Check className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[300px] overflow-y-auto divide-y divide-white/5 py-1 scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No notifications yet. You&apos;re all caught up!
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={cn(
                    "flex gap-3 py-3 px-2 rounded-xl transition-all cursor-pointer group mt-1 hover:bg-white/5",
                    !n.read && "bg-primary/5 border-l-2 border-primary"
                  )}
                >
                  <div className="p-2 rounded-lg bg-white/5 h-fit mt-0.5">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className={cn("text-xs font-semibold", n.read ? "text-white/80" : "text-white font-bold")}>
                        {n.title}
                      </p>
                      <button
                        onClick={(e) => deleteNotification(n.id, e)}
                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {n.description}
                    </p>
                    <span className="text-[10px] text-muted-foreground block">
                      {n.time}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
