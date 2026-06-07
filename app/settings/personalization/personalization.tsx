import pb from "@/lib/pocketbase";
import { useAuth } from "@/lib/useAuth";
import React, { useEffect, useRef, useState } from "react";
import Select from "react-select";
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

const chatWallPapers = [
  { url: "/bgImages/background1.jpg", id: "background1" },
  { url: "/bgImages/background2.jpg", id: "background2" },
  { url: "/bgImages/background3.jpg", id: "background3" },
  { url: "/bgImages/background4.jpg", id: "background4" },
  { url: "/bgImages/background5.jpg", id: "background5" },
  { url: "/bgImages/background6.jpg", id: "background6" },
];

function Personalization() {
  const { user } = useAuth();
  const [wallpaperUrl, setWallpaperUrl] = useState("");
  const [selectedWallpaperId, setSelectedWallpaperId] = useState("");
  const [profilePic, setProfilePic] = useState(user?.showChatsProfilePic ? "show" : "hide");
  const [onlineContacts, setOnlineContacts] = useState(user?.showOnlineContacts ? "show" : "hide");
  const [customWallpaper, setCustomWallpaper] = useState<string | null>(null);
  const customWallpaperInputRef = useRef<HTMLInputElement>(null);
  const [showProfilePics, setShowProfilePics] = useState(
    user?.showChatsProfilePic ? "show" : "hide"
  );
  const [showOnlineContacts, setShowOnlineContacts] = useState(
    user?.showOnlineContacts ? "show" : "hide"
  );

  const [font, setFont] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fontPreference") || "medium";
    }
    return "medium";
  });

  const [fontOption, setFontOption] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fontPreference") || "medium";
    }
    return "medium";
  });

  const getOriginalFilename = (pbFilename: string) => {
    if (!pbFilename) return "";

    const parts = pbFilename.split("_");
    if (parts.length > 1) {
      const lastPart = parts[parts.length - 1];
      const extension = lastPart.split(".").pop();
      const originalName = parts.slice(0, -1).join("_");
      return `${originalName}.${extension}`;
    }
    return pbFilename;
  };

  useEffect(() => {
    if (user?.wallpaper) {
      const wallpaper = pb.files.getURL(user, user.wallpaper);
      setWallpaperUrl(wallpaper || "");
      const originalFilename = getOriginalFilename(user.wallpaper);
      setSelectedWallpaperId(originalFilename);
      const isPredefined = chatWallPapers.some((wp) => wp.id === originalFilename);
      if (!isPredefined && wallpaper) {
        setCustomWallpaper(wallpaper);
      } else {
        setCustomWallpaper(null);
      }
    } else {
      setWallpaperUrl("");
      setSelectedWallpaperId("");
      setCustomWallpaper(null);
    }
  }, [user]);

  const fontOptions = [
    { value: "small", label: "80%" },
    { value: "medium", label: "100% Recommended" },
    { value: "large", label: "125%" },
    { value: "extralarge", label: "150%" },
  ];

  const showProfilePic = [
    { value: "show", label: "Show" },
    { value: "hide", label: "Hide" },
  ];
  const showOnlineContact = [
    { value: "show", label: "Show" },
    { value: "hide", label: "Hide" },
  ];

  const handleWallpaperSelect = async (wallpaperUrl: string) => {
    if (!wallpaperUrl) {
      if (user) {
        await pb.collection("users").update(user.id, { wallpaper: "" });
        setSelectedWallpaperId("");
      }
      return;
    }
    try {
      const response = await fetch(wallpaperUrl);
      const blob = await response.blob();

      // Create a File object (PocketBase expects a File)
      const filename = wallpaperUrl.split("/").pop() || "wallpaper.jpg";
      const file = new File([blob], filename, {
        type: blob.type,
      });

      const formData = new FormData();
      formData.append("wallpaper", file);

      if (user) {
        const updatedUser = await pb.collection("users").update(user.id, formData);
        const originalFilename = getOriginalFilename(updatedUser.wallpaper);
        setSelectedWallpaperId(originalFilename);
        const newWallpaperUrl = pb.files.getURL(updatedUser, updatedUser.wallpaper);
        setWallpaperUrl(newWallpaperUrl);
      } else {
        console.error("User is not authenticated.");
        return;
      }
    } catch (error) {
      console.error("Failed to update wallpaper:", error);
    }
  };

  const handleCustomWallpaperUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert("Image is too large. Maximum size is 5MB");
      e.target.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file");
      e.target.value = "";
      return;
    }

    try {
      const formData = new FormData();
      formData.append("wallpaper", file);

      if (user) {
        const updatedUser = await pb.collection("users").update(user.id, formData);
        const originalFilename = getOriginalFilename(updatedUser.wallpaper);
        setSelectedWallpaperId(originalFilename);
        const newWallpaperUrl = pb.files.getURL(updatedUser, updatedUser.wallpaper);
        setWallpaperUrl(newWallpaperUrl);
        setCustomWallpaper(newWallpaperUrl);
      }
      e.target.value = "";
    } catch (error) {
      console.error("Failed to upload custom wallpaper:", error);
      alert("Failed to upload wallpaper. Please try again.");
    }
  };
  const handlePreferenceChange = async (
    field: "showOnlineContacts" | "showChatsProfilePic",
    value: "show" | "hide"
  ) => {
    if (user) {
      try {
        const updateObj: any = {};
        updateObj[field] = value === "show";
        const updatedUser = await pb.collection("users").update(user.id, updateObj);
        pb.authStore.save(pb.authStore.token, updatedUser); // This updates the user everywhere
      } catch (error) {
        console.error("Failed to update user preferences:", error);
      }
    } else {
      console.error("User is not authenticated.");
    }
  };

  const handleFontChange = (fontSize: string) => {
    switch (fontSize) {
      case "small":
        document.documentElement.style.fontSize = "12px";
        break;
      case "medium":
        document.documentElement.style.fontSize = "16px";
        break;
      case "large":
        document.documentElement.style.fontSize = "20px";
        break;
      case "extralarge":
        document.documentElement.style.fontSize = "24px";
        break;
      default:
        break;
    }
    localStorage.setItem("fontPreference", fontSize);
  };
  useEffect(() => {
    const savedFont = localStorage.getItem("fontPreference");
    if (savedFont) {
      setFont(savedFont);
      setFontOption(savedFont);
      handleFontChange(savedFont);
    }
  }, []);
  return (
    <section className="size-full flex flex-col items-center justify-center">
      <div className="w-[80%] p-4 overflow-auto">
        <div className="my-5 py-4">
          <h1 className="text-[2rem] mb-5">Scale</h1>
          <span className="font-light text-[1rem]">Change the font-size across the app</span>
          <div className="flex items-center gap-4 mt-4">
            <div className="relative w-[200px]">
              <Select
                defaultValue={fontOptions.find((o) => o.value === font)}
                options={fontOptions}
                onChange={(selected) => {
                  if (selected) {
                    selected ? setFont(selected.value) : null;
                    setFontOption(selected.value);
                    handleFontChange(selected.value);
                  }
                }}
                isSearchable={false}
                styles={customSelectStyles}
                menuPlacement="auto"
              />
            </div>
          </div>
        </div>
        <div className="my-5 py-4">
          <h1 className="text-[2rem] mb-5">Chat Preferences</h1>
          <span className="font-light text-[1rem]">Show Online contacts</span>
          <div className="relative w-[200px] mt-4 mb-6">
            <Select
              defaultValue={showOnlineContact.find((o) => o.value === showOnlineContacts)}
              options={showOnlineContact}
              onChange={(selected) => {
                if (selected) {
                  setShowOnlineContacts(selected.value);
                  setOnlineContacts(selected.value);
                  handlePreferenceChange("showOnlineContacts", selected.value as "show" | "hide");
                }
              }}
              isSearchable={false}
              styles={customSelectStyles}
              menuPlacement="auto"
            />
          </div>
          <span className="font-light text-[1rem]">Show contact profile pic in chat</span>
          <div className="relative w-[200px] mt-4 mb-6">
            <Select
              defaultValue={showProfilePic.find((o) => o.value === showProfilePics)}
              options={showProfilePic}
              onChange={(selected) => {
                if (selected) {
                  setShowProfilePics(selected.value);
                  setProfilePic(selected.value);
                  handlePreferenceChange("showChatsProfilePic", selected.value as "show" | "hide");
                }
              }}
              isSearchable={false}
              styles={customSelectStyles}
              menuPlacement="auto"
            />
          </div>
          <span className="font-light text-[1rem]">Chat Wallpaper</span>
          <div className="grid grid-cols-4 gap-4 w-[80%] py-3">
            <div
              className={`${selectedWallpaperId === "" && "border-[rgba(81,130,254,0.5)] border-[5px]"
                } h-[150px] w-[150px] rounded-md cursor-pointer hover:scale-110 transition-all duration-300 bg-slate-300 text-center flex items-center justify-center text-[rgba(17,25,40)]`}
              onClick={() => {
                setWallpaperUrl("");
                handleWallpaperSelect("");
                setCustomWallpaper(null);
              }}>
              none
            </div>
            {chatWallPapers.map((wallpaper) => (
              <img
                key={wallpaper.id}
                src={wallpaper.url}
                alt=""
                onClick={() => {
                  handleWallpaperSelect(wallpaper.url);
                }}
                className={`${wallpaper.id === selectedWallpaperId &&
                  "border-[rgba(81,130,254,0.5)] border-[5px]"
                  } h-[150px] w-[150px] rounded-md cursor-pointer hover:scale-110 transition-all duration-300 object-cover`}
              />
            ))}
            {customWallpaper ? (
              <div
                className="relative h-[150px] w-[150px] group"
                onClick={() => customWallpaperInputRef.current?.click()}>
                <img
                  src={customWallpaper}
                  alt="Custom wallpaper"
                  className={`${customWallpaper === wallpaperUrl && "border-[rgba(81,130,254,0.5)] border-[5px]"
                    } h-full w-full rounded-md cursor-pointer transition-all duration-300 object-cover`}
                />
                <div className="absolute top-1 right-1 bg-[rgba(17,25,40,0.8)] text-white text-xs px-2 py-1 rounded pointer-events-none">
                  Custom
                </div>
                <div className="absolute inset-0 bg-[rgba(17,25,40,0.85)] rounded-md cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-[rgba(81,130,254,0.5)] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="bi bi-cloud-upload text-3xl mb-2"></div>
                  <span className="text-sm">Replace</span>
                </div>
              </div>
            ) : (
              <div
                className="h-[150px] w-[150px] rounded-md cursor-pointer hover:scale-110 transition-all duration-300 bg-[rgba(81,130,254,0.3)] text-center flex flex-col items-center justify-center border-2 border-dashed border-[rgba(81,130,254,0.5)]"
                onClick={() => customWallpaperInputRef.current?.click()}>
                <div className="bi bi-cloud-upload text-3xl mb-2"></div>
                <span className="text-sm">Upload</span>
              </div>
            )}
            <input
              ref={customWallpaperInputRef}
              type="file"
              accept="image/*"
              onChange={handleCustomWallpaperUpload}
              className="hidden"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default Personalization;
