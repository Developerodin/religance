"use client";
import PrelineScript from "@/app/PrelineScript";
import { isAuthed } from "@/shared/auth/auth-client";
import { CrmProvider } from "@/shared/crm/store/crm-context";
import { NotificationProvider } from "@/shared/crm/notifications/notification-context";
import Backtotop from "@/shared/layout-components/backtotop/backtotop";
import Footer from "@/shared/layout-components/footer/footer";
import Header from "@/shared/layout-components/header/header";
import Sidebar from "@/shared/layout-components/sidebar/sidebar";
import { useTheme } from "@/shared/theme/theme-provider";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";

type AuthGate = "loading" | "authenticated" | "unauthenticated";

export default function ContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, setTheme } = useTheme();
  const [authGate, setAuthGate] = useState<AuthGate>("loading");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Wait for localStorage SoT before redirect — never treat loading as unauth.
    if (isAuthed()) {
      setAuthGate("authenticated");
      return;
    }
    setAuthGate("unauthenticated");
    const redirect = pathname && pathname !== "/" ? `/?redirect=${encodeURIComponent(pathname)}` : "/";
    router.replace(redirect);
  }, [router, pathname]);

  const bodyClick = () => {
    if (localStorage.getItem("ynexverticalstyles") === "icontext") {
      return;
    }
    if (window.innerWidth > 992 && theme.iconOverlay === "open") {
      setTheme({ iconOverlay: "" });
    }
  };

  // ponytail: blank while loading — avoids login flash before rehydrate
  if (authGate !== "authenticated") {
    return null;
  }

  return (
    <Fragment>
      <div className="page">
        <NotificationProvider>
          <Header />
        </NotificationProvider>
        <Sidebar />
        <div className="content">
          <div className="main-content" onClick={bodyClick}>
            <CrmProvider>{children}</CrmProvider>
          </div>
        </div>
        <Footer />
      </div>
      <Backtotop />
      <PrelineScript />
    </Fragment>
  );
}
