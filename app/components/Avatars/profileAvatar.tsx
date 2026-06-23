import pb from "@/lib/pocketbase";
import Image from "next/image";
import React, { useMemo } from "react";

type avatarProp = {
  avatarUser: any;
};
function ProfileAvatar({ avatarUser }: avatarProp) {
  const newAvatar = useMemo(() => {
    return avatarUser?.avatar ? pb.files.getURL(avatarUser, avatarUser.avatar) : null;
  }, [avatarUser?.id, avatarUser?.avatar]);
  const userNameLetter = avatarUser?.username[0].toUpperCase() || "";

  return (
    <div className="">
      {newAvatar ? (
        <div className="w-[8rem] h-[8rem] rounded-full bg-[rgba(17,25,40,0.55)] flex items-center justify-center">
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
        <div className="w-[8rem] h-[8rem] rounded-full bg-[#5182fe] flex items-center justify-center text-[6rem] text-center  size-full object-cover">
          {userNameLetter}
        </div>
      )}
    </div>
  );
}

export default React.memo(ProfileAvatar);
