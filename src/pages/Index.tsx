import { Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <div className="flex items-center gap-3 mb-6">
        <Zap className="h-10 w-10 text-[hsl(153,100%,45%)]" />
        <h1 className="text-4xl font-black tracking-tight">Vendedor Super</h1>
      </div>
      <p className="text-white/70 mb-8 text-center max-w-md">
        Sua central de métricas e vendas do Mercado Livre em tempo real.
      </p>
      <div className="flex gap-3">
        <Button asChild className="bg-[hsl(153,100%,40%)] text-black hover:bg-[hsl(153,100%,35%)]">
          <Link to="/login">Entrar</Link>
        </Button>
        <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/10">
          <Link to="/register">Criar conta</Link>
        </Button>
      </div>
    </div>
  );
};

export default Index;
