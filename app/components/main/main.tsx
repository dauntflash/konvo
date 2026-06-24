import React from "react";
import Chat from "./chat/chat";
import Details from "./details/details";

type props = {
  activeUser: any;
};
function Main({ activeUser }: props) {
  const [info, setInfo] = React.useState(false);
  return (
    <div className="flex-1 flex  dark:bg-[rgba(81,130,254,0.16)] dark:text-gray-700">
      {activeUser.username ? (
        <>
          <Chat setInfo={setInfo} activeUser={activeUser} />
          <Details activeUser={activeUser} info={info} />
        </>
      ) : (
        <div className=" flex justify-center items-center size-full text-[1.5rem]">
          Search or select a User to start chatting
        </div>
      )}
    </div>
  );
}

export default Main;
