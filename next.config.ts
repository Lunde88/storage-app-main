import type { NextConfig } from "next";

const SUPABASE_PROJECT_ID = "upzdlombkzvqcdsqzjzd";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: `${SUPABASE_PROJECT_ID}.supabase.co`,
        port: "",
        pathname: "/storage/v1/object/sign/**",
      },
    ],
  },
};

export default nextConfig;
