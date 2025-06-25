import { createBrowserClient } from '@supabase/ssr';

function getSupabaseBrowserClient() {
  const url = "http://127.0.0.1:54331";
  const anon = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxvY2FsaG9zdCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjQ1MTkyODI0LCJleHAiOjE5NjA3Njg4MjR9.M9jrxyvPLkUxWgOYSf5dNdJ8v_eWrqwgk_5x5Z5Z5Z5";
  return createBrowserClient(url, anon);
}

export { getSupabaseBrowserClient as g };
//# sourceMappingURL=supabase-client-V5KmjbJ_.mjs.map
