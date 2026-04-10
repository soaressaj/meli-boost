import { useState } from "react";
import { useAuth } from "@/components/layout/Layout";
import { useUserSettings } from "@/hooks/useUserSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Settings, Calculator, List } from "lucide-react";
import { PrecificacaoSimulator } from "@/components/precificacao/PrecificacaoSimulator";
import { ListingPricingList } from "@/components/precificacao/ListingPricingList";
import { useEffect } from "react";

function ConfigGeral({ user }: { user: any }) {
  const { settings, isLoading, saveSettings } = useUserSettings(user?.id);

  const [form, setForm] = useState({
    regime_tributario: "simples",
    aliquota_imposto: 0,
    custo_fixo_mensal: 0,
    custo_frete_por_pedido: 0,
    custo_produto_percentual: 0,
    antecipacao_ativa: false,
    taxa_antecipacao: 3.8,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        regime_tributario: settings.regime_tributario || "simples",
        aliquota_imposto: Number(settings.aliquota_imposto) || 0,
        custo_fixo_mensal: Number(settings.custo_fixo_mensal) || 0,
        custo_frete_por_pedido: Number(settings.custo_frete_por_pedido) || 0,
        custo_produto_percentual: Number(settings.custo_produto_percentual) || 0,
        antecipacao_ativa: settings.antecipacao_ativa || false,
        taxa_antecipacao: Number(settings.taxa_antecipacao) ? Number(settings.taxa_antecipacao) * 100 : 3.8,
      });
    }
  }, [settings]);

  const handleSave = () => {
    const taxa = form.taxa_antecipacao > 1 ? form.taxa_antecipacao / 100 : form.taxa_antecipacao;
    saveSettings({ ...form, taxa_antecipacao: taxa });
  };

  return (
    <div className="bg-card rounded-lg border shadow-sm p-6 space-y-6">
      <div className="space-y-2">
        <Label>Regime tributário</Label>
        <Select value={form.regime_tributario} onValueChange={(v) => setForm({ ...form, regime_tributario: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="simples">Simples Nacional</SelectItem>
            <SelectItem value="presumido">Lucro Presumido</SelectItem>
            <SelectItem value="mei">MEI</SelectItem>
            <SelectItem value="isento">Isento</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Alíquota de imposto (%)</Label>
          <Input type="number" step="0.01" value={form.aliquota_imposto} onChange={(e) => setForm({ ...form, aliquota_imposto: Number(e.target.value) })} />
        </div>
        <div className="space-y-2">
          <Label>Custo fixo mensal (R$)</Label>
          <Input type="number" step="0.01" value={form.custo_fixo_mensal} onChange={(e) => setForm({ ...form, custo_fixo_mensal: Number(e.target.value) })} />
        </div>
        <div className="space-y-2">
          <Label>Custo médio frete por pedido (R$)</Label>
          <Input type="number" step="0.01" value={form.custo_frete_por_pedido} onChange={(e) => setForm({ ...form, custo_frete_por_pedido: Number(e.target.value) })} />
        </div>
        <div className="space-y-2">
          <Label>Custo produto (% do faturamento)</Label>
          <Input type="number" step="0.01" value={form.custo_produto_percentual} onChange={(e) => setForm({ ...form, custo_produto_percentual: Number(e.target.value) })} />
        </div>
      </div>
      <div className="border-t pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <Label>Antecipação de recebíveis</Label>
          <Switch checked={form.antecipacao_ativa} onCheckedChange={(v) => setForm({ ...form, antecipacao_ativa: v })} />
        </div>
        {form.antecipacao_ativa && (
          <div className="space-y-2">
            <Label>Taxa de antecipação (%)</Label>
            <Input type="number" step="0.01" value={form.taxa_antecipacao} onChange={(e) => setForm({ ...form, taxa_antecipacao: Number(e.target.value) })} />
          </div>
        )}
      </div>
      <Button onClick={handleSave} className="gap-2">
        <Save className="h-4 w-4" /> Salvar configurações
      </Button>
    </div>
  );
}

export default function CustosImpostos() {
  const { user } = useAuth();

  return (
    <div className="max-w-5xl space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Custos & Precificação</h1>

      <Tabs defaultValue="anuncios">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="anuncios" className="gap-2">
            <List className="h-4 w-4" /> Anúncios Ativos
          </TabsTrigger>
          <TabsTrigger value="precificacao" className="gap-2">
            <Calculator className="h-4 w-4" /> Simulação Manual
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" /> Configurações
          </TabsTrigger>
        </TabsList>
        <TabsContent value="anuncios">
          <ListingPricingList />
        </TabsContent>
        <TabsContent value="precificacao">
          <PrecificacaoSimulator />
        </TabsContent>
        <TabsContent value="config">
          <ConfigGeral user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
