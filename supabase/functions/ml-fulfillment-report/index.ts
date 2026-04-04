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

    // For each order with shipping, get shipment details
    const fulfillmentCounts: Record<string, { count: number; revenue: number; city?: string; state?: string; lat?: number; lng?: number }> = {};

    for (const order of allOrders) {
      if (!order.shipping?.id) continue;

      try {
        const shipRes = await fetch(
          `https://api.mercadolibre.com/shipments/${order.shipping.id}`,
          { headers: { Authorization: `Bearer ${access_token}` } }
        );

        if (!shipRes.ok) continue;

        const shipment = await shipRes.json();

        // Check if it's fulfillment
        const logisticType = shipment.logistic_type || "unknown";
        const senderAddress = shipment.sender_address || {};
        
        // Use the sender address (warehouse/fulfillment center) info
        const city = senderAddress.city?.name || "Desconhecido";
        const state = senderAddress.state?.name || "Desconhecido";
        const stateId = senderAddress.state?.id || "unknown";
        const lat = senderAddress.latitude;
        const lng = senderAddress.longitude;

        const key = `${city}-${stateId}`;

        if (!fulfillmentCounts[key]) {
          fulfillmentCounts[key] = { count: 0, revenue: 0, city, state, lat, lng };
        }

        fulfillmentCounts[key].count += 1;
        fulfillmentCounts[key].revenue += order.total_amount || 0;

        // Rate limiting
        await new Promise((r) => setTimeout(r, 200));
      } catch (e) {
        console.error("Error fetching shipment:", e);
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

    const totalOrders = centers.reduce((sum, c) => sum + c.count, 0);

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
