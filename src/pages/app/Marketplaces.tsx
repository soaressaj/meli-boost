import { ShoppingCart, Clock } from "lucide-react";

export default function Marketplaces() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
      <div className="bg-card rounded-xl p-12 shadow-sm border text-center max-w-md space-y-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <ShoppingCart className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Marketplaces</h2>
        <p className="text-muted-foreground text-sm">
          Em breve você poderá conectar Shopee, Amazon e outros marketplaces para centralizar todas as suas vendas.
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Em desenvolvimento</span>
        </div>
      </div>
    </div>
  );
}
