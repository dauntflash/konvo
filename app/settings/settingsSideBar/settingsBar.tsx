import React, { useState } from "react";

type settingsProp = {
  activeLink: string
  setActiveLink:any
}

function SettingsBar({activeLink, setActiveLink}:settingsProp) {

  return (
    <div className="h-auto md:h-full border-b md:border-b-0 md:border-r border-[rgba(255,255,255,0.1)] border-[2px] ">
      <div className="w-full md:w-[300px] flex flex-col items-center justify-center ">
        <ul className="*:p-2 w-full *:px-4 *:py-5 *:border-[rgba(255,255,255,0.1)] *:border-b-[1px] *:cursor-pointer flex flex-row md:flex-col">
          <li className={`flex-1 md:flex-none text-center md:text-left ${activeLink ==="General"?"bg-[rgba(81,130,254,0.16)]":"hover:bg-[rgba(81,130,254,0.03)]"}`} onClick={()=>setActiveLink("General")} >General</li>
          <li className={`flex-1 md:flex-none text-center md:text-left ${activeLink ==="Account"?"bg-[rgba(81,130,254,0.16)]":"hover:bg-[rgba(81,130,254,0.03)]"}`} onClick={()=>setActiveLink("Account")}>Account</li>
          <li className={`flex-1 md:flex-none text-center md:text-left ${activeLink ==="Personalization"?"bg-[rgba(81,130,254,0.16)]":"hover:bg-[rgba(81,130,254,0.03)]"}`} onClick={()=>setActiveLink("Personalization")}> Personalization</li>
          <li className={`flex-1 md:flex-none text-center md:text-left ${ activeLink ==="Profile"?"bg-[rgba(81,130,254,0.16)]":"hover:bg-[rgba(81,130,254,0.03)]"}`} onClick={()=>setActiveLink("Profile")}>Profile</li>
        </ul>
      </div>
    </div>
  );
}

export default SettingsBar;
