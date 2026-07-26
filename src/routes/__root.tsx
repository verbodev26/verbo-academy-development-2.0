import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  Link,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { AuthProvider, useAuth as useAuthCtx } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Verbo Language Solutions</div>
        <h1 className="mt-4 text-6xl font-semibold tracking-tight text-foreground">404</h1>
        <p className="mt-3 text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
        <Link to="/" className="mt-6 inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-soft">
          Back home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please try again.</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-soft"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Verbo Language Solutions — Corporate English Training" },
      { name: "description", content: "Premium B2B English training platform for global teams." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700;800&family=Fraunces:opsz,wght@9..144,400;9..144,600&display=swap" },
      { rel: "stylesheet", href: "https://api.fontshare.com/v2/css?f[]=open-sauce-sans@300,400,500,600,700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PasswordChangeGate>
          <Outlet />
        </PasswordChangeGate>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function PasswordChangeGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuthCtx();
  const router = useRouter();
  const path = router.state.location.pathname;
  const allowed = path === "/change-password" || path === "/login" || path === "/";
  if (user?.must_change_password && !allowed) {
    return <RedirectToChangePassword />;
  }
  return <>{children}</>;
}

function RedirectToChangePassword() {
  const router = useRouter();
  React.useEffect(() => {
    router.navigate({ to: "/change-password" });
  }, [router]);
  return null;
}
