import pb from "@/lib/pocketbase";
import React from "react";

type avatarProp = {
  avatarUser: any;
};
function OwnAvatar({ avatarUser }: avatarProp) {
  const avatarUrl = avatarUser.avatar ? pb.files.getURL(avatarUser, avatarUser.avatar) : null;
  const userNameLetter = avatarUser.username[0].toUpperCase();

  return (
    <div className="relative w-16 h-16 rounded-full overflow-hidden flex items-center justify-center bg-[rgba(81,130,254,0.16)]">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt="avatar"
          className="object-cover w-full h-full"
        />
      ) : (
        <span className="text-[#5182fe] text-[2rem]">{userNameLetter ? userNameLetter : ""}</span>
      )}
    </div>
  );
}

export default OwnAvatar;