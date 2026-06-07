import React from "react";
import OwnAvatar from "../Avatars/ownAvatar";
import { useAuth } from "@/lib/useAuth";
import pb from "@/lib/pocketbase";

function Info() {
  const { user } = useAuth();



  return (
    <section className="flex justify-between mx-3 pt-4 items-center h-max scrollbar-overlay w-full overflow-x-hidden mb-5">
      <div className="flex items-center gap-4 w-full">
        <span className="hover:cursor-pointer">
          <OwnAvatar avatarUser={user} />
        </span>
        <div className="flex flex-col w-[60%]">
          <span className="font-bold text-[1rem] w-[90%] truncate">{user?.username}</span>
          <span className="font-light text-[.8rem] w-[90%] truncate">{user?.about}</span>
        </div>
      </div>
    </section>
  );
}

export default Info;
