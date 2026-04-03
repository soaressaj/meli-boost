import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export function PrecificacaoCalc() {
  const [custo, setCusto] = useState(0);
  const [tarifaML, setTarifaML] = useState(16);
  const [imposto, setImposto] = useState(6);
  const [frete, setFrete] = useState(0);
  const [margem, setMargem] = useState(20);

  const totalPercent = tarifaML + imposto + margem;
  const precoVenda = totalPercent < 100 ? (custo + frete) / (1 - totalPercent / 100) : 0;
  const tarifaVal = precoVenda * (tarifaML / 100);
  const impostoVal = precoVenda * (imposto / 100);
  const lucro = precoVenda - custo - frete - tarifaVal - impostoVal;
  const margemReal = precoVenda > 0 ? (lucro / precoVenda) * 100 : 0;

  return (
    <div className="bg-card rounded-lg border shadow-sm p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Custo do produto (R$)</Label>
          <Input type="number" value={custo} onChange={(e) => setCusto(Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>Tarifa ML (%)</Label>
          <Input type="number" value={tarifaML} onChange={(e) => setTarifaML(Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>Imposto (%)</Label>
          <Input type="number" value={imposto} onChange={(e) => setImposto(Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>Frete (R$)</Label>
          <Input type="number" value={frete} onChange={(e) => setFrete(Number(e.target.value))} />
        </div>
        <div className="space-y-2 col-span-2">
          <Label>Margem desejada (%)</Label>
          <Input type="number" value={margem} onChange={(e) => setMargem(Number(e.target.value))} />
        </div>
      </div>
      <div className="border-t pt-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Preço de venda</p>
          <p className="text-lg font-bold text-foreground">{formatCurrency(precoVenda)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Lucro líquido</p>
          <p className="text-lg font-bold text-success">{formatCurrency(lucro)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Margem real</p>
          <p className="text-lg font-bold text-foreground">{margemReal.toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}
