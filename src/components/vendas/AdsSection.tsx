import type { UserSettings } from "@/types/mercadopago";
import { Badge } from "@/components/ui/badge";

interface Props {
  settings: UserSettings | null;
  totalBruto: number;
  onToggleAds: () => void;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function AdsSection({ settings, totalBruto, onToggleAds }: Props) {
  const investimento = settings?.investimento_ads_periodo ?? 0;
  const adsIgnorado = settings?.ads_ignorado ?? false;
  const receita = 0; // placeholder - would come from ads API
  const vendas = 0;
  const roas = investimento > 0 ? receita / investimento : 0;
  const acos = receita > 0 ? (investimento / receita) * 100 : 0;
  const tacos = totalBruto > 0 ? (investimento / totalBruto) * 100 : 0;

  return (
    <div className="bg-muted/50 rounded-lg p-4 border">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">Investimento em Ads</span>
          <Badge
            variant={adsIgnorado ? "destructive" : "outline"}
            className="cursor-pointer"
            onClick={onToggleAds}
          >
            ADS {adsIgnorado ? "Ignorado ✕" : "Ativo ✓"}
          </Badge>
        </div>
        <span className="text-muted-foreground">|</span>
        <span>Receita <strong>{formatCurrency(receita)}</strong></span>
        <span className="text-muted-foreground">|</span>
        <span>Vendas <strong>{vendas}</strong></span>
        <span className="text-muted-foreground">|</span>
        <span>ROAS <strong>{roas.toFixed(2)}x</strong></span>
        <span className="text-muted-foreground">|</span>
        <span>ACOS <strong>{acos.toFixed(2)}%</strong></span>
        <span className="text-muted-foreground">|</span>
        <span>TACOS <strong>{tacos.toFixed(2)}%</strong></span>
      </div>
    </div>
  );
}
