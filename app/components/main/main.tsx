import React from "react";
import Chat from "./chat/chat";
import Details from "./details/details";

type props = { activeUser: any };

function Main({ activeUser }: props) {
  const [info, setInfo] = React.useState(false);
  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative dark:bg-[rgba(81,130,254,0.16)] dark:text-gray-700">
      {activeUser.username ? (
        <>
          <Chat setInfo={setInfo} activeUser={activeUser} />
          {/* On mobile: overlay. On desktop: side panel */}
          <div className={`
            absolute z-20 md:relative inset-auto
            transition-transform duration-300
            ${info ? "translate-x-0" : "translate-x-full"}
          `}>
            <Details activeUser={activeUser} info={info}  />
          </div>
        </>
      ) : (
        <div className="flex justify-center items-center size-full text-base sm:text-lg md:text-[1.5rem] text-white px-4 text-center">
          Search or select a user to start chatting
        </div>
      )}
    </div>
  );
}

export default Main;