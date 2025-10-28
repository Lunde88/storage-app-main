// lib/supabaseClient.ts
// import { createClient } from "@supabase/supabase-js";

// export const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// );

import { useMemo } from "react";
import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { useSession } from "@clerk/nextjs";

export function useClerkSupabaseClient(): SupabaseClient {
  const { session } = useSession();

  // Memoise client so it's recreated only when session changes
  return useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          accessToken: async () => session?.getToken() ?? null,
        }
      ),
    [session]
  );
}
