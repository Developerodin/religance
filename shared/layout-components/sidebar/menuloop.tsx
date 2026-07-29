import Link from "next/link";
import { Fragment } from "react";
import { useTheme } from "@/shared/theme/theme-provider";

function Menuloop({
  MenuItems,
  toggleSidemenu,
  level = 1,
  HoverToggleInnerMenuFn,
}: {
  MenuItems: any;
  toggleSidemenu: (event: any, item: any) => void;
  level?: number;
  HoverToggleInnerMenuFn: (event: any, item: any) => void;
}) {
  const { theme } = useTheme();

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
  };

  return (
    <Fragment>
      <Link
        href="#!"
        scroll={false}
        className={`side-menu__item ${MenuItems?.selected ? "active" : ""}`}
        onClick={(event) => {
          event.preventDefault();
          toggleSidemenu(event, MenuItems);
        }}
        onMouseEnter={(event) => HoverToggleInnerMenuFn(event, MenuItems)}
      >
        <span
          className={`hs-tooltip inline-block [--placement:right] leading-none ${theme?.dataVerticalStyle == "doublemenu" ? "" : "hidden"}`}
        >
          <button
            type="button"
            className="hs-tooltip-toggle  inline-flex justify-center items-center"
          >
            {MenuItems.icon}
            <span
              className="hs-tooltip-content hs-tooltip-shown:opacity-100 hs-tooltip-shown:visible opacity-0 transition-opacity inline-block absolute invisible z-10 py-1 px-2 bg-black text-xs font-medium text-white rounded shadow-sm dark:bg-neutral-700"
              role="tooltip"
            >
              {MenuItems.title}
            </span>
          </button>
        </span>
        {theme?.dataVerticalStyle != "doublemenu" ? MenuItems.icon : ""}

        <span className="side-menu__label">
          {MenuItems.title}
          {MenuItems.badgetxt ? (
            <span className={MenuItems.class}> {MenuItems.badgetxt} </span>
          ) : null}
        </span>
        {MenuItems.collapsible ? (
          <i className="fe fe-chevron-right side-menu__angle"></i>
        ) : null}
      </Link>
      <ul
        className={`slide-menu child${level} ${MenuItems.active ? "double-menu-active" : ""} ${MenuItems?.dirchange ? "force-left" : ""}`}
        style={MenuItems.active ? { display: "block" } : { display: "none" }}
      >
        {level <= 1 ? (
          <li className="slide side-menu__label1">
            <Link href="#!" scroll={false}>
              {MenuItems.title}
            </Link>
          </li>
        ) : (
          ""
        )}
        {MenuItems.children.map((firstlevel: any, index: number) => (
          <li
            className={`${firstlevel.type === "category" || firstlevel.menutitle ? "slide__category" : ""} ${firstlevel?.type == "empty" ? "slide" : ""} ${firstlevel?.type == "link" ? "slide" : ""} ${firstlevel?.type == "sub" ? "slide has-sub" : ""} ${firstlevel?.active ? "open" : ""} ${firstlevel?.selected ? "active" : ""}`}
            key={index}
          >
            {firstlevel.type === "category" && firstlevel.menutitle ? (
              <span className="category-name">{firstlevel.menutitle}</span>
            ) : null}
            {firstlevel.type === "link" ? (
              <Link
                href={firstlevel.path}
                className={`side-menu__item ${firstlevel.selected ? "active" : ""}`}
              >
                {firstlevel.icon}
                <span className="side-menu__label">
                  {firstlevel.title}
                  {firstlevel.badgetxt ? (
                    <span className={firstlevel.class}>{firstlevel.badgetxt}</span>
                  ) : null}
                </span>
              </Link>
            ) : (
              ""
            )}
            {firstlevel.type === "empty" ? (
              <Link href="#!" className="side-menu__item" onClick={handleClick}>
                {firstlevel.icon}
                <span className="">
                  {firstlevel.title}{" "}
                  {firstlevel.badgetxt ? (
                    <span className={firstlevel.class}> {firstlevel.badgetxt} </span>
                  ) : (
                    ""
                  )}
                </span>
              </Link>
            ) : (
              ""
            )}
            {firstlevel.type === "sub" ? (
              <Menuloop
                MenuItems={firstlevel}
                toggleSidemenu={toggleSidemenu}
                HoverToggleInnerMenuFn={HoverToggleInnerMenuFn}
                level={level + 1}
              />
            ) : (
              ""
            )}
          </li>
        ))}
      </ul>
    </Fragment>
  );
}

export default Menuloop;
