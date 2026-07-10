# Unite Staycation - Edge Functions

Use this when you want Super Admin to create operation accounts directly from `admin-live.html`.

## Function

Local source:

```text
supabase/functions/create-ops-user/index.ts
```

What it does:

- Verifies the caller is logged in.
- Checks `user_profiles.role = super_admin` and `is_active = true`.
- Creates a Supabase Auth user.
- Inserts or updates the matching `user_profiles` row.
- Uses Supabase Edge Function's built-in `SUPABASE_SERVICE_ROLE_KEY`; this key is not stored in the static website.

## Deploy

Install/login Supabase CLI first, then run from this folder:

```powershell
npx supabase login
npx supabase link --project-ref afjzycyffhhyifixtelq
npx supabase functions deploy create-ops-user --no-verify-jwt
```

Or use the helper script:

```powershell
$env:SUPABASE_ACCESS_TOKEN="your-supabase-access-token"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\deploy-edge-functions.ps1
```

The function URL will be:

```text
https://afjzycyffhhyifixtelq.supabase.co/functions/v1/create-ops-user
```

## Use In Admin

Open:

```text
admin-live.html
```

Log in with the super admin account, then use **Tạo tài khoản** in the **Tài khoản vận hành** section.

`--no-verify-jwt` is intentional. The function handles CORS first, then verifies the logged-in super admin token manually before using the service role key.

If you see `function-not-deployed`, the frontend is ready but the Edge Function has not been deployed yet or the secret is missing.
