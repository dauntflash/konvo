import pb from "@/lib/pocketbase";
import Image from "next/image";
import React, { useMemo } from "react";

type avatarProp = {
  avatarUser: any;
};
function OnlineAvatar({ avatarUser }: avatarProp) {
  const newAvatar = useMemo(() => {
    return avatarUser?.avatar ? pb.files.getURL(avatarUser, avatarUser.avatar) : null;
  }, [avatarUser?.id, avatarUser?.avatar]);
  const userNameLetter = avatarUser?.username[0].toUpperCase();

  return (
    <div className="">
      {newAvatar ? (
        <div className="w-20 h-20 rounded-full bg-[rgba(17,25,40,0.55)] flex items-center justify-center">
          <img
            src={newAvatar || ""}
            alt="avatar"
            className=""
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
         
        </div>
      ) : (
        <div className=" w-[4rem] h-[4rem]   bg-[rgba(81,130,254,0.16)] text-[#5182fe] text-[2rem] flex items-center text-center justify-center size-full rounded-[50%] object-cover">
          {userNameLetter}
        </div>
      )}
    </div>
  );
}

export default React.memo(OnlineAvatar);
