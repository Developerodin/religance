"use client"
import PrelineScript from "@/app/PrelineScript"
import { isAuthed } from "@/shared/auth/auth-client"
import { CrmProvider } from "@/shared/crm/store/crm-context"
import { NotificationProvider } from "@/shared/crm/notifications/notification-context"
import Backtotop from "@/shared/layout-components/backtotop/backtotop"
import Footer from "@/shared/layout-components/footer/footer"
import Header from "@/shared/layout-components/header/header"
import Sidebar from "@/shared/layout-components/sidebar/sidebar"
import { ThemeChanger } from "@/shared/redux/action"
import store from "@/shared/redux/store"
import { useRouter } from "next/navigation"
import { Fragment, useEffect, useState } from "react"
import {  connect } from "react-redux"

const Layout = ({children,}:any) => {

  const [MyclassName, setMyClass] = useState("");
  const [authed, setAuthed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isAuthed()) {
      setAuthed(true);
    } else {
      router.replace("/");
    }
  }, [router]);

  const Bodyclickk = () => {
    const theme = store.getState();
    if (localStorage.getItem("ynexverticalstyles") == "icontext") {
      setMyClass("");
    }
    if (window.innerWidth > 992) {
      if (theme.iconOverlay === 'open') {
        ThemeChanger({ ...theme, iconOverlay: "" });
      }
    }
  }

  if (!authed) {
    return null; // ponytail: blank until onAuthStateChanged confirms — redirect happens in effect
  }

  return (
    <>


    <Fragment>
<div className='page'>
        <NotificationProvider>
          <Header/>
        </NotificationProvider>
        <Sidebar/>
        <div className='content'>
          <div className='main-content'  
          onClick={Bodyclickk}
          >
            <CrmProvider>{children}</CrmProvider>
          </div>
        </div>
        <Footer/>
      </div>
      <Backtotop/>
      <PrelineScript/>
    </Fragment>
    </>
  )
}

const mapStateToProps = (state: any) => ({
  local_varaiable: state
});

const ConnectedLayout = connect(mapStateToProps, { ThemeChanger})(Layout);

// Next's App Router requires the default export to accept only `children`;
// a connect()-wrapped component exposes extra props and fails that contract.
export default function ContentLayout({children}: {children: React.ReactNode}) {
  return <ConnectedLayout>{children}</ConnectedLayout>;
}
