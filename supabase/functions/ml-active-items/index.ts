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

    const sellerId = connection.mp_user_id;

    // Fetch active items with pagination
    const allItems: any[] = [];
    let offset = 0;
    const limit = 50;

    while (true) {
      const url = `https://api.mercadolibre.com/users/${sellerId}/items/search?status=active&limit=${limit}&offset=${offset}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Items search error:", response.status, errText);
        break;
      }

      const data = await response.json();
      const itemIds = data.results || [];

      if (itemIds.length === 0) break;

      // Fetch item details in batches of 20 (ML multiget limit)
      for (let i = 0; i < itemIds.length; i += 20) {
        const batch = itemIds.slice(i, i + 20);
        const multigetUrl = `https://api.mercadolibre.com/items?ids=${batch.join(",")}&attributes=id,title,price,thumbnail,status,category_id,shipping,available_quantity,initial_quantity,sold_quantity`;
        const multigetRes = await fetch(multigetUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (multigetRes.ok) {
          const multigetData = await multigetRes.json();
          for (const item of multigetData) {
            if (item.code === 200 && item.body) {
              allItems.push({
                id: item.body.id,
                title: item.body.title,
                price: item.body.price,
                thumbnail: item.body.thumbnail,
                category_id: item.body.category_id,
                shipping: item.body.shipping,
                available_quantity: item.body.available_quantity ?? 0,
                initial_quantity: item.body.initial_quantity ?? 0,
                sold_quantity: item.body.sold_quantity ?? 0,
              });
            }
          }
        }

        // Rate limiting
        if (i + 20 < itemIds.length) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      offset += limit;
      if (offset >= (data.paging?.total || 0)) break;

      await new Promise((r) => setTimeout(r, 500));
    }

    return new Response(JSON.stringify({ items: allItems, total: allItems.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ML active items error:", (err as Error).message);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
