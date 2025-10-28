import { Roboto, Oswald } from "next/font/google";

/* Sans-serif body font */
export const roboto = Roboto({
  subsets: ["latin"],
  variable: "--font-sans", // 👈 matches the token you use in @theme
  weight: ["100", "300", "400", "500", "700", "900"],
  display: "swap",
});

/* Heading font */
export const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["200", "400", "600", "700"],
  display: "swap",
});
