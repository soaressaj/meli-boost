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
    const url = new URL(req.url);
    
    // MP sends topic and id as query params for IPN, or in body for webhooks
    let topic = url.searchParams.get("topic") || url.searchParams.get("type");
    let resourceId = url.searchParams.get("id");

    // Also check body for webhook v2 format
    if (!topic || !resourceId) {
      try {
        const body = await req.json();
        topic = body.topic || body.type || body.action;
        resourceId = resourceId || body.data?.id || body.resource?.split("/").pop();
        console.log("Webhook body:", JSON.stringify(body));
      } catch {
        // body might not be JSON
      }
    }

    console.log(`Webhook received: topic=${topic}, id=${resourceId}`);

    // Only process payment notifications
    if (topic !== "payment" && topic !== "payment.created" && topic !== "payment.updated") {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!resourceId) {
      return new Response(JSON.stringify({ error: "Missing resource ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all MP connections to find which user this payment belongs to
    const { data: connections, error: connError } = await adminSupabase
      .from("mp_connections")
      .select("user_id, access_token, refresh_token, expires_at");

    if (connError || !connections?.length) {
      console.error("No connections found:", connError);
      return new Response(JSON.stringify({ error: "No connections" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try each connection to find the payment
    for (const conn of connections) {
      let accessToken = conn.access_token;

      // Refresh token if needed
      const expiresAt = new Date(conn.expires_at);
      if (expiresAt.getTime() - Date.now() < 30 * 60 * 1000) {
        const clientId = Deno.env.get("MP_CLIENT_ID");
        const clientSecret = Deno.env.get("MP_CLIENT_SECRET");
        const tokenRes = await fetch("https://api.mercadolibre.com/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            client_id: clientId!,
            client_secret: clientSecret!,
            refresh_token: conn.refresh_token,
          }),
        });
        if (tokenRes.ok) {
          const tokenData = await tokenRes.json();
          accessToken = tokenData.access_token;
          await adminSupabase.from("mp_connections").update({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          }).eq("user_id", conn.user_id);
        }
      }

      // Fetch payment details from MP API
      const paymentRes = await fetch(
        `https://api.mercadopago.com/v1/payments/${resourceId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!paymentRes.ok) {
        console.log(`Payment ${resourceId} not found for user ${conn.user_id}, trying next...`);
        continue;
      }

      const payment = await paymentRes.json();

      // Only store regular payments with orders (marketplace sales)
      if (payment.operation_type !== "regular_payment" || !payment.order?.id) {
        console.log(`Skipping non-regular payment ${resourceId}`);
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const feeAmount = (payment.fee_details || []).reduce(
        (sum: number, f: { amount: number }) => sum + f.amount, 0
      );

      // Upsert the payment
      const { error: upsertError } = await adminSupabase
        .from("mp_payments")
        .upsert({
          user_id: conn.user_id,
          mp_payment_id: payment.id,
          status: payment.status,
          status_detail: payment.status_detail,
          transaction_amount: payment.transaction_amount,
          currency_id: payment.currency_id,
          fee_amount: feeAmount,
          net_received_amount: payment.transaction_details?.net_received_amount ?? (payment.transaction_amount - feeAmount),
          date_approved: payment.date_approved,
          date_created: payment.date_created,
          description: payment.description,
          payer_email: payment.payer?.email,
          order_id: payment.order?.id,
          operation_type: payment.operation_type,
          raw_data: payment,
          updated_at: new Date().toISOString(),
        }, { onConflict: "mp_payment_id" });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        return new Response(JSON.stringify({ error: "DB error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Payment ${resourceId} saved for user ${conn.user_id}`);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, not_found: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", (err as Error).message);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
