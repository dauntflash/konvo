import React, { useRef, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/useAuth";
import pb from "@/lib/pocketbase";

function WelcomePage() {
  const [profilePicUrl, setProfilePicUrl] = useState("");
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [about, setAbout] = useState("Hello there! Lets connect");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const handleIconClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  const handleProfilePic = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      setProfilePic(file);
      setProfilePicUrl(fileUrl);
      e.target.value = "";
    }
  };

  const handleSkip = async () => {
    if (!user) return;

    try {
      const updatedUser = await pb.collection("users").update(user.id, {
        hasSeenWelcome: true,
        about: "Hello there! Lets connect",
      });
      pb.authStore.save(pb.authStore.token, updatedUser);
      window.location.reload();
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (!user) return;
    try {
      e.preventDefault();
      const updatedUser = await pb.collection("users").update(user.id, {
        avatar: profilePic,
        about: about,
        hasSeenWelcome: true,
      });
      pb.authStore.save(pb.authStore.token, updatedUser);
      window.location.reload();
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };
  return (
    <div className="w-full h-full flex flex-col justify-center items-center px-4 sm:px-0">
      <div className="flex flex-col sm:flex-row w-full sm:w-[90%] md:w-[50%] gap-4">
        <h1 className="font-semibold text-xl sm:text-2xl md:text-[2rem] flex-1">Welcome, {user?.username}</h1>
        <h1 className="toggleBtn cursor-pointer"
          onClick={handleSkip}>
          Skip
        </h1>
      </div>
      <form action="" onSubmit={handleSubmit} className="flex flex-col w-full sm:w-[90%] md:w-[50%] mt-3 sm:mt-5">
        <label htmlFor="profile pic" className="font-light text-sm sm:text-[15px]">
          Profile Picture
        </label>
        {profilePicUrl ? (
          <div className="relative w-max mt-2">
            <Image src={profilePicUrl} height={100} width={100} alt="profile pic" />
            <div
              className="bi bi-x text-base sm:text-[1rem] absolute top-0 right-0 cursor-pointer bg-[rgba(17,25,40,0.55)]"
              onClick={() => {
                setProfilePicUrl("");
              }}
            ></div>
          </div>
        ) : (
          ""
        )}

        <div
          className="rounded-md bg-transparent border-[rgba(255,255,255,0.3)] border-[1px] my-3 sm:my-4 text-xs sm:text-[1rem] p-2 w-max"
          onClick={handleIconClick}>
          <h1 className="">Click to update</h1>
        </div>

        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          className="hidden"
          onChange={handleProfilePic}
        />
        <label htmlFor="about" className="font-light text-sm sm:text-[15px]">
          About
        </label>
        <input
          type="text"
          id=""
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          className="rounded-md bg-transparent border-[rgba(255,255,255,0.3)] border-[1px] outline-none my-3 sm:my-4 text-xs sm:text-[1rem] p-2"
        />

        <button
          type="submit"
          className={` ${
            about === "Hello there! Lets connect" && !profilePicUrl
              ? "bg-[rgba(81,130,254,0.26)] cursor-not-allowed"
              : "bg-[#5182fe] cursor-pointer"
          } p-2 mt-3 sm:mt-4 rounded-md text-sm sm:text-base`}>
          Update Profile
        </button>
      </form>
    </div>
  );
}

export default WelcomePage;
