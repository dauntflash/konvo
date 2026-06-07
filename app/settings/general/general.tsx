import React, { useState, useEffect } from "react";
import Select from "react-select";

const customSelectStyles = {
  control: (base: any) => ({
    ...base,
    backgroundColor: "rgba(17, 25, 40, 0.75)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    cursor: "pointer",
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isFocused ? "rgba(81, 130, 254, 0.5)" : "rgba(17, 25, 40, 0.95)",
    color: "white",
    cursor: "pointer",
  }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: "rgba(17, 25, 40, 0.95)",
    zIndex: 9999,
  }),
  singleValue: (base: any) => ({
    ...base,
    color: "white",
  }),
};

const languageOptions = [
  { value: "en", label: "English" },
  { value: "sw", label: "Swahili" },
];
const notificationOptions = [
  { value: "on", label: "On" },
  { value: "off", label: "Off" },
];

function General() {
  const [language, setLanguage] = useState(() => localStorage.getItem("app_language") || languageOptions[0].value);
  const [notification, setNotification] = useState(() => localStorage.getItem("notification_sound") || notificationOptions[0].value);
  const [sendSound, setSendSound] = useState(() => localStorage.getItem("send_sound") || notificationOptions[0].value);

  useEffect(() => {
    localStorage.setItem("app_language", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("notification_sound", notification);
  }, [notification]);

  useEffect(() => {
    localStorage.setItem("send_sound", sendSound);
  }, [sendSound]);

  return (
    <div className="size-full flex flex-col items-center justify-center">
      <div className="w-full sm:w-[90%] md:w-[80%] h-full p-3 sm:p-4 md:p-4 overflow-auto">
        <div className="my-4 sm:my-5 py-3 sm:py-4">
          <h1 className="text-xl sm:text-2xl md:text-[2rem] mb-3 sm:mb-5">Language</h1>
          <form className="flex flex-col">
            <span className="font-light text-xs sm:text-sm md:text-[1rem]">
              Change app language <span className="italic text-[.6rem]">*coming soon</span>
            </span>
            <div className="w-40 sm:w-[200px] my-3 sm:my-4">
              <Select
                value={languageOptions.find((o) => o.value === language)}
                onChange={(selected) => selected && setLanguage(selected.value)}
                options={languageOptions}
                styles={customSelectStyles}
                isSearchable={false}
                menuPlacement="auto"
              />
            </div>
          </form>
        </div>
        <div className="my-4 sm:my-5 py-3 sm:py-4">
          <h1 className="text-xl sm:text-2xl md:text-[2rem] mb-3 sm:mb-5">Sounds</h1>
          <form className="flex flex-col">
            <span className="font-light text-xs sm:text-sm md:text-[1rem]">Message notification</span>
            <div className="w-40 sm:w-[200px] my-3 sm:my-4">
              <Select
                value={notificationOptions.find((o) => o.value === notification)}
                onChange={(selected) => selected && setNotification(selected.value)}
                options={notificationOptions}
                styles={customSelectStyles}
                isSearchable={false}
                menuPlacement="auto"
              />
            </div>
            <span className="font-light text-xs sm:text-sm md:text-[1rem]">On-send sound</span>
            <div className="w-40 sm:w-[200px] my-3 sm:my-4">
              <Select
                value={notificationOptions.find((o) => o.value === sendSound)}
                onChange={(selected) => selected && setSendSound(selected.value)}
                options={notificationOptions}
                styles={customSelectStyles}
                isSearchable={false}
                menuPlacement="auto"
              />
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


export default General;