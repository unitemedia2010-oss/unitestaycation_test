# Unite Staycation - Supabase CMD guide

This file is intentionally ASCII-friendly so PowerShell/CMD can display it safely.

## What super_admin can do

- Manage operation accounts in `user_profiles`.
- Add, edit, and delete bookings.
- Delete payment/bill records when needed.
- Do everything `admin`, `manager`, and `cskh` can do.

Role split:

- `super_admin`: accounts, delete bookings/payments, all ops actions.
- `admin`: branches, layouts, prices, promotions, room images.
- `manager`: bookings, payments, calendar, dashboard review.
- `cskh`: add/update bookings, deposits, payments, calendar.

Internal pages now require Supabase Auth plus an active role in `user_profiles`:

- `admin.html`
- `admin-live.html`
- `cskh.html`
- `dashboard.html`

## PowerShell helper

Helper file:

```powershell
scripts\unite-supabase.ps1
```

Do not save service_role or secret keys into public website files.

For one temporary PowerShell session:

```powershell
$env:UNITE_SUPABASE_URL="https://your-project.supabase.co"
$env:UNITE_SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

Health check:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\unite-supabase.ps1 -Action health
```

Promote an existing Supabase Auth user to super admin:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\unite-supabase.ps1 -Action promote-super-admin -UserId "AUTH_USER_UID" -Email "owner@example.com" -FullName "Unite Super Admin"
```

Create a new Supabase Auth user and assign a role:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\unite-supabase.ps1 -Action create-user -Email "cskh@example.com" -Password "StrongPassword123" -FullName "CSKH 01" -Role cskh
```

Super admin can also create users directly in `admin-live.html` after deploying the Edge Function in `SUPABASE_EDGE_FUNCTIONS.md`.

Other roles:

```powershell
-Role super_admin
-Role admin
-Role manager
-Role cskh
```

List operation profiles:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\unite-supabase.ps1 -Action list-profiles
```

List latest bookings:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\unite-supabase.ps1 -Action list-bookings
```

Delete a booking by public code or Supabase UUID:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\unite-supabase.ps1 -Action delete-booking -BookingId "US-20260709-001"
```

## Current project status from CMD test

- Supabase REST responded OK.
- Current owner UID was promoted to `super_admin` in `user_profiles`.
- `room_types` returned 7 layouts, all with `inventory_count = 3`.
- Existing remote `user_profiles` table does not show the optional `email` column yet, so the script falls back to UID/full_name/role safely.

## Schema changes

The local SQL file `supabase/staycation_schema.sql` now includes:

- Optional `user_profiles.email` and `user_profiles.phone`.
- A seed block that promotes the current owner UID to `super_admin` when that Auth user exists.
- Payment delete policy restricted to `super_admin`.

To apply those schema-only updates to Supabase, use Supabase SQL Editor.

If you want Codex to apply schema from CMD directly, provide the Supabase database password or full database connection string. Then we can use `psql` or Supabase CLI from this machine.
