param(
  [ValidateSet("health", "promote-super-admin", "list-profiles", "list-bookings", "create-user", "upsert-profile", "delete-booking")]
  [string]$Action = "health",

  [string]$SupabaseUrl = $env:UNITE_SUPABASE_URL,
  [string]$ServiceRoleKey = $env:UNITE_SUPABASE_SERVICE_ROLE_KEY,
  [string]$UserId = $env:UNITE_SUPER_ADMIN_UID,
  [string]$Email = "",
  [string]$Password = "",
  [string]$FullName = "",
  [ValidateSet("super_admin", "admin", "manager", "cskh")]
  [string]$Role = "cskh",
  [string]$BookingId = ""
)

$ErrorActionPreference = "Stop"

function Assert-Config {
  if ([string]::IsNullOrWhiteSpace($SupabaseUrl)) {
    throw "Missing Supabase URL. Set UNITE_SUPABASE_URL or pass -SupabaseUrl."
  }
  if ([string]::IsNullOrWhiteSpace($ServiceRoleKey)) {
    throw "Missing service role key. Set UNITE_SUPABASE_SERVICE_ROLE_KEY or pass -ServiceRoleKey."
  }
}

function New-Headers {
  param([hashtable]$Extra = @{})
  $headers = @{
    "apikey" = $ServiceRoleKey
    "Authorization" = "Bearer $ServiceRoleKey"
  }
  foreach ($key in $Extra.Keys) {
    $headers[$key] = $Extra[$key]
  }
  return $headers
}

function Invoke-SupabaseRest {
  param(
    [string]$Path,
    [string]$Method = "GET",
    [object]$Body = $null,
    [hashtable]$ExtraHeaders = @{}
  )

  $base = $SupabaseUrl.TrimEnd("/")
  $uri = "$base/rest/v1/$Path"
  $headers = New-Headers -Extra $ExtraHeaders
  if ($null -ne $Body) {
    $json = $Body | ConvertTo-Json -Depth 12
    return Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers -ContentType "application/json" -Body $json
  }
  return Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers
}

function Invoke-SupabaseAuthAdmin {
  param(
    [string]$Path,
    [string]$Method = "GET",
    [object]$Body = $null
  )

  $base = $SupabaseUrl.TrimEnd("/")
  $uri = "$base/auth/v1/admin/$Path"
  $headers = New-Headers
  if ($null -ne $Body) {
    $json = $Body | ConvertTo-Json -Depth 12
    return Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers -ContentType "application/json" -Body $json
  }
  return Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers
}

function Upsert-Profile {
  param(
    [string]$ProfileUserId,
    [string]$ProfileEmail,
    [string]$ProfileFullName,
    [string]$ProfileRole,
    [bool]$IsActive = $true
  )

  if ([string]::IsNullOrWhiteSpace($ProfileUserId)) {
    throw "Missing user id for profile upsert."
  }

  $payloadWithEmail = @{
    id = $ProfileUserId
    email = $(if ($ProfileEmail) { $ProfileEmail } else { $null })
    full_name = $(if ($ProfileFullName) { $ProfileFullName } else { $null })
    role = $ProfileRole
    is_active = $IsActive
  }
  $payloadWithoutEmail = @{
    id = $ProfileUserId
    full_name = $(if ($ProfileFullName) { $ProfileFullName } else { $null })
    role = $ProfileRole
    is_active = $IsActive
  }
  $headers = @{
    "Prefer" = "resolution=merge-duplicates,return=representation"
  }

  try {
    return Invoke-SupabaseRest -Path "user_profiles?on_conflict=id&select=id,email,full_name,role,is_active" -Method "POST" -Body $payloadWithEmail -ExtraHeaders $headers
  } catch {
    return Invoke-SupabaseRest -Path "user_profiles?on_conflict=id&select=id,full_name,role,is_active" -Method "POST" -Body $payloadWithoutEmail -ExtraHeaders $headers
  }
}

Assert-Config

switch ($Action) {
  "health" {
    $branches = Invoke-SupabaseRest -Path "branches?select=id,name&limit=5"
    $rooms = Invoke-SupabaseRest -Path "room_types?select=code,name,inventory_count,status&order=sort_order.asc"
    $profiles = Invoke-SupabaseRest -Path "user_profiles?select=id,full_name,role,is_active&limit=10"
    [pscustomobject]@{
      ok = $true
      supabase = $SupabaseUrl
      branches = @($branches).Count
      room_types = @($rooms).Count
      profiles = @($profiles).Count
      sample_rooms = $rooms
    } | ConvertTo-Json -Depth 8
  }

  "promote-super-admin" {
    if ([string]::IsNullOrWhiteSpace($UserId)) {
      throw "Missing -UserId or UNITE_SUPER_ADMIN_UID."
    }
    Upsert-Profile -ProfileUserId $UserId -ProfileEmail $Email -ProfileFullName $(if ($FullName) { $FullName } else { "Unite Super Admin" }) -ProfileRole "super_admin" -IsActive $true | ConvertTo-Json -Depth 8
  }

  "list-profiles" {
    try {
      Invoke-SupabaseRest -Path "user_profiles?select=id,email,full_name,role,is_active,created_at&order=created_at.desc" | ConvertTo-Json -Depth 8
    } catch {
      Invoke-SupabaseRest -Path "user_profiles?select=id,full_name,role,is_active,created_at&order=created_at.desc" | ConvertTo-Json -Depth 8
    }
  }

  "list-bookings" {
    Invoke-SupabaseRest -Path "bookings?select=id,public_code,customer_name,customer_phone,stay_date,start_time,end_time,status,total_amount,paid_amount&order=created_at.desc&limit=30" | ConvertTo-Json -Depth 8
  }

  "create-user" {
    if ([string]::IsNullOrWhiteSpace($Email) -or [string]::IsNullOrWhiteSpace($Password)) {
      throw "Create-user needs -Email and -Password."
    }
    $created = Invoke-SupabaseAuthAdmin -Path "users" -Method "POST" -Body @{
      email = $Email
      password = $Password
      email_confirm = $true
      user_metadata = @{
        full_name = $FullName
      }
    }
    $profile = Upsert-Profile -ProfileUserId $created.id -ProfileEmail $Email -ProfileFullName $FullName -ProfileRole $Role -IsActive $true
    [pscustomobject]@{
      ok = $true
      user_id = $created.id
      email = $created.email
      role = $Role
      profile = $profile
    } | ConvertTo-Json -Depth 8
  }

  "upsert-profile" {
    Upsert-Profile -ProfileUserId $UserId -ProfileEmail $Email -ProfileFullName $FullName -ProfileRole $Role -IsActive $true | ConvertTo-Json -Depth 8
  }

  "delete-booking" {
    if ([string]::IsNullOrWhiteSpace($BookingId)) {
      throw "Delete-booking needs -BookingId. Use public_code like US-20260709-001 or the Supabase UUID."
    }
    $safeBookingId = [System.Uri]::EscapeDataString($BookingId)
    if ($BookingId -match "^[0-9a-fA-F-]{36}$") {
      Invoke-SupabaseRest -Path "bookings?id=eq.$safeBookingId" -Method "DELETE" -ExtraHeaders @{ "Prefer" = "return=minimal" } | Out-Null
    } else {
      Invoke-SupabaseRest -Path "bookings?public_code=eq.$safeBookingId" -Method "DELETE" -ExtraHeaders @{ "Prefer" = "return=minimal" } | Out-Null
    }
    [pscustomobject]@{
      ok = $true
      deleted = $BookingId
    } | ConvertTo-Json -Depth 4
  }
}
