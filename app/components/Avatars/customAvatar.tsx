import pb from "@/lib/pocketbase";
import Image from "next/image";
import React from "react";
import { styleText } from "util";

type avatarProp = {
  avatarUser: any;
  size: string;
};
function OwnAvatar({ avatarUser, size }: avatarProp) {
  const avatarUrl =pb.files.getURL(avatarUser, avatarUser.avatar)
  const userNameLetter= avatarUser.username[0].toUpperCase()
    const sizeStyle = size ? { width: size, height: size } : { width: "3rem", height: "3rem" };

  return (
    <div className="">
      {avatarUrl ? (
        <div className={`w-[${size}] h-[${size}] rounded-full  flex items-center justify-center`}>
            
          <Image
            src={avatarUrl}
            alt="avatar"
            width={100}
            height={100}
            className=""
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              objectFit: "cover",
            }}></Image>
        </div>
      ) : (
        <div className={`w-[${size}] h-[${size}] bg-[rgba(81,130,254,0.16)] text-[#5182fe] text-[2rem] flex items-center text-center justify-center rounded-[50%] object-cover`}
        >{userNameLetter}</div>
      )}
    </div>
  );
}

export default OwnAvatar;
