import { ClerkProvider } from "@clerk/nextjs";
import "@/styles/globals.css";
import { roboto, oswald } from "@/styles/fonts";
import ScrollToTopOnRouteChange from "@/components/helpers/ScrollToTopOnRouteChange";
import MobileHeader from "@/components/header/MobileHeader";
import DesktopHeader from "@/components/header/DesktopHeader";

export const viewport = {
  themeColor: "#ffffff", // navbar/header colour
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${roboto.variable} ${oswald.variable} scroll-pt-20 bg-white md:scroll-pt-24`}
      >
        <body className="min-h-screen bg-[#FFFBF8]">
          <ScrollToTopOnRouteChange />

          {/* Mobile header (shown up to md breakpoint) */}
          <div className="block lg:hidden">
            <MobileHeader />
          </div>

          {/* Desktop header (shown from md breakpoint upwards) */}
          <div className="hidden lg:block">
            <DesktopHeader />
          </div>

          {/* Main content */}
          {/* padding top is based on header height plus desired global padding  */}
          <main className="mx-auto max-w-7xl px-3 pt-[77px] pb-24 md:px-4 lg:pt-[128px] xl:px-10">
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  );
}
