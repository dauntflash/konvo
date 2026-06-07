"use client";

import pb from "@/lib/pocketbase";
import { useAuth } from "@/lib/useAuth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import ChatAvatar from "@/app/components/Avatars/chatAvatar";
import { toast, ToastContainer } from "react-toastify";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  if (days < 3) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(dateStr).toLocaleDateString();
}

type Tab = "posts" | "saved" | "hidden" | "notifications";

export default function AccountPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("posts");
  const [posts, setPosts] = useState<any[]>([]);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [hiddenPosts, setHiddenPosts] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ posts: 0, totalLikes: 0, totalComments: 0 });
  const [editing, setEditing] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editAbout, setEditAbout] = useState("");
  const [editAvatar, setEditAvatar] = useState<File | null>(null);
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const avatarRef = useRef<HTMLInputElement>(null);

  const showToast = (message: string, type: "success" | "error" | "loading") => {
    toast.dismiss();
    const opts = {
      position: "top-center" as const,
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      style: { color: "white", fontSize: "14px", fontWeight: "500" },
    };
    switch (type) {
      case "success": return toast.success(message, opts);
      case "error": return toast.error(message, opts);
      case "loading": return toast.loading(message, opts);
    }
  };

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const myPosts = await pb.collection("posts").getFullList({
        filter: `creator = "${user.id}"`,
        sort: "-created",
        $autoCancel: false,
      });

      const allComments = await pb.collection("comments").getFullList({
        $autoCancel: false,
      });

      let saved: any[] = [];
      try {
        saved = await pb.collection("posts").getFullList({
          filter: `savedBy ~ "${user.id}"`,
          expand: "creator",
          sort: "-created",
          $autoCancel: false,
        });
      } catch {
        try {
          saved = await pb.collection("posts").getFullList({
            filter: `savedBy ?~ "${user.id}"`,
            expand: "creator",
            sort: "-created",
            $autoCancel: false,
          });
        } catch (e) {
          console.warn("savedBy filter failed, savedPosts will be empty:", e);
        }
      }

      let reports: any[] = [];
      try {
        reports = await pb.collection("reports").getFullList({
          filter: `reporter = "${user.id}"`,
          expand: "post",
          $autoCancel: false,
        });
      } catch (e) {
        console.warn("reports fetch failed:", e);
      }

      let notifs: any[] = [];
      try {
        notifs = await pb.collection("notifications").getFullList({
          filter: `recipient = "${user.id}"`,
          expand: "actor",
          sort: "-created",
          $autoCancel: false,
        });
      } catch (e) {
        console.warn("notifications fetch failed:", e);
      }
      setNotifications(notifs);

      const totalLikes = myPosts.reduce((sum, p) => sum + (p.likes || 0), 0);
      const totalComments = allComments.filter(c => myPosts.some(p => p.id === c.post)).length;
      setStats({ posts: myPosts.length, totalLikes, totalComments });

      setPosts(myPosts.map(p => ({
        ...p,
        postPic: p.postPic ? pb.files.getURL(p, p.postPic) : null,
        commentCount: allComments.filter(c => c.post === p.id).length,
      })));

      setSavedPosts(saved.map(p => ({
        ...p,
        postPic: p.postPic ? pb.files.getURL(p, p.postPic) : null,
        username: p?.expand?.creator?.username ?? "Unknown",
        user: p?.expand?.creator,
      })));

      setHiddenPosts(reports
        .map(r => {
          const post = r.expand?.post;
          if (!post) return null;
          return {
            ...post,
            postPic: post.postPic ? pb.files.getURL(post, post.postPic) : null,
            reason: r.reason,
            reportId: r.id,
          };
        })
        .filter(Boolean)
      );

      setNotifications(notifs);
    } catch (err) {
      console.error("fetchData outer error:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!user?.id) return;
    pb.collection("notifications").subscribe("*", () => fetchData());
    return () => { pb.collection("notifications").unsubscribe("*"); };
  }, [user?.id]);

  const handleMarkAsRead = async (notifId: string) => {
    try {
      await pb.collection("notifications").update(notifId, { read: true });
      setNotifications(prev => prev.filter(n => n.id !== notifId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => pb.collection("notifications").update(n.id, { read: true })));
      setNotifications([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnhidePost = async (reportId: string, postId: string) => {
    try {
      await pb.collection("reports").delete(reportId);
      setHiddenPosts(prev => prev.filter(p => p.reportId !== reportId));
      showToast("Post unhidden", "success");
    } catch (err) {
      console.error(err);
      showToast("Something went wrong", "error");
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.id) return;
    try {
      const formData = new FormData();
      if (editUsername.trim()) formData.append("username", editUsername);
      if (editAbout.trim()) formData.append("about", editAbout);
      if (editAvatar) formData.append("avatar", editAvatar);
      await pb.collection("users").update(user.id, formData);
      setEditing(false);
      setEditAvatar(null);
      setEditAvatarUrl("");
      showToast("Profile updated", "success");
      fetchData();
    } catch (err) {
      console.error(err);
      showToast("Failed to update profile", "error");
    }
  };

  const avatarUrl = user?.avatar ? pb.files.getURL(user, user.avatar) : null;
  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) return <div className="h-full flex items-center justify-center text-white">Loading...</div>;

  return (
    <div className="h-full text-white overflow-auto">
      <ToastContainer />
      <div className="w-full sm:max-w-2xl mx-auto px-3 sm:px-4 md:px-4 py-4 sm:py-8">

        <div className="bg-[rgba(17,25,40,0.66)] backdrop-blur-[9px] border border-[rgba(255,255,255,0.1)] rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5">
            <div className="relative">
              {editing ? (
                <>
                  <div
                    className="w-20 h-20 rounded-full overflow-hidden cursor-pointer border-2 border-[#5182fe]"
                    onClick={() => avatarRef.current?.click()}>
                    {editAvatarUrl ? (
                      <img src={editAvatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    ) : avatarUrl ? (
                      <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[rgba(81,130,254,0.3)] flex items-center justify-center">
                        <i className="bi bi-person text-3xl" />
                      </div>
                    )}
                  </div>
                  <input type="file" accept="image/*" ref={avatarRef} className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) { setEditAvatar(file); setEditAvatarUrl(URL.createObjectURL(file)); }
                    }} />
                  <div className="absolute bottom-0 right-0 bg-[#5182fe] rounded-full w-6 h-6 flex items-center justify-center cursor-pointer"
                    onClick={() => avatarRef.current?.click()}>
                    <i className="bi bi-pencil text-[10px]" />
                  </div>
                </>
              ) : (
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[rgba(255,255,255,0.1)]">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[rgba(81,130,254,0.3)] flex items-center justify-center">
                      <i className="bi bi-person text-3xl" />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 w-full">
              {editing ? (
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder="Username"
                    className="bg-[rgba(17,25,40,0.55)] border border-[rgba(255,255,255,0.1)] rounded-md px-2 sm:px-3 py-1.5 text-xs sm:text-sm outline-none focus:border-[#5182fe] transition-colors w-full"
                  />
                  <input
                    type="text"
                    value={editAbout}
                    onChange={(e) => setEditAbout(e.target.value)}
                    placeholder="About"
                    className="bg-[rgba(17,25,40,0.55)] border border-[rgba(255,255,255,0.1)] rounded-md px-3 py-1.5 text-sm outline-none focus:border-[#5182fe] transition-colors w-full"
                  />
                </div>
              ) : (
                <>
                  <p className="font-bold text-lg">{user?.username}</p>
                  <p className="text-sm text-gray-400">{(user as any)?.about || "No bio yet"}</p>
                </>
              )}
            </div>

            <div>
              {editing ? (
                <div className="flex flex-col gap-2">
                  <button onClick={handleSaveProfile} className="px-4 py-1.5 bg-[#5182fe] rounded-md text-sm cursor-pointer">Save</button>
                  <button onClick={() => { setEditing(false); setEditAvatar(null); setEditAvatarUrl(""); }} className="px-4 py-1.5 bg-gray-500 rounded-md text-sm cursor-pointer">Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditing(true); setEditUsername(user?.username ?? ""); setEditAbout((user as any)?.about ?? ""); }}
                  className="px-4 py-1.5 border border-[rgba(255,255,255,0.1)] rounded-md text-sm cursor-pointer hover:bg-[rgba(255,255,255,0.07)]">
                  Edit profile
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 sm:gap-6 mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-[rgba(255,255,255,0.07)]">
            <div className="text-center flex-1 sm:flex-none">
              <p className="font-bold text-base sm:text-lg">{stats.posts}</p>
              <p className="text-xs text-gray-400">Posts</p>
            </div>
            <div className="text-center flex-1 sm:flex-none">
              <p className="font-bold text-base sm:text-lg">{stats.totalLikes}</p>
              <p className="text-xs text-gray-400">Total Likes</p>
            </div>
            <div className="text-center flex-1 sm:flex-none">
              <p className="font-bold text-base sm:text-lg">{stats.totalComments}</p>
              <p className="text-xs text-gray-400">Total Comments</p>
            </div>
          </div>
        </div>

        <div className="flex border-b border-[rgba(255,255,255,0.1)] mb-4">
          {(["posts", "saved", "hidden", "notifications"] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-sm capitalize relative ${activeTab === tab ? "text-white" : "text-gray-400 hover:text-white"}`}>
              {tab}
              {tab === "notifications" && unreadCount > 0 && (
                <span className="ml-1 bg-[#5182fe] text-[10px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>
              )}
              {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-[#5182fe]" />}
            </button>
          ))}
        </div>

        {/* Posts Tab */}
        {activeTab === "posts" && (
          <div className="grid grid-cols-3 gap-1">
            {posts.length === 0 && <p className="text-gray-400 text-sm col-span-3 text-center py-8">No posts yet.</p>}
            {posts.map(post => (
              <div key={post.id} onClick={() => router.push(`/search/posts/${post.id}`)}
                className="aspect-square cursor-pointer overflow-hidden rounded-md bg-[rgba(81,130,254,0.16)] border border-[rgba(255,255,255,0.1)] relative group">
                {post.postPic ? (
                  <img src={post.postPic} alt="post" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center px-2">
                    <p className="text-xs text-center text-gray-300 line-clamp-4">{post.postCaption}</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                  <span className="text-xs"><i className="bi bi-heart-fill text-white mr-1" />{post.likes || 0}</span>
                  <span className="text-xs"><i className="bi bi-chat-fill text-white mr-1" />{post.commentCount || 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Saved Tab */}
        {activeTab === "saved" && (
          <div className="flex flex-col gap-4">
            {savedPosts.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No saved posts yet.</p>}
            {savedPosts.map(post => (
              <div key={post.id} onClick={() => router.push(`/search/posts/${post.id}`)}
                className="bg-[rgba(81,130,254,0.16)] backdrop-blur-[9px] border border-[rgba(255,255,255,0.1)] rounded-lg overflow-hidden cursor-pointer hover:border-[rgba(255,255,255,0.3)] transition-colors">
                <div className="flex items-center gap-3 p-3">
                  <ChatAvatar avatarUser={post.user} />
                  <div>
                    <p className="font-semibold text-sm">{post.username}</p>
                    <p className="text-xs text-gray-400">{timeAgo(post.created)}</p>
                  </div>
                </div>
                {post.postPic && <img src={post.postPic} alt="post" className="w-full object-cover max-h-[200px]" />}
                {post.postCaption && <div className="px-3 py-2"><p className="text-sm text-gray-300 line-clamp-2">{post.postCaption}</p></div>}
                <div className="px-3 py-2 text-xs text-gray-400">{post.likes || 0} likes</div>
              </div>
            ))}
          </div>
        )}

        {/* Hidden Tab */}
        {activeTab === "hidden" && (
          <div className="flex flex-col gap-4">
            {hiddenPosts.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No hidden posts.</p>}
            {hiddenPosts.map(post => (
              <div key={post.reportId}
                className="bg-[rgba(81,130,254,0.16)] backdrop-blur-[9px] border border-[rgba(255,255,255,0.1)] rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] bg-red-500 bg-opacity-20 text-red-400 border border-red-500 border-opacity-30 px-2 py-0.5 rounded-full font-medium">
                        {post.reason || "No reason given"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{timeAgo(post.created)}</p>
                  </div>
                  <button
                    onClick={() => handleUnhidePost(post.reportId, post.id)}
                    className="px-3 py-1.5 border border-[rgba(255,255,255,0.1)] rounded-md text-xs hover:bg-[rgba(255,255,255,0.07)] cursor-pointer">
                    Unhide
                  </button>
                </div>
                {post.postPic && <img src={post.postPic} alt="post" className="w-full object-cover max-h-[150px]" />}
                {post.postCaption && <div className="px-3 py-2"><p className="text-sm text-gray-300 line-clamp-2">{post.postCaption}</p></div>}
              </div>
            ))}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="flex flex-col gap-2">
            {notifications.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No notifications.</p>}
            {notifications.length > 0 && unreadCount > 0 && (
              <div className="flex justify-end mb-2">
                <button onClick={handleMarkAllRead} className="text-xs text-[#5182fe] hover:underline cursor-pointer">Mark all as read</button>
              </div>
            )}
            {notifications.map(notif => (
              <div key={notif.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${!notif.read ? "bg-[rgba(81,130,254,0.16)] border-[rgba(81,130,254,0.3)]" : "bg-[rgba(17,25,40,0.55)] border-[rgba(255,255,255,0.07)]"}`}
                onClick={() => {
                  if (!notif.read) handleMarkAsRead(notif.id);
                  if (notif.post) router.push(`/search/posts/${notif.expand?.post?.id ?? notif.post}`);
                }}>
                <ChatAvatar avatarUser={notif.expand?.actor} />
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-semibold">{notif.expand?.actor?.username ?? "Someone"}</span>
                    {notif.type === "like" ? " liked your post" : " commented on your post"}
                  </p>
                  <p className="text-xs text-gray-400">{timeAgo(notif.created)}</p>
                </div>
                {!notif.read && <div className="w-2 h-2 rounded-full bg-[#5182fe]" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}