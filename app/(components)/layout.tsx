"use client";
import React from "react";
import { useTheme } from "@/shared/theme/theme-provider";

function Layout({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  const customstyles: React.CSSProperties = {
    ...(theme.colorPrimaryRgb !== "" && {
      "--primary-rgb": theme.colorPrimaryRgb,
    }),
    ...(theme.colorPrimary !== "" && { "--primary": theme.colorPrimary }),
    ...(theme.darkBg !== "" && { "--dark-bg": theme.darkBg }),
    ...(theme.bodyBg !== "" && { "--body-bg": theme.bodyBg }),
    ...(theme.inputBorder !== "" && { "--input-border": theme.inputBorder }),
    ...(theme.Light !== "" && { "--light": theme.Light }),
  } as React.CSSProperties;

  return (
    <html
      suppressHydrationWarning
      dir={theme.dir}
      className={theme.class}
      data-header-styles={theme.dataHeaderStyles}
      data-vertical-style={theme.dataVerticalStyle}
      data-nav-layout={theme.dataNavLayout}
      data-menu-styles={theme.dataMenuStyles}
      data-toggled={theme.dataToggled}
      data-nav-style={theme.dataNavStyle}
      hor-style={theme.horStyle}
      data-page-style={theme.dataPageStyle}
      data-width={theme.dataWidth}
      data-menu-position={theme.dataMenuPosition}
      data-header-position={theme.dataHeaderPosition}
      data-icon-overlay={theme.iconOverlay}
      bg-img={theme.bgImg}
      data-icon-text={theme.iconText}
      style={customstyles}
    >
      <head>
        <link
          rel="icon"
          href="/assets/images/brand-logos/religence-icon.png"
          type="image/png"
        />
        <meta
          name="description"
          content="Religence CRM — pharmaceutical lead discovery, pipeline management, and email outreach."
        />
        <meta
          name="keywords"
          content="Religence, pharma CRM, lead discovery, API salts, active leads, email templates"
        />
      </head>
      <body suppressHydrationWarning className={theme.body || ""}>
        {children}
      </body>
    </html>
  );
}

export default Layout;
