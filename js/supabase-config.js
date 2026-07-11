// UNITESTAYCATION/js/supabase-config.js
// V15 AUDITED LIVE OPS CONFIG
// Chỉ dùng ANON/PUBLISHABLE key trong web public. Không dán service_role hoặc sb_secret vào file này.

window.UNITE_SUPABASE_CONFIG = {
  mode: "supabase", // local | supabase
  url: "https://icudxncctjselkjcbjvp.supabase.co", // ví dụ: https://xxxxx.supabase.co
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljdWR4bmNjdGpzZWxramNianZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MjgwOTAsImV4cCI6MjA5OTIwNDA5MH0.nPU8dSI5od2qE4LAacZgQpLEGk1agbcZZli8POaEuxg",
  publishableKey: "sb_publishable_YAFSrLzesZg7xGR62oVrdA_MQuKPyz5",
  sheetId: "PASTE_GOOGLE_SHEET_ID",
  sheetUrl: "",
  sheetWebhookUrl: "https://script.google.com/macros/s/AKfycbzZp3b7R4MXXATfGLSeEPl_Et9BlDYGF6cphetFl7gMmdTQ50bpaT3GbfkB2UfUcKc/exec",
  roomImageBucket: "room-images",
  paymentBillBucket: "payment-bills",
  authProvider: "email-password",
  requiredLogin: true,
  appVersion: "v15-audited"
};
