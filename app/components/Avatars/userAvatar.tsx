import pb from "@/lib/pocketbase";
import Image from "next/image";
import React, { useMemo } from "react";

type avatarProp = {
  avatarUser: any;
};

function UserAvatar({ avatarUser }: avatarProp) {
  const newAvatar = useMemo(() => {
    return avatarUser?.avatar ? pb.files.getURL(avatarUser, avatarUser.avatar) : null;
  }, [avatarUser?.id, avatarUser?.avatar]);

  const userNameLetter = avatarUser?.username?.[0]?.toUpperCase() || "?";

  return (
    <div className="">
      {newAvatar ? (
        <div className="w-12 h-12 rounded-full bg-[rgba(17,25,40,0.55)] flex items-center justify-center">
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
            }}
          />
        </div>
      ) : (
        <div className="w-12 h-12 rounded-full text-[rgba(17,25,40,0.55)] bg-[rgba(81,130,254,0.26)] flex items-center justify-center text-[2rem] text-white text-center size-full object-cover">
          {userNameLetter}
        </div>
      )}
    </div>
  );
}

export default React.memo(UserAvatar);