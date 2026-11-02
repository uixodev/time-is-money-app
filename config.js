// Cloud sync settings. Fill these two in from Supabase → Project Settings → API:
//   SUPABASE_URL       e.g. https://abcdefghijkl.supabase.co
//   SUPABASE_ANON_KEY  the "anon" / "publishable" key
// The anon key is meant to be public — your data is protected by Row Level Security (see supabase/schema.sql).
// NEVER put the "service_role" key here.
window.TICK_CONFIG = {
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
};
