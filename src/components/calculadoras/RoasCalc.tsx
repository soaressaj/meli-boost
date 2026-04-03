import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RoasCalc() {
  const [investimento, setInvestimento] = useState(0);
  const [receita, setReceita] = useState(0);
  const [faturamento, setFaturamento] = useState(0);

  const roas = investimento > 0 ? receita / investimento : 0;
  const acos = receita > 0 ? (investimento / receita) * 100 : 0;
  const tacos = faturamento > 0 ? (investimento / faturamento) * 100 : 0;

  return (
    <div className="bg-card rounded-lg border shadow-sm p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Investimento em Ads (R$)</Label>
          <Input type="number" value={investimento} onChange={(e) => setInvestimento(Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>Receita gerada (R$)</Label>
          <Input type="number" value={receita} onChange={(e) => setReceita(Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>Faturamento total (R$)</Label>
          <Input type="number" value={faturamento} onChange={(e) => setFaturamento(Number(e.target.value))} />
        </div>
      </div>
      <div className="border-t pt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-muted-foreground">ROAS</p>
          <p className="text-lg font-bold text-foreground">{roas.toFixed(2)}x</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">ACOS</p>
          <p className="text-lg font-bold text-foreground">{acos.toFixed(2)}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">TACOS</p>
          <p className="text-lg font-bold text-foreground">{tacos.toFixed(2)}%</p>
        </div>
      </div>
    </div>
  );
}
