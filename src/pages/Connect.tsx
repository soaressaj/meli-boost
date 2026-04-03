import { Zap, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const ML_CLIENT_ID = import.meta.env.VITE_MP_CLIENT_ID || "";
const ML_REDIRECT_URI = import.meta.env.VITE_MP_REDIRECT_URI || "";

export default function Connect() {
  const handleConnect = () => {
    const url = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${ML_CLIENT_ID}&redirect_uri=${encodeURIComponent(ML_REDIRECT_URI)}`;
    window.location.href = url;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="flex items-center justify-center gap-2">
          <Zap className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">MetriFlow</h1>
        </div>
        <div className="bg-card p-8 rounded-lg shadow-sm border space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Conecte seu Mercado Livre</h2>
            <p className="text-muted-foreground text-sm">
              Para visualizar suas métricas de vendas, conecte sua conta do Mercado Livre via OAuth.
            </p>
          </div>
          <Button onClick={handleConnect} className="w-full gap-2" size="lg">
            <ExternalLink className="h-4 w-4" />
            Conectar Mercado Livre
          </Button>
          <p className="text-xs text-muted-foreground">
            Seus dados são protegidos. Nunca acessamos ou modificamos seus anúncios.
          </p>
        </div>
      </div>
    </div>
  );
}
