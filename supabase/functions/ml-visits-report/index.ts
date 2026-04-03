import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: connection, error: fetchError } = await adminSupabase
      .from("mp_connections")
      .select("access_token, refresh_token, expires_at, mp_user_id")
      .eq("user_id", user.id)
      .single();

    if (fetchError || !connection) {
      return new Response(JSON.stringify({ error: "Connection not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = connection.access_token;

    // Refresh token if needed
    const expiresAt = new Date(connection.expires_at);
    const minutesUntilExpiry = (expiresAt.getTime() - Date.now()) / 60000;

    if (minutesUntilExpiry <= 30) {
      const clientId = Deno.env.get("MP_CLIENT_ID");
      const clientSecret = Deno.env.get("MP_CLIENT_SECRET");

      const tokenResponse = await fetch("https://api.mercadolibre.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          client_id: clientId!,
          client_secret: clientSecret!,
          refresh_token: connection.refresh_token,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenResponse.ok) {
        accessToken = tokenData.access_token;
        const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();
        await adminSupabase.from("mp_connections").update({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: newExpiresAt,
        }).eq("user_id", user.id);
      }
    }

    const { date_from, date_to, last_days } = await req.json();

    const mlHeaders = {
      Authorization: `Bearer ${accessToken}`,
    };

    const mlUserId = connection.mp_user_id;

    // Visits API uses time_window with last N days
    const days = last_days ?? 30;
    const visitsUrl = `https://api.mercadolibre.com/users/${mlUserId}/items_visits/time_window?last=${days}&unit=day`;
    const ordersUrl = `https://api.mercadolibre.com/orders/search?seller=${mlUserId}&order.date_created.from=${date_from}T00:00:00.000-0300&order.date_created.to=${date_to}T23:59:59.999-0300&sort=date_desc`;

    console.log("Fetching visits:", visitsUrl);
    console.log("Fetching orders:", ordersUrl);

    const [visitsRes, ordersRes] = await Promise.all([
      fetch(visitsUrl, { headers: mlHeaders }),
      fetch(ordersUrl, { headers: mlHeaders }),
    ]);

    let totalVisits = 0;
    if (visitsRes.ok) {
      const visitsData = await visitsRes.json();
      console.log("Visits response:", JSON.stringify(visitsData).slice(0, 500));

      // Filter results to only include dates within the requested range
      if (Array.isArray(visitsData?.results)) {
        for (const item of visitsData.results) {
          const itemDate = item.date?.split("T")[0];
          if (itemDate && itemDate >= date_from && itemDate <= date_to) {
            totalVisits += item.total ?? 0;
          }
        }
      }

      // Fallback to total_visits if no results array
      if (totalVisits === 0 && !visitsData?.results) {
        totalVisits = visitsData?.total_visits ?? 0;
      }
    } else {
      const visitsError = await visitsRes.text();
      console.error("Visits API error:", visitsRes.status, visitsError);
    }

    let totalOrders = 0;
    let totalOrdersAmount = 0;
    let completedOrders = 0;
    let completedOrdersAmount = 0;

    if (ordersRes.ok) {
      const ordersData = await ordersRes.json();
      console.log("Orders paging:", JSON.stringify(ordersData?.paging));

      const results = ordersData?.results ?? [];
      totalOrders = ordersData?.paging?.total ?? results.length;

      for (const order of results) {
        totalOrdersAmount += order.total_amount ?? 0;
        if (order.status === "paid") {
          completedOrders++;
          completedOrdersAmount += order.total_amount ?? 0;
        }
      }

      // If there are more pages, fetch them (up to 500 orders)
      let offset = results.length;
      const limit = 50;
      const total = ordersData?.paging?.total ?? 0;

      while (offset < total && offset < 500) {
        const pageUrl = `${ordersUrl}&offset=${offset}&limit=${limit}`;
        const pageRes = await fetch(pageUrl, { headers: mlHeaders });
        if (!pageRes.ok) break;
        const pageData = await pageRes.json();
        const pageResults = pageData?.results ?? [];
        if (pageResults.length === 0) break;

        for (const order of pageResults) {
          totalOrdersAmount += order.total_amount ?? 0;
          if (order.status === "paid") {
            completedOrders++;
            completedOrdersAmount += order.total_amount ?? 0;
          }
        }
        offset += pageResults.length;
        await new Promise((r) => setTimeout(r, 500));
      }
    } else {
      const ordersError = await ordersRes.text();
      console.error("Orders API error:", ordersRes.status, ordersError);
    }

    const result = {
      total_visits: totalVisits,
      purchase_intent: totalOrders,
      purchase_intent_amount: totalOrdersAmount,
      completed_sales: completedOrders,
      completed_sales_amount: completedOrdersAmount,
      conversion_rate: totalVisits > 0 ? (completedOrders / totalVisits) * 100 : 0,
    };

    console.log("Funnel result:", JSON.stringify(result));

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ML visits report error:", (err as Error).message);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
