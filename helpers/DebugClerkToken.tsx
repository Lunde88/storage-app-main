"use client";
import { useSession } from "@clerk/nextjs";

export default function DebugClerkToken() {
  const { session } = useSession();
  if (!session) return <div>Loading...</div>;
  session.getToken().then((token) => {
    console.log("Clerk JWT:", token);
    // You can decode the JWT at https://jwt.io to inspect claims.
  });
  return <div>Check the browser console for your Clerk JWT</div>;
}
