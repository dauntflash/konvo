import ChatAvatar from "@/app/components/Avatars/chatAvatar";
import pb from "@/lib/pocketbase";
import { useAuth } from "@/lib/useAuth";
import React, { useEffect, useState } from "react";
import Select from "react-select";
import { toast, ToastContainer } from "react-toastify";
// @ts-ignore: side-effect import of CSS without type declarations
import "react-toastify/dist/ReactToastify.css";

const customSelectStyles = {
  control: (base: any) => ({
    ...base,
    backgroundColor: "rgba(17, 25, 40, 0.75)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    cursor: "pointer",
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "rgba(81, 130, 254, 0.5)"
      : state.isFocused
      ? "rgba(81, 130, 254, 0.1)"
      : "rgba(17, 25, 40, 0.95)",

    color: "white",
    cursor: "pointer",
  }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: "rgba(17, 25, 40, 0.95)",
    zIndex: 9999,
  }),
  singleValue: (base: any) => ({
    ...base,
    color: "white",
  }),
};

const privacyOptions = [
  { value: "contacts", label: "My contacts" },
  { value: "everyone", label: "Everyone" },
];

type BlockRecord = {
  id: string;
  blocker: string;
  blocked: string;
  expand?: {
    blocked?: {
      id: string;
      username: string;
      avatar?: string;
    };
  };
};

