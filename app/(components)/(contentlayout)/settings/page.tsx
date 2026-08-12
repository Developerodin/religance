"use client";

import Seo from "@/shared/layout-components/seo/seo";
import Link from "next/link";
import { Fragment } from "react";

const SETTINGS_LINKS = [
  {
    title: "Email Templates",
    description: "Intro, follow-up, and quotation email templates with merge fields.",
    path: "/templates",
    icon: "ri-mail-settings-line",
    iconClass: "bg-primary/10 text-primary",
  },
  {
    title: "Salts Master",
    description: "Master list of API salts used in Lead Discovery.",
    path: "/settings/salts",
    icon: "ri-test-tube-line",
    iconClass: "bg-success/10 text-success",
  },
  {
    title: "Medicine Master",
    description: "Branded medicines mapped to salts and dosage forms.",
    path: "/settings/medicines",
    icon: "ri-capsule-line",
    iconClass: "bg-info/10 text-info",
  },
] as const;

export default function SettingsPage() {
  return (
    <Fragment>
      <Seo title="Settings" />
      <div className="mb-4">
        <h5 className="font-semibold text-defaulttextcolor mb-1">Settings</h5>
        <p className="text-[0.875rem] text-textmuted mb-0">
          Configure templates and discovery master data.
        </p>
      </div>
      <div className="grid grid-cols-12 gap-4">
        {SETTINGS_LINKS.map((item) => (
          <div key={item.path} className="col-span-12 md:col-span-4">
            <Link
              href={item.path}
              className="box custom-box !mb-0 h-full transition-shadow hover:shadow-md"
            >
              <div className="box-body">
                <span
                  className={`avatar avatar-md mb-3 inline-flex ${item.iconClass}`}
                >
                  <i className={`${item.icon} text-xl`}></i>
                </span>
                <h6 className="font-semibold text-[0.9375rem] mb-1">
                  {item.title}
                </h6>
                <p className="text-[0.8125rem] text-textmuted mb-0">
                  {item.description}
                </p>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </Fragment>
  );
}
