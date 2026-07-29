"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "link"
  | "light"
  | "danger";

export type ButtonSize = "sm" | "md";

const variantClass: Record<ButtonVariant, string> = {
  primary: "ti-btn-primary",
  secondary: "ti-btn-secondary",
  ghost: "ti-btn-ghost-primary",
  link: "ti-btn-link",
  light: "ti-btn-light",
  danger: "ti-btn-danger",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "crm-btn--sm",
  md: "crm-btn--md",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

/** Ynex ti-btn wrapper — never use theme ti-btn-sm on text labels (1.75rem²). */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    className = "",
    type = "button",
    disabled,
    children,
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={[
        "ti-btn crm-btn",
        variantClass[variant],
        sizeClass[size],
        disabled ? "ti-btn-disabled" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
});
