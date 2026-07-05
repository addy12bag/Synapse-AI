import { UserButton } from "@clerk/nextjs";
import { NotificationDropdown } from "./NotificationDropdown";

export function TopBar() {
  return (
    <div className="h-16 border-b border-white/5 bg-background/50 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex-1">
        {/* We can add breadcrumbs or page title here later */}
      </div>
      <div className="flex items-center gap-4">
        <NotificationDropdown />
        <UserButton 
          appearance={{
            elements: {
              userButtonAvatarBox: "w-8 h-8 rounded-full border border-white/10"
            }
          }}
        />
      </div>
    </div>
  );
}
