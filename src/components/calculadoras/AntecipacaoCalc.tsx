import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function AntecipacaoCalc() {
  const [valor, setValor] = useState(0);
  const [taxa, setTaxa] = useState(3.8);

  const taxaNorm = taxa > 1 ? taxa / 100 : taxa;
  const custoAntecipacao = valor * taxaNorm;
  const valorFinal = valor - custoAntecipacao;

  return (
    <div className="bg-card rounded-lg border shadow-sm p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Valor a receber (R$)</Label>
          <Input type="number" value={valor} onChange={(e) => setValor(Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>Taxa de antecipação (%)</Label>
          <Input type="number" step="0.01" value={taxa} onChange={(e) => setTaxa(Number(e.target.value))} />
          <p className="text-xs text-muted-foreground">Se &gt; 1, normalizado automaticamente</p>
        </div>
      </div>
      <div className="border-t pt-4 grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Valor após antecipação</p>
          <p className="text-lg font-bold text-success">{formatCurrency(valorFinal)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Custo da antecipação</p>
          <p className="text-lg font-bold text-warning">{formatCurrency(custoAntecipacao)}</p>
        </div>
      </div>
    </div>
  );
}
