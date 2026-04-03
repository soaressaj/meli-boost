import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "./Layout";
import { Bell, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  const { nickname } = useAuth();

  return (
    <header className="h-14 flex items-center justify-between border-b bg-card px-4">
      <SidebarTrigger className="text-foreground" />
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Settings className="h-4 w-4" />
        </Button>
        {nickname && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
              {nickname.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium text-foreground hidden md:inline">{nickname}</span>
          </div>
        )}
      </div>
    </header>
  );
}
