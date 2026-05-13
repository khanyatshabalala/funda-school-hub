/**
 * send-push edge function
 * Called by a DB trigger (via pg_net or directly) when a notification row is inserted.
 * Reads the user's push tokens and sends via Expo Push API.
 *
 * Expected body: { notification_id: string }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { notification_id } = await req.json();
    if (!notification_id) {
      return new Response(JSON.stringify({ error: "notification_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role key to bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceKey}`,
      "apikey": serviceKey,
    };

    // Fetch the notification row
    const notifRes = await fetch(
      `${supabaseUrl}/rest/v1/notifications?id=eq.${notification_id}&select=user_id,title,body`,
      { headers },
    );
    const notifs = await notifRes.json();
    if (!notifs?.length) {
      return new Response(JSON.stringify({ error: "Notification not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { user_id, title, body } = notifs[0];

    // Fetch push tokens for this user
    const tokenRes = await fetch(
      `${supabaseUrl}/rest/v1/push_tokens?user_id=eq.${user_id}&select=token`,
      { headers },
    );
    const tokens: { token: string }[] = await tokenRes.json();

    if (!tokens?.length) {
      return new Response(JSON.stringify({ sent: 0, reason: "no tokens" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build Expo push messages
    const messages = tokens
      .filter(t => t.token.startsWith("ExponentPushToken["))
      .map(t => ({
        to:    t.token,
        title: title ?? "Funda",
        body:  body  ?? "",
        sound: "default",
        data:  { notification_id },
      }));

    if (!messages.length) {
      return new Response(JSON.stringify({ sent: 0, reason: "no valid expo tokens" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send to Expo in batches of 100
    const BATCH = 100;
    let sent = 0;
    for (let i = 0; i < messages.length; i += BATCH) {
      const batch = messages.slice(i, i + BATCH);
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(batch),
      });
      if (res.ok) sent += batch.length;
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
