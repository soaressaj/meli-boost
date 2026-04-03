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

    // Check if token needs refresh
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

    const { date_from, date_to } = await req.json();

    const mlHeaders = {
      Authorization: `Bearer ${accessToken}`,
      "api-version": "2",
      "Content-Type": "application/json",
    };

    // Step 1: Get the advertiser_id for PADS
    const advUrl = `https://api.mercadolibre.com/advertising/advertisers?product_id=PADS`;
    console.log("Fetching advertisers:", advUrl);

    const advResponse = await fetch(advUrl, { headers: mlHeaders });

    if (!advResponse.ok) {
      const advError = await advResponse.text();
      console.error("Advertisers API error:", advResponse.status, advError);
      return new Response(JSON.stringify({ error: "Failed to fetch advertiser", details: advError }), {
        status: advResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const advData = await advResponse.json();
    console.log("Advertisers response:", JSON.stringify(advData));

    const advertiserId = advData?.advertisers?.[0]?.advertiser_id;
    if (!advertiserId) {
      return new Response(JSON.stringify({ error: "No advertiser found", data: advData }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Fetch daily campaign metrics with aggregation_type=DAILY
    const metricsUrl = `https://api.mercadolibre.com/advertising/advertisers/${advertiserId}/product_ads/campaigns?date_from=${date_from}&date_to=${date_to}&metrics=clicks,prints,cost,cpc,acos,roas,total_amount&aggregation_type=DAILY&limit=100&offset=0`;

    console.log("Fetching daily metrics:", metricsUrl);

    const metricsResponse = await fetch(metricsUrl, { headers: mlHeaders });

    if (!metricsResponse.ok) {
      const metricsError = await metricsResponse.text();
      console.error("Metrics API error:", metricsResponse.status, metricsError);
      return new Response(JSON.stringify({ error: "Failed to fetch metrics", details: metricsError }), {
        status: metricsResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metricsData = await metricsResponse.json();
    console.log("Metrics response paging:", JSON.stringify(metricsData?.paging));

    return new Response(JSON.stringify({ type: "daily_metrics", data: metricsData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ML ads report error:", (err as Error).message);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
