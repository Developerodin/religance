"use client";
import "./globals.scss";
import PrelineScript from "./PrelineScript";
import { ThemeProvider } from "@/shared/theme/theme-provider";

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <ThemeProvider>{children}</ThemeProvider>
      <PrelineScript />
    </>
  );
};
export default RootLayout;
