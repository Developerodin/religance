import React from "react";

const icon = (name: string) => (
  <i className={`bx ${name} side-menu__icon`}></i>
);

const subIcon = (name: string) => (
  <i className={`bx ${name} side-menu__icon side-menu__icon--sub`}></i>
);

/** Default CRM route after sign-in (first nav item). */
export const CRM_HOME_PATH = "/active-leads";

const linkItem = (
  title: string,
  path: string,
  bxIcon: string
) => ({
  icon: icon(bxIcon),
  title,
  type: "link",
  path,
  active: false,
  selected: false,
  dirchange: false,
});

/** Pharma CRM sidebar — navigation order */
export const MenuItems: any = [
  { menutitle: "CRM" },

  linkItem("Active Leads", "/active-leads", "bx-target-lock"),
  linkItem("Lead Discovery", "/lead-discovery", "bx-search-alt"),
  linkItem("Samples", "/samples", "bx-package"),
  linkItem("Quotations", "/quotations", "bx-file"),
  linkItem("Inbox", "/inbox", "bx-envelope"),
  linkItem("Mail assistant", "/mail-assistant", "bx-bot"),
  linkItem("Saved Contact", "/contacts", "bx-id-card"),
  linkItem("Reports", "/reports", "bx-bar-chart-alt-2"),

  {
    icon: icon("bx-cog"),
    title: "Settings",
    type: "sub",
    collapsible: true,
    active: false,
    selected: false,
    dirchange: false,
    children: [
      {
        icon: subIcon("bx-envelope"),
        path: "/templates",
        type: "link",
        active: false,
        selected: false,
        dirchange: false,
        title: "Email Templates",
      },
      {
        icon: subIcon("bx-droplet"),
        path: "/settings/salts",
        type: "link",
        active: false,
        selected: false,
        dirchange: false,
        title: "Salts Master",
      },
      {
        icon: subIcon("bx-plus-medical"),
        path: "/settings/medicines",
        type: "link",
        active: false,
        selected: false,
        dirchange: false,
        title: "Medicine Master",
      },
    ],
  },
];
