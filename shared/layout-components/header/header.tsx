"use client"
import Link from 'next/link'
import React, { Fragment, useEffect, useState } from 'react';
import BrandLogo from '@/shared/layout-components/brand-logo/brand-logo';
import { CRM_HOME_PATH } from '@/shared/layout-components/sidebar/nav';
import { getUser, logout } from '@/shared/auth/auth-client';
import { useRouter } from 'next/navigation';
import { useNotifications } from "@/shared/crm/notifications/notification-context";
import { formatNotificationTime } from "@/shared/crm/notifications/notification-time";
import { useTheme } from "@/shared/theme/theme-provider";

const Header = () => {
  const { theme, setTheme, applyDark, applyLight } = useTheme();
  const router = useRouter();
  const authUser = getUser();
  const displayName =
    authUser?.name?.trim() ||
    authUser?.email?.split("@")[0] ||
    "Account";
  const displaySubtitle = authUser?.email ?? "";

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  const isDark = theme.class === "dark";
  const toggleTheme = () => (isDark ? applyLight : applyDark)();

  const {
    items: notifications,
    total,
    activityTotal,
    loading,
    markingAllAsRead,
    error,
    removeNotification,
    markAllAsRead,
  } = useNotifications();

  const showBadge = !loading && !error && total > 0;

  const iconColorForCategory = (category: "action" | "activity") =>
    category === "action"
      ? { bg: "!bg-primary/10", text: "primary" }
      : { bg: "!bg-secondary/10", text: "secondary" };

  const handleNotificationClick = (
    id: string,
    href: string,
    event: React.MouseEvent<HTMLAnchorElement, MouseEvent>
  ) => {
    event.preventDefault();
    void removeNotification(id, { navigate: href });
  };

  //full screen
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const fullscreenChangeHandler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", fullscreenChangeHandler);

    return () => {
      document.removeEventListener("fullscreenchange", fullscreenChangeHandler);
    };
  }, []);


  function menuClose() {
    if (window.innerWidth <= 992) {
      setTheme({ dataToggled: "close" });
    } else if (window.innerWidth >= 992) {
      setTheme({ dataToggled: theme.dataToggled || "" });
    }
  }

  const toggleSidebar = () => {
    let sidemenuType = theme.dataNavLayout;
    if (window.innerWidth >= 992) {
      if (sidemenuType === "vertical") {
        let verticalStyle = theme.dataVerticalStyle;
        const navStyle = theme.dataNavStyle;
        switch (verticalStyle) {
          // closed
          case "closed":
            setTheme({ "dataNavStyle": "" });
            if (theme.dataToggled === "close-menu-close") {
              setTheme({ "dataToggled": "" });
            } else {
              setTheme({ "dataToggled": "close-menu-close" });
            }
            break;
          // icon-overlay
          case "overlay":
            setTheme({ "dataNavStyle": "" });
            if (theme.dataToggled === "icon-overlay-close") {
              setTheme({ "dataToggled": "","iconOverlay" :''});
            } else {
              if (window.innerWidth >= 992) {
                setTheme({ "dataToggled": "icon-overlay-close","iconOverlay" :'' });
              }
            }
            break;
          // icon-text
          case "icontext":
            setTheme({ "dataNavStyle": "" });
            if (theme.dataToggled === "icon-text-close") {
              setTheme({ "dataToggled": "" });
            } else {
              setTheme({ "dataToggled": "icon-text-close" });
            }
            break;
          // doublemenu
          case "doublemenu":
            setTheme({ "dataNavStyle": "" });
            setTheme({ "dataNavStyle": "" });
              if (theme.dataToggled === "double-menu-open") {
                setTheme({ "dataToggled": "double-menu-close" });
              } else {
                let sidemenu = document.querySelector(".side-menu__item.active");
                if (sidemenu) {
                  setTheme({ "dataToggled": "double-menu-open" });
                  if (sidemenu.nextElementSibling) {
                    sidemenu.nextElementSibling.classList.add("double-menu-active");
                  } else {

                    setTheme({ "dataToggled": "double-menu-close" });
                  }
                }
              }
            // doublemenu(ThemeChanger);
            break;
          // detached
          case "detached":
            if (theme.dataToggled === "detached-close") {
              setTheme({ "dataToggled": "","iconOverlay" :'' });
            } else {
              setTheme({ "dataToggled": "detached-close","iconOverlay" :'' });
            }
            
            break;

          // default
          case "default":
            setTheme({ "dataToggled": "" });
        }
        switch (navStyle) {
          case "menu-click":
            if (theme.dataToggled === "menu-click-closed") {
              setTheme({ "dataToggled": "" });
            }
            else {
              setTheme({ "dataToggled": "menu-click-closed" });
            }
            break;
          // icon-overlay
          case "menu-hover":
            if (theme.dataToggled === "menu-hover-closed") {
              setTheme({ "dataToggled": "" });
            } else {
              setTheme({ "dataToggled": "menu-hover-closed"});

            }
            break;
          case "icon-click":
            if (theme.dataToggled === "icon-click-closed") {
              setTheme({ "dataToggled": "" });
            } else {
              setTheme({ "dataToggled": "icon-click-closed" });

            }
            break;
          case "icon-hover":
            if (theme.dataToggled === "icon-hover-closed") {
              setTheme({ "dataToggled": "" });
            } else {
              setTheme({ "dataToggled": "icon-hover-closed" });

            }
            break;

        }
      }
    }
    else {
      if (theme.dataToggled !== "open") {
        setTheme({ "dataToggled": "open" });

        setTimeout(() => {
          if (theme.dataToggled == "open") {
            const overlay = document.querySelector("#responsive-overlay");

            if (overlay) {
              overlay.classList.add("active");
              overlay.addEventListener("click", () => {
                const overlay = document.querySelector("#responsive-overlay");

                if (overlay) {
                  overlay.classList.remove("active");
                  menuClose();
                }
              });
            }
          }

          window.addEventListener("resize", () => {
            if (window.screen.width >= 992) {
              const overlay = document.querySelector("#responsive-overlay");

              if (overlay) {
                overlay.classList.remove("active");
              }
            }
          });
        }, 100);
      } else {
        setTheme({ "dataToggled": "close" });
      }
    }
    
   

  };

  useEffect(() => {
    const navbar = document?.querySelector(".header");
    const navbar1 = document?.querySelector(".app-sidebar");
    const sticky:any = navbar?.clientHeight;
    // const sticky1 = navbar1.clientHeight;

    function stickyFn() {
      if (window.pageYOffset >= sticky) {
        navbar?.classList.add("sticky-pin");
        navbar1?.classList.add("sticky-pin");
      } else {
        navbar?.classList.remove("sticky-pin");
        navbar1?.classList.remove("sticky-pin");
      }
    }

    window.addEventListener("scroll", stickyFn);
    window.addEventListener("DOMContentLoaded", stickyFn);

    // Cleanup event listeners when the component unmounts
    return () => {
      window.removeEventListener("scroll", stickyFn);
      window.removeEventListener("DOMContentLoaded", stickyFn);
    };
  }, []);

  return (
    <Fragment>
      <div className="app-header">
        <nav className="main-header !h-[3.75rem]" aria-label="Global">
          <div className="main-header-container ps-[0.725rem] pe-[1rem] ">

            <div className="header-content-left">
              <div className="header-element">
                <div className="horizontal-logo">
                  <Link href={CRM_HOME_PATH} className="header-logo" aria-label="religence home">
                    <BrandLogo />
                  </Link>
                </div>
              </div>
              <div className="header-element md:px-[0.325rem] !items-center" onClick={() => toggleSidebar()}>
                <Link aria-label="Hide Sidebar"
                  className="sidemenu-toggle animated-arrow  hor-toggle horizontal-navtoggle inline-flex items-center" href="#!" scroll={false}><span></span></Link>
              </div>
            </div>
            <div className="header-content-right">

              <div className="header-element py-[1rem] md:px-[0.65rem] px-2">
                <button
                  aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                  title={isDark ? "Light mode" : "Dark mode"}
                  type="button"
                  onClick={toggleTheme}
                  className="inline-flex flex-shrink-0 justify-center items-center gap-2 !rounded-full font-medium transition-all dark:hover:bg-black/20 dark:text-white/50 dark:hover:text-white"
                >
                  <i className={`bx ${isDark ? "bx-sun" : "bx-moon"} header-link-icon`}></i>
                </button>
              </div>
              <div className="header-element py-[1rem] md:px-[0.65rem] px-2 notifications-dropdown header-notification hs-dropdown ti-dropdown !hidden md:!block [--placement:bottom-right]">
                <button id="dropdown-notification" type="button"
                  className="hs-dropdown-toggle relative ti-dropdown-toggle !p-0 !border-0 flex-shrink-0  !rounded-full !shadow-none align-middle text-xs">
                  <i className="bx bx-bell header-link-icon  text-[1.125rem]"></i>
                  <span className="flex absolute h-5 w-5 -top-[0.25rem] end-0  -me-[0.6rem]">
                    {showBadge ? (
                      <span
                        className="animate-slow-ping absolute inline-flex -top-[2px] -start-[2px] h-full w-full rounded-full bg-secondary/40 opacity-75"></span>
                    ) : null}
                    <span
                      className={`relative inline-flex justify-center items-center rounded-full h-[14.7px] w-[14px] bg-secondary text-[0.625rem] text-white ${showBadge ? "" : "hidden"}`}
                      id="notification-icon-badge">{total}</span>
                  </span>
                </button>
                <div className="main-header-dropdown !-mt-3 !p-0 hs-dropdown-menu ti-dropdown-menu bg-white dark:bg-bodybg !w-[23.75rem] min-w-[380px] border border-defaultborder dark:border-white/10 hidden !m-0 overflow-hidden"
                  aria-labelledby="dropdown-notification">

                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="mb-0 text-[1rem] font-semibold text-defaulttextcolor dark:text-white">
                        Notifications
                      </p>
                      {showBadge ? (
                        <span
                          className="shrink-0 rounded-sm bg-secondary/10 px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-secondary"
                          id="notifiation-data">
                          {total} unread
                        </span>
                      ) : null}
                    </div>
                    {total > 0 ? (
                      <button
                        type="button"
                        aria-label="Mark all notifications as read"
                        disabled={loading || markingAllAsRead}
                        onClick={() => void markAllAsRead()}
                        className="shrink-0 rounded-md px-2 py-2 text-[0.75rem] font-medium text-textmuted transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-50 dark:text-white/60 dark:hover:text-white min-h-[2.75rem]"
                      >
                        {markingAllAsRead ? "Clearing…" : "Mark all as read"}
                      </button>
                    ) : null}
                  </div>
                  <div className="dropdown-divider"></div>
                  <ul className="list-none !m-0 !p-0 max-h-80 overflow-y-auto" id="header-notification-scroll">
                  {notifications.map((item) => {
                    const colors = iconColorForCategory(item.category);
                    const received = formatNotificationTime(item.createdAt);
                    return (
                      <li className="border-b border-defaultborder dark:border-white/10 last:border-b-0" key={item.id}>
                        <div className="flex items-start gap-3 px-4 py-3">
                          <span
                            className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[1.125rem] text-${colors.text} ${colors.bg}`}
                            aria-hidden="true">
                            <i className={`ti ti-${item.icon}`}></i>
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="mb-0 text-[0.8125rem] font-semibold leading-snug text-defaulttextcolor dark:text-white">
                              <Link
                                href={item.href}
                                scroll={false}
                                className="text-inherit no-underline hover:text-primary"
                                onClick={(event) =>
                                  handleNotificationClick(item.id, item.href, event)
                                }>
                                {item.title}
                              </Link>
                            </p>
                            <p className="mb-0 mt-0.5 text-[0.75rem] font-normal leading-snug text-textmuted dark:text-white/50 header-notification-text">
                              {item.body}
                            </p>
                            <time
                              className="mt-1 block text-[0.6875rem] font-normal text-textmuted/80 dark:text-white/40"
                              dateTime={received.iso}
                              title={received.title}>
                              {received.label}
                            </time>
                          </div>
                          <button
                            type="button"
                            aria-label="Dismiss notification"
                            className="-me-1 inline-flex shrink-0 items-center justify-center rounded-md text-textmuted transition-colors hover:bg-black/5 hover:text-defaulttextcolor dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white min-h-[2.75rem] min-w-[2.75rem]"
                            onClick={(event) => {
                              event.stopPropagation();
                              void removeNotification(item.id);
                            }}>
                            <i className="ti ti-x" aria-hidden="true"></i>
                          </button>
                        </div>
                      </li>
                    );
                  })}
                  </ul>

                  <div className={`border-t border-defaultborder p-4 dark:border-white/10 empty-header-item1 ${notifications.length === 0 ? "hidden" : "block"}`}>
                    {activityTotal > 0 ? (
                      <Link href="/notifications" className="ti-btn ti-btn-primary-full !m-0 w-full p-2">
                        View all
                      </Link>
                    ) : total > 0 ? (
                      <p className="mb-0 text-center text-[0.75rem] text-textmuted dark:text-white/50">
                        Action items above
                      </p>
                    ) : null}
                  </div>
                  <div className={`px-6 py-10 text-center empty-item1 ${total === 0 ? "block" : "hidden"}`}>
                    <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-secondary/10 text-[1.5rem] text-secondary" aria-hidden="true">
                      <i className="ti ti-bell-off"></i>
                    </span>
                    <p className="mb-1 mt-3 text-[0.9375rem] font-semibold text-defaulttextcolor dark:text-white">
                      No notifications
                    </p>
                    <p className="mb-0 text-[0.8125rem] text-textmuted dark:text-white/50">
                      You&apos;re all caught up.
                    </p>
                  </div>
                </div>
              </div>
              <div className="header-element header-fullscreen py-[1rem] md:px-[0.65rem] px-2">
              <button
                  aria-label="anchor"
                  onClick={() => toggleFullscreen()}
                  className="inline-flex flex-shrink-0 justify-center items-center gap-2  !rounded-full font-medium dark:hover:bg-black/20 dark:text-[#8c9097] dark:text-white/50 dark:hover:text-white dark:focus:ring-white/10 dark:focus:ring-offset-white/10"
                >
                  {isFullscreen ? (
                    <i className="bx bx-exit-fullscreen full-screen-close header-link-icon"></i>
                  ) : (
                    <i className="bx bx-fullscreen full-screen-open header-link-icon"></i>
                  )}
                </button>
              </div>
              <div className="header-element md:!px-[0.65rem] px-2 hs-dropdown !items-center ti-dropdown [--placement:bottom-left]">

                <button id="dropdown-profile" type="button"
                  className="hs-dropdown-toggle ti-dropdown-toggle !gap-2 !p-0 flex-shrink-0 sm:me-2 me-0 !rounded-full !shadow-none text-xs align-middle !border-0 !shadow-transparent ">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-[0.75rem] font-semibold">
                    {displayName
                      .split(/\s+/)
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                </button>
                <div className="md:block hidden dropdown-profile">
                  <p className="font-semibold mb-0 leading-none text-[#536485] text-[0.813rem] ">{displayName}</p>
                  <span className="opacity-[0.7] font-normal text-[#536485] block text-[0.6875rem] truncate max-w-[10rem]" title={displaySubtitle}>{displaySubtitle}</span>
                </div>
                <div
                  className="hs-dropdown-menu ti-dropdown-menu !-mt-3 border-0 w-[11rem] !p-0 border-defaultborder hidden main-header-dropdown  pt-0 overflow-hidden header-profile-dropdown dropdown-menu-end"
                  aria-labelledby="dropdown-profile">

                  <ul className="text-defaulttextcolor font-medium dark:text-[#8c9097] dark:text-white/50">
                    <li>
                      <Link className="w-full ti-dropdown-item !text-[0.8125rem] !gap-x-0  !p-[0.65rem]" href="#!">
                        <i className="ti ti-user-circle text-[1.125rem] me-2 opacity-[0.7] !inline-flex"></i>Profile
                      </Link>
                    </li>
                    <li>
                      <Link className="w-full ti-dropdown-item !text-[0.8125rem] !gap-x-0  !p-[0.65rem] " href="#!"><i
                        className="ti ti-inbox text-[1.125rem] me-2 opacity-[0.7] !inline-flex"></i>Inbox <span
                          className="!py-1 !px-[0.45rem] !font-semibold !rounded-sm text-success text-[0.75em] bg-success/10 ms-auto">25</span>
                      </Link>
                    </li>
                    <li><Link className="w-full ti-dropdown-item !text-[0.8125rem] !gap-x-0 !p-[0.65rem]" href="#!"><i
                      className="ti ti-clipboard-check text-[1.125rem] me-2 opacity-[0.7] !inline-flex"></i>Task Manager</Link></li>
                    <li><Link className="w-full ti-dropdown-item !text-[0.8125rem] !gap-x-0 !p-[0.65rem]" href="#!"><i
                      className="ti ti-adjustments-horizontal text-[1.125rem] me-2 opacity-[0.7] !inline-flex"></i>Settings</Link></li>
                    <li><Link className="w-full ti-dropdown-item !text-[0.8125rem] !gap-x-0 !p-[0.65rem] " href="#!" scroll={false}><i
                      className="ti ti-wallet text-[1.125rem] me-2 opacity-[0.7 !inline-flex"></i>Bal: $7,12,950</Link></li>
                    <li><Link className="w-full ti-dropdown-item !text-[0.8125rem] !p-[0.65rem] !gap-x-0 !inline-flex" href="#!"><i
                      className="ti ti-headset text-[1.125rem] me-2 opacity-[0.7] !inline-flex"></i>Support</Link></li>
                    <li>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full ti-dropdown-item !text-[0.8125rem] !p-[0.65rem] !gap-x-0 !inline-flex"
                      >
                        <i className="ti ti-logout text-[1.125rem] me-2 opacity-[0.7] !inline-flex"></i>
                        Log Out
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </Fragment>
  )
}

export default Header;