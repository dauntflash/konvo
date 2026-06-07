"use client";
import React, { useEffect, useState } from "react";
import SettingsBar from "./settingsSideBar/settingsBar";
import General from "./general/general";
import Account from "./account/account";
import Personalization from "./personalization/personalization";
import Profile from "./profile/profile";

function Settings() {
  const [activeLink, setActiveLink] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("activeSettingsLink") || "General";
    }
    return "General";
  });

  useEffect(() => {
    localStorage.setItem("activeSettingsLink", activeLink);
  }, [activeLink]);

  return (
    <section className="size-full">
      <div className="flex flex-col md:flex-row bg-[rgba(17,25,40,0.95)] h-full w-full rounded-sm backdrop-blur-[19px] saturate-[180%]">
        <SettingsBar activeLink={activeLink} setActiveLink={setActiveLink} />
        <div className="size-full overflow-auto md:overflow-hidden">
            {(() => {
              switch (activeLink) {
                case "General":
                  return <General />;
                case "Account":
                  return <Account />;
                case "Personalization":
                  return <Personalization />;
                case "Profile":
                  return <Profile />;
              }
            })()}
        </div>
      </div>
    </section>
  );
}

export default Settings;