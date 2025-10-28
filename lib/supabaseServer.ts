import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

export async function getServerSupabaseClient() {
  const { getToken } = await auth();
  const token = await getToken();
  //    const token = await getToken({ template: "supabase" }); // adjust as needed
  if (!token)
    throw new Error("No JWT found for this session. Is the user signed in?");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );
}
