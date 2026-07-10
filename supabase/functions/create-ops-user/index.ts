import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const allowedRoles = new Set(["super_admin", "admin", "manager", "cskh"]);

const json = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const cleanText = (value: unknown) => String(value || "").trim();

const findUserByEmail = async (adminClient: ReturnType<typeof createClient>, email: string) => {
  const needle = email.toLowerCase();
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === needle);
    if (found) return found;
    if (data.users.length < 100) return null;
  }
  return null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { ok: false, message: "Method not allowed." });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { ok: false, message: "Missing Supabase Edge Function secrets." });
  }

  const authHeader = req.headers.get("Authorization") || "";
  const callerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!callerToken) return json(401, { ok: false, message: "Missing admin session." });

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: callerData, error: callerError } = await adminClient.auth.getUser(callerToken);
  if (callerError || !callerData.user) {
    return json(401, { ok: false, message: "Admin session is invalid or expired." });
  }

  const { data: callerProfile, error: profileError } = await adminClient
    .from("user_profiles")
    .select("role,is_active")
    .eq("id", callerData.user.id)
    .maybeSingle();

  if (profileError) return json(500, { ok: false, message: profileError.message });
  if (callerProfile?.role !== "super_admin" || callerProfile?.is_active === false) {
    return json(403, { ok: false, message: "Only active super_admin can create operation accounts." });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, message: "Invalid JSON body." });
  }

  const email = cleanText(body.email).toLowerCase();
  const password = cleanText(body.password);
  const fullName = cleanText(body.fullName || body.full_name);
  const phone = cleanText(body.phone);
  const role = cleanText(body.role) || "cskh";
  const isActive = body.isActive !== false;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { ok: false, message: "Email không hợp lệ." });
  }
  if (!allowedRoles.has(role)) {
    return json(400, { ok: false, message: "Quyền tài khoản không hợp lệ." });
  }
  if (password.length < 6) {
    return json(400, { ok: false, message: "Mật khẩu cần tối thiểu 6 ký tự." });
  }

  let mode = "created";
  let authUser = await findUserByEmail(adminClient, email);

  if (!authUser) {
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone,
        role,
      },
    });
    if (error || !data.user) {
      return json(400, { ok: false, message: error?.message || "Không tạo được Auth user." });
    }
    authUser = data.user;
  } else {
    mode = "profile_updated_existing_auth";
  }

  const { data: profile, error: upsertError } = await adminClient
    .from("user_profiles")
    .upsert({
      id: authUser.id,
      email,
      phone: phone || null,
      full_name: fullName || email,
      role,
      is_active: isActive,
    }, { onConflict: "id" })
    .select("id,email,phone,full_name,role,is_active")
    .single();

  if (upsertError) return json(400, { ok: false, message: upsertError.message });

  return json(200, {
    ok: true,
    mode,
    user: {
      id: authUser.id,
      email: authUser.email,
    },
    profile,
  });
});
