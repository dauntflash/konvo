import pb from "@/lib/pocketbase";
import Image from "next/image";
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
        <Image
          src={avatarUrl}
          alt="avatar"
          fill
          className="object-cover"
        />
      ) : (
        <span className="text-[#5182fe] text-[2rem]">{userNameLetter ? userNameLetter : ""}</span>
      )}
    </div>
  );
}

export default OwnAvatar;
