import { useEffect, useState, createContext, useContext } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { AppSidebar } from "./Sidebar";
import { Header } from "./Header";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Loader2 } from "lucide-react";

interface AuthContextValue {
  user: User | null;
  nickname: string | null;
}

const AuthContext = createContext<AuthContextValue>({ user: null, nickname: null });
export const useAuth = () => useContext(AuthContext);

export default function Layout() {
  const [user, setUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/login");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/login");
      } else {
        // Check ML connection
        supabase
          .from("mp_connections")
          .select("nickname")
          .eq("user_id", session.user.id)
          .single()
          .then(({ data }) => {
            if (!data) {
              navigate("/connect");
            } else {
              setNickname(data.nickname);
            }
            setLoading(false);
          });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, nickname }}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <Header />
            <main className="flex-1 p-4 md:p-6 overflow-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AuthContext.Provider>
  );
}
