import { useAuth } from "@/components/layout/Layout";
import { useMPConnection } from "@/hooks/useMPPayments";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Link2, Link2Off, RefreshCw, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

const ML_CLIENT_ID = import.meta.env.VITE_MP_CLIENT_ID || "2782263727604284";
const ML_REDIRECT_URI = import.meta.env.VITE_MP_REDIRECT_URI || `${window.location.origin}/callback`;

export default function Conta() {
  const { user, nickname } = useAuth();
  const { data: connection } = useMPConnection(user?.id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleReconnect = () => {
    const url = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${ML_CLIENT_ID}&redirect_uri=${encodeURIComponent(ML_REDIRECT_URI)}`;
    window.location.href = url;
  };

  const handleDisconnect = async () => {
    if (!user) return;
    const { error } = await supabase.from("mp_connections").delete().eq("user_id", user.id);
    if (error) {
      toast.error("Erro ao desconectar");
    } else {
      toast.success("Mercado Livre desconectado");
      queryClient.invalidateQueries({ queryKey: ["mp-connection"] });
      navigate("/connect");
    }
  };

  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Minha Conta</h1>

      <div className="bg-card rounded-lg border shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-lg font-bold">
            <User className="h-6 w-6" />
          </div>
          <div>
            <p className="font-medium text-foreground">{user?.user_metadata?.full_name || "Usuário"}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Link2 className="h-5 w-5" /> Conexão Mercado Livre
        </h2>
        {connection ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-success">Conectado</Badge>
              <span className="text-sm text-foreground">{connection.nickname || "—"}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              MP User ID: {connection.mp_user_id} · Token válido até:{" "}
              {format(new Date(connection.expires_at), "dd/MM/yyyy HH:mm")}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReconnect} className="gap-1">
                <RefreshCw className="h-3 w-3" /> Reconectar
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDisconnect} className="gap-1">
                <Link2Off className="h-3 w-3" /> Desconectar
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Nenhuma conta conectada.</p>
        )}
      </div>

      <div className="bg-card rounded-lg border shadow-sm p-6 space-y-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <CreditCard className="h-5 w-5" /> Plano Atual
        </h2>
        <Badge variant="secondary">Gratuito</Badge>
        <p className="text-sm text-muted-foreground">
          Em breve teremos planos com funcionalidades avançadas.
        </p>
      </div>
    </div>
  );
}