function Account() {
  const [isDelete, setIsDelete] = useState(false);
  const [privacy, setPrivacy] = useState(privacyOptions[0].value);
  const { isAuthenticated, setIsAuthenticated } = useAuth();
  const { user } = useAuth();
  const [blockedContacts, setBlockedContacts] = useState<BlockRecord[]>([]);
  const [blockedUser, setBlockedUser] = useState<BlockRecord | null>(null);
  const [showConfirmPassword, setshowConfirmPassword] = useState(false);
  const [showPassword, setshowPassword] = useState(false);
  const [showcurrentPassword, setshowcurrentPassword] = useState(false);
  const [CurrentPassword, setCurrentPassword] = useState("");
  const [NewPassword, setNewPassword] = useState("");
  const [ConfirmPassword, setConfirmPassword] = useState("");
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const showToast = (message: string, type: "success" | "error" | "loading") => {
    toast.dismiss();
    const toastOptions = {
      position: "top-center" as const,
      autoClose: 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      style: {
        color: "white",
        fontSize: "14px",
        fontWeight: "500",
      },
    };

    switch (type) {
      case "success":
        return toast.success(message, toastOptions);
      case "error":
        return toast.error(message, toastOptions);
      case "loading":
        return toast.loading(message, toastOptions);
    }
  };

  const fetchBlockedContacts = async () => {
    const records = await pb.collection("blocks").getFullList({
      filter: `blocker="${user?.id}"`,
      expand: "blocked",
    });
    setBlockedContacts(records as unknown as BlockRecord[]);
  };

  useEffect(() => {
    if (user) {
      fetchBlockedContacts();
    }
  }, [user]);

  const handleUnblockUser = async () => {
    if (!blockedUser) return;

    try {
      await pb.collection("blocks").delete(blockedUser.id);
      setBlockedContacts((prev) => prev.filter((b) => b.id !== blockedUser.id));
      setBlockedUser(null);
    } catch (error) {
      console.error("Error unblocking user:", error);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    const authEmail = pb.authStore.record?.email;
    if (!authEmail) {
      showToast("Cannot find email. Please log out and log back in.", "error");
      return;
    }

    if (!CurrentPassword || !NewPassword || !ConfirmPassword) {
      showToast("Please fill in all password fields.", "error");
      return;
    }
    if (NewPassword !== ConfirmPassword) {
      showToast("New passwords do not match.", "error");
      return;
    }
    if (NewPassword === CurrentPassword) {
      showToast("New password must be different from the current password.", "error");
      return;
    }
    if (NewPassword.length < 8) {
      showToast("Password must be at least 8 characters long.", "error");
      return;
    }
    if (
      NewPassword.toLowerCase() === user.username?.toLowerCase() ||
      NewPassword.toLowerCase() === authEmail.toLowerCase()
    ) {
      showToast("Password cannot be the same as username or email.", "error");
      return;
    }

    try {
      await pb.collection("users").authWithPassword(authEmail, CurrentPassword.trim());

      await pb.collection("users").update(user.id, {
        password: NewPassword,
        passwordConfirm: ConfirmPassword,
        oldPassword: CurrentPassword,
      });

      showToast("Password changed successfully.", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      const errorData = error.response?.data || error.data;

      if (errorData) {
        const firstErrorKey = Object.keys(errorData)[0];
        if (firstErrorKey && errorData[firstErrorKey]?.message) {
          showToast(errorData[firstErrorKey].message, "error");
          return;
        }
      }

      if (error.status === 400 && error.message?.includes("authenticate")) {
        showToast("Current password is incorrect.", "error");
        return;
      }

      showToast(error.message || "Failed to change password. Please try again.", "error");
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    try {
      await pb.collection("users").delete(user.id);

      pb.authStore.clear();

      showToast("Account deleted successfully.", "success");

      setIsAuthenticated(false);
    } catch (error: any) {
      const errorData = error.response?.data || error.data;

      if (errorData) {
        const firstErrorKey = Object.keys(errorData)[0];
        if (firstErrorKey && errorData[firstErrorKey]?.message) {
          showToast(errorData[firstErrorKey].message, "error");
          return;
        }
      }

      showToast(error.message || "Failed to delete account. Please try again.", "error");
    }
  };
  return (
    <div className="size-full flex flex-col items-center justify-center">
      <ToastContainer />
      <div className="w-[80%] p-4 overflow-auto ">
        <div className="my-3 py-4">
          <h1 className="text-[2rem] mb-5">Blocked contacts</h1>
          {blockedContacts.length === 0 ? (
            <span className="font-light text-[1rem]">You have no blocked contacts.</span>
          ) : (
            blockedContacts.map((block) => (
              <div
                key={block.id}
                className="flex items-center justify-between w-[50%] bg-[rgba(81,130,254,0.09)] py-2 px-3 rounded-md mb-3">
                <div className="flex items-center gap-4">
                  <ChatAvatar avatarUser={block.expand?.blocked} />
                  <span>{block.expand?.blocked?.username || "Blocked User"}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setBlockedUser(block)}
                  className="bg-[#5182fe] p-2 rounded-md">
                  Unblock
                </button>
              </div>
            ))
          )}
        </div>
        <div className="my-3 py-4 ">
          <h1 className="text-[2rem] mb-5">Change Password</h1>
          <form onSubmit={handleChangePassword} className="flex flex-col w-full my-3">
            <label htmlFor="" className="font-light text-[1rem]">
              Current Password
            </label>
            <div className="flex relative items-center">
              <input
                type={showcurrentPassword ? "text" : "password"}
                value={CurrentPassword}
                className="rounded-md bg-transparent border-[rgba(255,255,255,0.3)] border-[1px] outline-none my-4 text-[1rem] p-2 flex-1 pr-[4rem]"
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <div
                className="text-[20px] cursor-pointer px-3 absolute right-3"
                onClick={() => setshowcurrentPassword((prev) => !prev)}>
                {showcurrentPassword ? (
                  <span className="bi bi-eye-slash"></span>
                ) : (
                  <span className="bi bi-eye"></span>
                )}
              </div>
            </div>

            <label htmlFor="" className="font-light text-[1rem]">
              New Password
            </label>
            <div className="flex items-center relative">
              <input
                type={showPassword ? "text" : "password"}
                value={NewPassword}
                className="rounded-md bg-transparent border-[rgba(255,255,255,0.3)] border-[1px] outline-none my-4 text-[1rem] p-2 flex-1 pr-[4rem]"
                onChange={(e) => {
                  const value = e.target.value;
                  setNewPassword(value);

                  if (ConfirmPassword === value) {
                    setPasswordsMatch(true);
                  } else {
                    setPasswordsMatch(false);
                  }
                }}
              />
              <div
                className="text-[20px] cursor-pointer px-3 absolute right-3"
                onClick={() => setshowPassword((prev) => !prev)}>
                {showPassword ? (
                  <span className="bi bi-eye-slash"></span>
                ) : (
                  <span className="bi bi-eye"></span>
                )}
              </div>
            </div>
            <label htmlFor="" className="font-light text-[1rem]">
              Confirm New Password{" "}
              {!passwordsMatch && ConfirmPassword && (
                <span className="text-red-500"> - Passwords do not match</span>
              )}
            </label>
            <div className="flex items-center relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={ConfirmPassword}
                className="rounded-md bg-transparent border-[rgba(255,255,255,0.3)] border-[1px] outline-none my-4 text-[1rem] p-2 flex-1"
                onChange={(e) => {
                  const value = e.target.value;
                  setConfirmPassword(value);
                  if (NewPassword === value) {
                    setPasswordsMatch(true);
                  } else {
                    setPasswordsMatch(false);
                  }
                }}
              />
              <div
                className="text-[20px] cursor-pointer px-3 absolute right-2"
                onClick={() => setshowConfirmPassword((prev) => !prev)}>
                {showConfirmPassword ? (
                  <span className="bi bi-eye-slash"></span>
                ) : (
                  <span className="bi bi-eye"></span>
                )}
              </div>
            </div>

            <button
              type="submit"
              className={`${
                passwordsMatch && ConfirmPassword ? "" : "cursor-not-allowed"
              } p-2 bg-[#5182fe] mt-4 rounded-md`}>
              Change Password
            </button>
          </form>
        </div>
        <div className="my-3 py-4">
          <h1 className="text-[2rem] mb-5">Delete account</h1>
          <div className="flex flex-col">
            {isDelete && (
              <div className="flex flex-col my-4">
                <span className="font-light text-[1rem]">
                  Type 'Delete my Account' to delete your account
                </span>
                <input
                  type="text"
                  placeholder="Delete my Account"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="rounded-md bg-transparent border-[rgba(255,255,255,0.3)] border-[1px] outline-none my-4 text-[1rem] p-2"
                />
              </div>
            )}
            <span className="font-light text-[1rem]">
              This action is irreversible proceed with caution
            </span>
            {isDelete && deleteConfirmText === "Delete my Account" ? (
              <button
                type="button"
                className="bg-[rgba(230,74,105,0.753)] p-2 text-[.9rem]  my-2 rounded-md"
                onClick={handleDeleteAccount}>
                Delete my account
              </button>
            ) : (
              <button
                type="button"
                className={`${isDelete ? "cursor-not-allowed ": ""} bg-[rgba(230,74,105,0.553)] p-2 text-[.9rem] my-2 rounded-md `}
                onClick={() => setIsDelete(true)}>
                Delete my account
              </button>
            )}
          </div>
        </div>
      </div>
      {blockedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80 text-black">
            <h2 className="text-lg font-semibold mb-4">Unblock User?</h2>
            <p className="mb-4">
              Are you sure you want to unblock{" "}
              {blockedUser.expand?.blocked?.username || "this user"}?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md"
                onClick={() => setBlockedUser(null)}>
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-[#5182fe] text-white rounded-md"
                onClick={handleUnblockUser}>
                Unblock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Account;
