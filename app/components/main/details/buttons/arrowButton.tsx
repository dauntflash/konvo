import Image from "next/image";
import React from "react";

type UrlProp = {
  imageUrl: string;
};
function Button({imageUrl}: UrlProp) {
  return (
    <div className="bg-[rgba(17,25,40,0.36)] rounded-[50%] p-2 flex items-center">
      <Image
        src={imageUrl}
        height={100}
        width={100}
        alt="arrow"
        className="object-cover h-3 w-3"></Image>
    </div>
  );
}

export default Button;
