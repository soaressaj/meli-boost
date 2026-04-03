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

    // Get access token via refresh-token logic
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
    const advertiserId = connection.mp_user_id;

    // Fetch product ads report from ML API
    const reportUrl = `https://api.mercadolibre.com/advertising/advertisers/${advertiserId}/product-ads/report?date_from=${date_from}&date_to=${date_to}&granularity=day`;

    console.log("Fetching ML ads report:", reportUrl);

    const reportResponse = await fetch(reportUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!reportResponse.ok) {
      const errorText = await reportResponse.text();
      console.error("ML Ads API error:", reportResponse.status, errorText);
      
      // Try alternative endpoint - campaigns list with metrics
      const campaignsUrl = `https://api.mercadolibre.com/advertising/advertisers/${advertiserId}/product-ads/campaigns?status=active`;
      const campaignsResponse = await fetch(campaignsUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (!campaignsResponse.ok) {
        const campError = await campaignsResponse.text();
        console.error("ML Campaigns API error:", campaignsResponse.status, campError);
        return new Response(JSON.stringify({ 
          error: "Failed to fetch ads data", 
          details: errorText,
          campaigns_error: campError,
          status: reportResponse.status 
        }), {
          status: reportResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const campaignsData = await campaignsResponse.json();
      return new Response(JSON.stringify({ type: "campaigns", data: campaignsData }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reportData = await reportResponse.json();
    return new Response(JSON.stringify({ type: "report", data: reportData }), {
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
