import { religenceIcon } from "@/shared/layout-components/brand-logos";

type BrandLogoProps = {
  /** Adds `main-logo` class used by sidebar theme styles */
  sidebar?: boolean;
  /** Adds `authentication-brand` class for login page */
  auth?: boolean;
};

/** Single icon + wordmark lockup (avoids duplicate theme logo slots). */
export default function BrandLogo({ sidebar, auth }: BrandLogoProps) {
  const rootClass = [
    "religence-brand",
    "religence-brand--single",
    sidebar ? "main-logo" : "",
    auth ? "authentication-brand" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={rootClass}>
      <img src={religenceIcon} alt="" className="religence-brand__icon" />
      <span className="religence-brand__text">Religence</span>
    </span>
  );
}
