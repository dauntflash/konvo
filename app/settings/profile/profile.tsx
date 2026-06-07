import ProfileAvatar from "@/app/components/Avatars/profileAvatar";
import { useAuth } from "@/lib/useAuth";
import React, { useEffect, useRef, useState } from "react";
import pb from "@/lib/pocketbase";
import { toast, ToastContainer } from "react-toastify";
import { useRouter } from "next/navigation";
import Image from "next/image";

function Profile() {
  const { user } = useAuth();
  const username = user?.username;

  const [newUsername, setNewUsername] = useState(user?.username);
  const [about, setAbout] = useState(user?.about);
  const [newAbout, setNewAbout] = useState(user?.about);
  const [editingName, setEditingName] = useState(false);
  const [editingAbout, setEditingAbout] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profilePicUrl, setProfilePicUrl] = useState("");
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const { setIsAuthenticated } = useAuth();
  const router = useRouter();
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  const handleSignOut = async () => {
    try {
      const toastId = toast.loading("Signing out...", {
        position: "top-center",
      });

      pb.authStore.clear();

      setIsAuthenticated(false);
      router.push("/");

      toast.update(toastId, {
        render: "Signed out successfully",
        type: "success",
        isLoading: false,
        autoClose: 2000,
      });
    } catch (error) {
      toast.error("Failed to sign out. Please try again.", {
        position: "top-center",
        autoClose: 3000,
      });
      console.error("Sign out error:", error);
    }
  };

  const errorToast = (message: string) => {
    toast.error(message, {
      position: "top-center",
      autoClose: 3000,
    });
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
    setShowPhotoOptions(false);
  };

  const handleDeletePhoto = async () => {
    if (!user) return;

    try {
      const formData = new FormData();
      formData.append("avatar", "");

      const updatedUser = await pb.collection("users").update(user.id, formData);
      pb.authStore.save(pb.authStore.token, updatedUser);
      setProfilePic(null);
      setProfilePicUrl("");
      toast.success("Profile photo deleted", { position: "top-center", autoClose: 2000 });
      setShowDeleteConfirm(false);
      setShowPhotoOptions(false);
    } catch (error: any) {
      errorToast(error.message || "Failed to delete photo");
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

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (newUsername === username && newAbout === about && !profilePic) {
      errorToast("No change on your details, edit and try again");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      errorToast("Username can only contain letters, numbers, and underscores");
      return;
    }
    if (newUsername.length < 3 || newUsername.length > 20) {
      errorToast("Username must be between 3 and 20 characters long");
      return;
    }
    const usernameExists = await pb.collection("users").getList(1, 1, {
      filter: `username = "${newUsername}"`,
    });

    if (usernameExists.totalItems > 0 && usernameExists.items[0].id !== user.id) {
      errorToast("Username already taken");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("username", newUsername);
      formData.append("about", newAbout);

      if (profilePic) {
        formData.append("avatar", profilePic);
      }

      const updatedUser = await pb.collection("users").update(user.id, formData);
      pb.authStore.save(pb.authStore.token, updatedUser);
      toast.success("Details changed successfully", { position: "top-center", autoClose: 3000 });
      setEditingAbout(false);
      setEditingName(false);
      setProfilePic(null);
      setProfilePicUrl("");
    } catch (error: any) {
      errorToast(error.message || "Failed to update profile");
    }
  };

  useEffect(() => {
    if (user) {
      setNewUsername(user.username);
      setAbout(user.about);
      setNewAbout(user.about);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = () => {
      setShowPhotoOptions(false);
      setShowDeleteConfirm(false);
    };

    if (showPhotoOptions || showDeleteConfirm) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showPhotoOptions, showDeleteConfirm]);

  const hasAvatar = user?.avatar || profilePicUrl;

  return (
    <div className="size-full flex flex-col items-center justify-center">
      <ToastContainer
        position="top-center"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      <div className="w-full sm:w-[90%] md:w-[80%] p-3 sm:p-4 md:p-4 overflow-auto">
        <div className="">
          <form onSubmit={handleProfileUpdate} className="flex flex-col my-2 sm:my-3 py-3 sm:py-4">
            <h1 className="text-xl sm:text-2xl md:text-[2rem] my-3 sm:my-5 self-start">Edit Details</h1>
            <label htmlFor="name" className="font-light text-xs sm:text-sm md:text-[1rem]">
              Email{" "}
              <span className="italic text-[.6rem] text-[rgba(230,74,105,0.553)]">
                (To change email, contact admin)
              </span>
            </label>
            <p className="mb-6 sm:mb-8 flex-1 py-2 text-xs sm:text-sm">{user?.email}</p>
            <label htmlFor="about" className="font-light text-xs sm:text-sm md:text-[1rem]">
              Profile Photo
            </label>
            <div
              className="mb-6 sm:mb-8 py-2 h-full cursor-pointer relative w-16 sm:w-20 md:w-[8rem]"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              onClick={(e) => {
                e.stopPropagation();
              }}>
              {profilePicUrl ? (
                <div
                  className="w-16 h-16 sm:w-20 sm:h-20 md:w-[8rem] md:h-[8rem] rounded-full bg-[rgba(17,25,40,0.55)] flex items-center justify-center relative"
                  onClick={() => setShowPhotoOptions(true)}>
                  <Image
                    src={profilePicUrl}
                    alt="avatar"
                    width={100}
                    height={100}
                    className="rounded-full object-cover"
                    style={{
                      width: "100%",
                      height: "100%",
                    }}
                  />
                  {isHovering && (
                    <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs sm:text-sm font-light text-center px-1">
                        Change profile photo
                      </span>
                    </div>
                  )}
                </div>
              ) : user?.avatar ? (
                <div className="relative" onClick={() => setShowPhotoOptions(true)}>
                  <ProfileAvatar avatarUser={user} />
                  {isHovering && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs sm:text-sm font-light text-center px-2">
                        Change profile photo
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative" onClick={handleUploadClick}>
                  <ProfileAvatar avatarUser={user} />
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs sm:text-sm font-light text-center px-2">
                      Add profile photo
                    </span>
                  </div>
                </div>
              )}

              {showPhotoOptions && (
                <div
                  className="absolute top-[50%] left-full w-[8rem] mt-2 bg-white rounded-lg shadow-lg p-2 z-50"
                  onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="block w-full text-left p-1 text-black hover:bg-gray-100 rounded"
                    onClick={handleUploadClick}>
                    Upload photo
                  </button>
                  {hasAvatar && (
                    <button
                      type="button"
                      className="block w-full text-left p-1 text-red-600 hover:bg-gray-100 rounded"
                      onClick={() => setShowDeleteConfirm(true)}>
                      Delete photo
                    </button>
                  )}
                </div>
              )}
            </div>

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handleProfilePic}
            />

            <label htmlFor="name" className="font-light text-[1rem]">
              User Name
            </label>

            {editingName ? (
              <div className="flex text-[1.1rem] items-center gap-3">
                <input
                  type="text"
                  value={newUsername}
                  className="rounded-md bg-transparent border-[rgba(255,255,255,0.3)] border-[1px] outline-none mb-8 flex-1 p-2"
                  onChange={(e) => setNewUsername(e.target.value)}
                />
                <span
                  className="bi bi-check2-square cursor-pointer hover:text-[#5182fe]"
                  onClick={() => setEditingName(false)}></span>
              </div>
            ) : (
              <div className="text-[1.1rem] flex items-center">
                <p className="mb-8 flex-1 py-2">{newUsername}</p>
                <span
                  className="bi bi-pencil-square cursor-pointer hover:text-[#5182fe]"
                  onClick={() => setEditingName(true)}></span>
              </div>
            )}

            <label htmlFor="about" className="font-light text-[1rem]">
              About
            </label>
            {editingAbout ? (
              <div className="text-[1.1rem] flex items-center gap-3">
                <input
                  type="text"
                  value={newAbout}
                  className="rounded-md bg-transparent border-[rgba(255,255,255,0.3)] border-[1px] outline-none mb-8 p-2 flex-1"
                  onChange={(e) => setNewAbout(e.target.value)}
                />
                <span
                  className="bi bi-check2-square cursor-pointer hover:text-[#5182fe]"
                  onClick={() => setEditingAbout(false)}></span>
              </div>
            ) : (
              <div className="text-[1.1rem] flex items-center">
                <p
                  className={`${
                    newAbout ? "" : "italic text-[1rem] font-extralight"
                  } mb-8 flex-1 py-2`}>
                  {newAbout ? newAbout : "Add a bio"}
                </p>
                <span
                  className="bi bi-pencil-square cursor-pointer hover:text-[#5182fe]"
                  onClick={() => setEditingAbout(true)}></span>
              </div>
            )}

            <button
              className={`${
                newAbout === about && newUsername === username && !profilePic
                  ? "cursor-not-allowed "
                  : ""
              } p-2 bg-[#5182fe] mt-4 rounded-md`}>
              Update Profile
            </button>
          </form>
          <div className="my-5 py-4">
            <h1 className="text-[2rem] my-5 self-start">Sign Out</h1>
            <button
              className="bg-[rgba(230,74,105,0.553)] p-2 text-[.9rem] hover:bg-[rgba(230,74,105,0.753)] my-2 rounded-md w-full"
              onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="absolute top-0 left-0 inset-0 bg-black bg-opacity-50 flex items-center text-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80 text-black">
            <h2 className="text-lg font-semibold mb-4">Delete Profile Photo?</h2>
            <p className="mb-4">Are you sure you want to delete your profile photo?</p>
            <div className="flex flex-col gap-2 justify-center">
              <button
                className="px-4 py-2 bg-red-500 text-white rounded-md"
                onClick={handleDeletePhoto}>
                Confirm Delete
              </button>
              <button
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md"
                onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
