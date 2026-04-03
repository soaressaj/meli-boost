import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PrecificacaoCalc } from "@/components/calculadoras/PrecificacaoCalc";
import { AntecipacaoCalc } from "@/components/calculadoras/AntecipacaoCalc";
import { RoasCalc } from "@/components/calculadoras/RoasCalc";

export default function Calculadoras() {
  return (
    <div className="max-w-2xl space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Calculadoras</h1>
      <Tabs defaultValue="precificacao">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="precificacao">Precificação</TabsTrigger>
          <TabsTrigger value="antecipacao">Antecipação</TabsTrigger>
          <TabsTrigger value="roas">ROAS / ACOS</TabsTrigger>
        </TabsList>
        <TabsContent value="precificacao"><PrecificacaoCalc /></TabsContent>
        <TabsContent value="antecipacao"><AntecipacaoCalc /></TabsContent>
        <TabsContent value="roas"><RoasCalc /></TabsContent>
      </Tabs>
    </div>
  );
}
