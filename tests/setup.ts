// Environnement de test : pile Supabase locale (clés de démonstration publiques du CLI).
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??=
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
process.env.SUPABASE_SERVICE_ROLE_KEY ??=
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";
process.env.STRIPE_SECRET_KEY ??= "sk_test_local_placeholder";
process.env.STRIPE_WEBHOOK_SECRET ??= "whsec_local_test_secret";
process.env.STRIPE_PRICE_MONTHLY ??= "price_test_monthly";
process.env.STRIPE_PRICE_YEARLY ??= "price_test_yearly";
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
