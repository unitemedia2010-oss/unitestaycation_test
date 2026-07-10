param(
  [string]$ProjectRef = "afjzycyffhhyifixtelq",
  [string]$SupabaseAccessToken = $env:SUPABASE_ACCESS_TOKEN
)

$ErrorActionPreference = "Stop"

if ($SupabaseAccessToken) {
  $env:SUPABASE_ACCESS_TOKEN = $SupabaseAccessToken
}

Write-Host "Linking Supabase project $ProjectRef..."
npx.cmd supabase link --project-ref $ProjectRef

Write-Host "Deploying create-ops-user..."
npx.cmd supabase functions deploy create-ops-user --no-verify-jwt

Write-Host "Done. Function URL:"
Write-Host "https://$ProjectRef.supabase.co/functions/v1/create-ops-user"
