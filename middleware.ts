// import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// const isPublicRoute = createRouteMatcher([
//   "/sign-in(.*)",
//   "/sign-up(.*)",
//   "/api/(.*)",
// ]);

// export default clerkMiddleware(async (auth, req) => {
//   if (req.nextUrl.pathname.startsWith("/api/webhooks/")) return;
//   if (!isPublicRoute(req)) {
//     await auth.protect();
//   }
// });

// export const config = {
//   matcher: [
//     // Skip Next.js internals and all static files, unless found in search params
//     "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
//     // Always run for API routes
//     // "/(api|trpc)(.*)",
//   ],
// };

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/no-org(.*)",
  "/api/webhooks/(.*)", // keep webhooks public
]);

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // Let public routes through
  if (isPublicRoute(req)) return;

  // Get the auth object (middleware: it's async)
  const a = await auth();

  // Not signed in → send to sign-in
  if (!a.userId) {
    return a.redirectToSignIn({ returnBackUrl: req.url });
  }

  // Signed in but no active org → send to /no-org
  if (!a.orgId && !pathname.startsWith("/no-org")) {
    const url = new URL("/no-org", req.url);
    url.searchParams.set("from", pathname);
    return Response.redirect(url);
  }

  // Otherwise allow
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
