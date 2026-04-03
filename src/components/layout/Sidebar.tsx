import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  BarChart3,
  ShoppingCart,
  DollarSign,
  Calculator,
  TrendingUp,
  MessageCircle,
  User,
  LogOut,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

const navItems = [
  { title: "Vendas ao Vivo", url: "/app/vendas", icon: BarChart3 },
  { title: "Marketplaces", url: "/app/marketplaces", icon: ShoppingCart },
  { title: "Custos & Impostos", url: "/app/custos", icon: DollarSign },
  { title: "Calculadoras", url: "/app/calculadoras", icon: Calculator },
  { title: "DRE", url: "/app/dre", icon: TrendingUp },
];

const footerItems = [
  { title: "Suporte", url: "#", icon: MessageCircle },
  { title: "Conta", url: "/app/conta", icon: User },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Desconectado com sucesso");
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="p-4 flex items-center gap-2">
        <Zap className="h-6 w-6 text-sidebar-primary shrink-0" />
        {!collapsed && <span className="text-lg font-bold text-sidebar-foreground">MetriFlow</span>}
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                      activeClassName="text-sidebar-primary border-l-2 border-sidebar-primary bg-sidebar-accent"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {footerItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  className="flex items-center gap-3 px-3 py-2 text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
                  activeClassName="text-sidebar-primary"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
