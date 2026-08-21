"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import type { IStaticMethods } from "preline/preline";

declare global {
  interface Window {
    HSStaticMethods: IStaticMethods;
  }
}

/** Preline HSTabs throws if a tab group has no `.active` toggle. */
function ensureTabDefaults() {
  const groups = new Map<Element, HTMLElement[]>();

  document.querySelectorAll<HTMLElement>("[data-hs-tab]").forEach((tab) => {
    const root =
      tab.closest('[role="tablist"]') ??
      tab.parentElement?.closest("nav") ??
      tab.parentElement;
    if (!root) return;

    const list = groups.get(root) ?? [];
    list.push(tab);
    groups.set(root, list);
  });

  groups.forEach((tabs) => {
    if (!tabs.some((tab) => tab.classList.contains("active"))) {
      tabs[0]?.classList.add("active");
    }
  });
}

/**
 * Preline registers window `resize`/`scroll` handlers at import time that read
 * `window.$hs*Collection.length`, but only creates those globals inside the
 * `load`-event autoInit — which never fires when the module is imported after
 * the page has loaded. Seed them so the handlers can't throw.
 * ponytail: empty arrays, autoInit repopulates them.
 */
function seedCollections() {
  const w = window as unknown as Record<string, unknown[]>;
  for (const name of COLLECTIONS) {
    w[name] ??= [];
  }
}

const COLLECTIONS = [
  "$hsAccordionCollection",
  "$hsCarouselCollection",
  "$hsCollapseCollection",
  "$hsComboBoxCollection",
  "$hsCopyMarkupCollection",
  "$hsDropdownCollection",
  "$hsInputNumberCollection",
  "$hsOverlayCollection",
  "$hsPinInputCollection",
  "$hsRemoveElementCollection",
  "$hsScrollspyCollection",
  "$hsSearchByJsonCollection",
  "$hsSelectCollection",
  "$hsStepperCollection",
  "$hsStrongPasswordCollection",
  "$hsTabsCollection",
  "$hsThemeSwitchCollection",
  "$hsToggleCountCollection",
  "$hsTogglePasswordCollection",
  "$hsTooltipCollection",
];

function safeAutoInit() {
  if (typeof window === "undefined" || !window.HSStaticMethods?.autoInit) {
    return;
  }

  try {
    ensureTabDefaults();
    window.HSStaticMethods.autoInit();
  } catch (error) {
    console.warn("Preline autoInit skipped:", error);
  }
}

function shouldSkipAutoInit(pathname: string | null): boolean {
  if (!pathname) return true;
  return pathname.startsWith("/mail-assistant");
}

export default function PrelineScript() {
  const path = usePathname();
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      if (!loadedRef.current) {
        await import("preline/preline");
        seedCollections();
        loadedRef.current = true;
      }

      if (cancelled || shouldSkipAutoInit(path)) return;

      // Wait for React to commit route DOM before Preline scans the page.
      requestAnimationFrame(() => {
        if (cancelled) return;
        setTimeout(safeAutoInit, 0);
      });
    };

    void boot();

    return () => {
      cancelled = true;
    };
  }, [path]);

  return null;
}
