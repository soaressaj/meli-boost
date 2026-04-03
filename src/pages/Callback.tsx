import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Zap } from "lucide-react";

export default function Callback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("Conectando sua conta...");

  useEffect(() => {
    const exchangeToken = async () => {
      const code = searchParams.get("code");
      if (!code) {
        toast.error("Código de autorização não encontrado");
        navigate("/connect");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sessão expirada. Faça login novamente.");
        navigate("/login");
        return;
      }

      setStatus("Trocando código por token...");

      const { data, error } = await supabase.functions.invoke("exchange-token", {
        body: { code },
      });

      if (error || !data?.success) {
        toast.error(data?.error || "Erro ao conectar Mercado Livre");
        navigate("/connect");
        return;
      }

      toast.success("Mercado Livre conectado com sucesso!");
      navigate("/app/vendas");
    };

    exchangeToken();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Zap className="h-12 w-12 text-primary mx-auto animate-pulse-soft" />
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}
