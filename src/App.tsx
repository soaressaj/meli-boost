import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Connect from "./pages/Connect";
import Callback from "./pages/Callback";
import Layout from "./components/layout/Layout";
import VendasAoVivo from "./pages/app/VendasAoVivo";
import Marketplaces from "./pages/app/Marketplaces";
import CustosImpostos from "./pages/app/CustosImpostos";
import Calculadoras from "./pages/app/Calculadoras";
import DRE from "./pages/app/DRE";
import Conta from "./pages/app/Conta";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/connect" element={<Connect />} />
          <Route path="/callback" element={<Callback />} />
          <Route path="/app" element={<Layout />}>
            <Route index element={<Navigate to="/app/vendas" replace />} />
            <Route path="vendas" element={<VendasAoVivo />} />
            <Route path="marketplaces" element={<Marketplaces />} />
            <Route path="custos" element={<CustosImpostos />} />
            <Route path="calculadoras" element={<Calculadoras />} />
            <Route path="dre" element={<DRE />} />
            <Route path="conta" element={<Conta />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
