import pb from "@/lib/pocketbase";
import Image from "next/image";
import React, { useMemo } from "react";

type avatarProp = {
  avatarUser: any;
};
function ChatAvatar({ avatarUser }: avatarProp) {
  const newAvatar = useMemo(() => {
    return avatarUser?.avatar ? pb.files.getURL(avatarUser, avatarUser.avatar) : null;
  }, [avatarUser?.id, avatarUser?.avatar]);
  const userNameLetter = avatarUser?.username[0].toUpperCase();

  return (
    <div className="">
      {newAvatar ? (
        <div className="w-[2rem] h-[2rem] rounded-full  flex items-center justify-center">
          <Image
            src={newAvatar}
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
        <div className=" w-[2rem] h-[2rem]   bg-[#5a5478] text-[#fff] text-[1rem] flex items-center text-center justify-center size-full rounded-[50%] object-cover">
          {userNameLetter}
        </div>
      )}
    </div>
  );
}

export default React.memo(ChatAvatar);
