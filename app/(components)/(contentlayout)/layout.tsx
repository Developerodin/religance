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
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";

export default function ContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, setTheme } = useTheme();
  const [authed, setAuthed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isAuthed()) {
      setAuthed(true);
    } else {
      router.replace("/");
    }
  }, [router]);

  const bodyClick = () => {
    if (localStorage.getItem("ynexverticalstyles") === "icontext") {
      return;
    }
    if (window.innerWidth > 992 && theme.iconOverlay === "open") {
      setTheme({ iconOverlay: "" });
    }
  };

  if (!authed) {
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
