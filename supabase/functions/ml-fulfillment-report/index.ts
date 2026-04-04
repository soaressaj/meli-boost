const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get ML connection
    const { data: conn, error: connError } = await supabase
      .from("mp_connections")
      .select("access_token, mp_user_id")
      .eq("user_id", user.id)
      .single();

    if (connError || !conn) {
      return new Response(JSON.stringify({ error: "Conexão ML não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { access_token, mp_user_id } = conn;

    // Parse date range from request
    const url = new URL(req.url);
    const lastDays = parseInt(url.searchParams.get("last_days") || "30");

    const dateTo = new Date();
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - lastDays);

    const dateFromStr = dateFrom.toISOString().split("T")[0] + "T00:00:00.000-03:00";
    const dateToStr = dateTo.toISOString().split("T")[0] + "T23:59:59.999-03:00";

    // Fetch orders from ML API
    const allOrders: any[] = [];
    let offset = 0;
    const limit = 50;

    while (offset < 1000) {
      const ordersUrl = `https://api.mercadolibre.com/orders/search?seller=${mp_user_id}&order.date_created.from=${encodeURIComponent(dateFromStr)}&order.date_created.to=${encodeURIComponent(dateToStr)}&sort=date_desc&limit=${limit}&offset=${offset}`;

      const ordersRes = await fetch(ordersUrl, {
        headers: { Authorization: `Bearer ${access_token}` },
      });

      if (!ordersRes.ok) {
        console.error("Orders API error:", ordersRes.status, await ordersRes.text());
        break;
      }

      const ordersData = await ordersRes.json();
      allOrders.push(...ordersData.results);

      if (offset + limit >= ordersData.paging.total) break;
      offset += limit;

      // Rate limiting
      await new Promise((r) => setTimeout(r, 300));
    }

    // Known ML fulfillment center coordinates
    const KNOWN_CENTERS: Record<string, { lat: number; lng: number }> = {
      "Cajamar": { lat: -23.35, lng: -46.87 },
      "Louveira": { lat: -23.08, lng: -46.95 },
      "Franco da Rocha": { lat: -23.32, lng: -46.73 },
      "Extrema": { lat: -22.85, lng: -46.32 },
      "Nova Santa Rita": { lat: -29.86, lng: -51.28 },
      "São José dos Pinhais": { lat: -25.53, lng: -49.20 },
      "Betim": { lat: -19.97, lng: -44.20 },
      "Raposo Tavares": { lat: -23.59, lng: -46.78 },
      "Osasco": { lat: -23.53, lng: -46.79 },
      "Guarulhos": { lat: -23.46, lng: -46.53 },
      "Ribeirão Preto": { lat: -21.17, lng: -47.81 },
      "Recife": { lat: -8.05, lng: -34.87 },
      "Salvador": { lat: -12.97, lng: -38.51 },
      "Contagem": { lat: -19.93, lng: -44.05 },
    };

    // For each order with shipping, get shipment details in batches of 10
    const fulfillmentCounts: Record<string, { count: number; revenue: number; city?: string; state?: string; lat?: number; lng?: number }> = {};
    const ordersWithShipping = allOrders.filter((o: any) => o.shipping?.id);
    
    // Process unique shipping IDs only (avoid duplicates)
    const seen = new Set<number>();
    const uniqueOrders: any[] = [];
    for (const order of ordersWithShipping) {
      if (!seen.has(order.shipping.id)) {
        seen.add(order.shipping.id);
        uniqueOrders.push(order);
      }
    }

    // For large sets, sample up to 200 shipments to stay within timeout
    // Then extrapolate the distribution for the remaining orders
    const MAX_SHIPMENT_CALLS = 200;
    const sampled = uniqueOrders.length > MAX_SHIPMENT_CALLS;
    const ordersToFetch = sampled ? uniqueOrders.slice(0, MAX_SHIPMENT_CALLS) : uniqueOrders;
    const totalOrderCount = ordersWithShipping.length;

    const BATCH_SIZE = 10;
    for (let i = 0; i < ordersToFetch.length; i += BATCH_SIZE) {
      const batch = ordersToFetch.slice(i, i + BATCH_SIZE);
      
      const results = await Promise.allSettled(
        batch.map(async (order: any) => {
          const shipRes = await fetch(
            `https://api.mercadolibre.com/shipments/${order.shipping.id}`,
            { headers: { Authorization: `Bearer ${access_token}` } }
          );
          if (!shipRes.ok) return null;
          const shipment = await shipRes.json();
          return { shipment, order };
        })
      );

      for (const result of results) {
        if (result.status !== "fulfilled" || !result.value) continue;
        const { shipment, order } = result.value;

        const senderAddress = shipment.sender_address || {};
        const city = senderAddress.city?.name || "Desconhecido";
        const state = senderAddress.state?.name || "Desconhecido";
        const stateId = senderAddress.state?.id || "unknown";
        
        const known = KNOWN_CENTERS[city];
        const lat = known?.lat || senderAddress.latitude || 0;
        const lng = known?.lng || senderAddress.longitude || 0;

        const key = `${city}-${stateId}`;

        if (!fulfillmentCounts[key]) {
          fulfillmentCounts[key] = { count: 0, revenue: 0, city, state, lat, lng };
        }

        fulfillmentCounts[key].count += 1;
        fulfillmentCounts[key].revenue += order.total_amount || 0;
      }

      // Rate limiting between batches
      if (i + BATCH_SIZE < ordersToFetch.length) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    // If sampled, extrapolate proportionally
    if (sampled) {
      const sampledTotal = Object.values(fulfillmentCounts).reduce((s, c) => s + c.count, 0);
      if (sampledTotal > 0) {
        const scale = totalOrderCount / sampledTotal;
        for (const key of Object.keys(fulfillmentCounts)) {
          fulfillmentCounts[key].count = Math.round(fulfillmentCounts[key].count * scale);
          fulfillmentCounts[key].revenue = fulfillmentCounts[key].revenue * scale;
        }
      }
    }

    const centers = Object.entries(fulfillmentCounts).map(([key, data]) => ({
      id: key,
      city: data.city,
      state: data.state,
      lat: data.lat,
      lng: data.lng,
      count: data.count,
      revenue: data.revenue,
    }));

    // Sort by count desc
    centers.sort((a, b) => b.count - a.count);

    const totalOrders = sampled ? totalOrderCount : centers.reduce((sum, c) => sum + c.count, 0);

    return new Response(
      JSON.stringify({
        centers,
        total_orders: totalOrders,
        period_days: lastDays,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Fulfillment report error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
