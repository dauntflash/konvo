"use client";

import ChatAvatar from "@/app/components/Avatars/chatAvatar";
import OwnAvatar from "@/app/components/Avatars/ownAvatar";
import pb from "@/lib/pocketbase";
import { useAuth } from "@/lib/useAuth";
import Image from "next/image";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast, ToastContainer } from 'react-toastify';

interface User {
  id: string;
  username: string;
  avatar?: string;
}

interface Comment {
  id: string;
  text: string;
  created: string;
  username: string;
  avatar?: string | null;
  user: User | null;
  replyTo?: string;
  replyToUsername?: string;
}

interface Post {
  id: string;
  postCaption?: string;
  postPic?: string;
  likes: number;
  created: string;
  username: string;
  user: User | null;
  comments: Comment[];
  likedBy: string[];
  savedBy: string[];
}

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

function Posts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [newComment, setNewComment] = useState<string>("");
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string; postId: string } | null>(null);
  const [caption, setCaption] = useState<string>("");
  const [postImage, setPostImage] = useState<File | null>(null);
  const [postImageUrl, setPostImageUrl] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);
  const { user } = useAuth();
  const imageRef = useRef<HTMLInputElement>(null);
  const [fullImage, setFullImage] = useState<Post | null>(null);
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [editPostId, setEditPostId] = useState<string | null>(null);
  const [editPostCaption, setEditPostCaption] = useState<string>("");
  const [editPostImageUrl, setEditPostImageUrl] = useState<string>("");
  const [editPostImageFile, setEditPostImageFile] = useState<File | null>(null);
  const [savedPosts, setSavedPosts] = useState<string[]>([]);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<string>("");

  const showToast = (message: string, type: "success" | "error" | "loading") => {
    toast.dismiss();
    const toastOptions = {
      position: "top-center" as const,
      autoClose: 5000,
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
      case "success": return toast.success(message, toastOptions);
      case "error": return toast.error(message, toastOptions);
      case "loading": return toast.loading(message, toastOptions);
    }
  };
  useEffect(() => {
    const interval = setInterval(() => setRefreshKey(prev => prev + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => { if (postImageUrl) URL.revokeObjectURL(postImageUrl); };
  }, [postImageUrl]);

  const fetchPosts = useCallback(async (showLoader = true) => {
    if (!user) return;
    if (showLoader) setLoading(true);
    setError(null);

    try {
      const records = await pb.collection("posts").getFullList({
        $autoCancel: false,
        sort: "-created",
        expand: "creator",
      });

      const allComments = await pb.collection("comments").getFullList({
        $autoCancel: false,
        expand: "user",
        sort: "created",
      });

      let reportRecords: any[] = [];
      try {
        reportRecords = await pb.collection("reports").getFullList({
          $autoCancel: false,
          filter: `reporter = "${user.id}"`,
        });
      } catch (e) {
        console.warn("reports fetch failed:", e);
      }

      const reportedPostIds = reportRecords.map(r => r.post);

      const formattedPosts: Post[] = records
        .filter((record) => !reportedPostIds.includes(record.id))
        .map((record: any) => {
          const creator = record?.expand?.creator ?? null;
          const postComments: Comment[] = allComments
            .filter((c: any) => c.post === record.id)
            .map((c: any) => ({
              id: c.id,
              text: c.text,
              created: c.created,
              username: c?.expand?.user?.username ?? "Unknown",
              avatar: c?.expand?.user?.avatar
                ? pb.files.getURL(c.expand.user, c.expand.user.avatar)
                : null,
              user: c?.expand?.user ?? null,
              replyTo: c.replyTo ?? null,
              replyToUsername: c.replyToUsername ?? null,
            }));

          return {
            ...record,
            postPic: record.postPic ? pb.files.getURL(record, record.postPic) : null,
            username: creator?.username ?? "Unknown",
            user: creator,
            comments: postComments,
            likedBy: Array.isArray(record?.likedBy) ? record.likedBy : [],
            savedBy: Array.isArray(record?.savedBy) ? record.savedBy : [],
          };
        });

      // Derive liked/saved from the post data directly — no separate query needed
      setLikedPosts(formattedPosts.filter(p => p.likedBy.includes(user.id)).map(p => p.id));
      setSavedPosts(formattedPosts.filter(p => p.savedBy.includes(user.id)).map(p => p.id));
      setPosts(formattedPosts);
    } catch (err) {
      setError("Failed to load posts");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchPosts(true); }, [fetchPosts]);
  useEffect(() => {
    if (!user) return;

    pb.collection("posts").subscribe("*", (e) => {
      // Only refetch for creates/deletes, not updates (updates = likes/saves triggering noise)
      if (e.action === "create" || e.action === "delete") {
        fetchPosts(false);
      } else {
        // For updates, just patch the specific post's non-save data
        setPosts(prev => prev.map(p => {
          if (p.id !== e.record.id) return p;
          return {
            ...p,
            likes: e.record.likes ?? p.likes,
            postCaption: e.record.postCaption ?? p.postCaption,
          };
        }));
      }
    });

    pb.collection("comments").subscribe("*", () => {
      fetchPosts(false);
    });

    return () => {
      pb.collection("posts").unsubscribe("*");
      pb.collection("comments").unsubscribe("*");
    };
  }, [user]);
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Only images allowed"); return; }
    setPostImage(file);
    setPostImageUrl(URL.createObjectURL(file));
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caption.trim() && !postImage) return;
    const formData = new FormData();
    formData.append("creator", user?.id ?? "");
    formData.append("postCaption", caption);
    formData.append("likes", "0");
    if (postImage) formData.append("postPic", postImage);
    try {
      await pb.collection("posts").create(formData);
      setCaption("");
      setPostImage(null);
      setPostImageUrl("");
      await fetchPosts();
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  const handlePostLike = async (postId: string) => {
    const freshPost = await pb.collection("posts").getOne(postId, { expand: "creator" });
    const likedBy: string[] = freshPost?.likedBy ?? [];
    try {
      if (likedPosts.includes(postId)) {
        const newLikes = (freshPost.likes ?? 0) - 1;
        await pb.collection("posts").update(postId, { likes: newLikes, "likedBy-": user?.id });
        setPosts(prev => prev.map(p => p.id === postId
          ? { ...p, likes: newLikes, likedBy: p.likedBy.filter(id => id !== user?.id) }
          : p
        ));
        setLikedPosts(prev => prev.filter(id => id !== postId));
      } else {
        if (likedBy.includes(user?.id ?? "")) return;
        const newLikes = (freshPost.likes ?? 0) + 1;
        await pb.collection("posts").update(postId, { likes: newLikes, "likedBy+": user?.id });
        setPosts(prev => prev.map(p => p.id === postId
          ? { ...p, likes: newLikes, likedBy: [...p.likedBy, user?.id ?? ""] }
          : p
        ));
        setLikedPosts(prev => [...prev, postId]);
        if (freshPost.expand?.creator?.id && freshPost.expand.creator.id !== user?.id) {
          await pb.collection("notifications").create({
            recipient: freshPost.expand.creator.id,
            actor: user?.id,
            type: "like",
            post: postId,
            read: false,
          });
        }
      }
    } catch (error: any) {
      console.error("Error liking post:", error);
    }
  };

  const handlePostComment = async (postId: string, replyTo?: { id: string; username: string }) => {
    if (!newComment.trim()) return;
    try {
      const post = posts.find(p => p.id === postId);
      const commentData: any = {
        post: postId,
        user: user?.id,
        text: newComment,
      };
      if (replyTo) commentData.replyTo = replyTo.id;

      const created = await pb.collection("comments").create(commentData, { expand: "user" });

      const newCommentObj: Comment = {
        id: created.id,
        text: created.text,
        created: created.created,
        username: user?.username ?? "Unknown",
        avatar: user?.avatar ? pb.files.getURL(user as any, user.avatar) : null,
        user: user as any,
        replyTo: replyTo?.id,
        replyToUsername: replyTo?.username,
      };

      setPosts(prev => prev.map(p => p.id === postId
        ? { ...p, comments: [...p.comments, newCommentObj] }
        : p
      ));
      setNewComment("");
      setReplyingTo(null);

      if (post?.user?.id && post.user.id !== user?.id) {
        await pb.collection("notifications").create({
          recipient: post.user.id,
          actor: user?.id,
          type: "comment",
          post: postId,
          read: false,
        });
      }
    } catch (error) {
      console.error("Error posting comment:", error);
    }
  };
  const handleDeletePost = async (postId: string) => {

    try {
      await pb.collection("posts").delete(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      setDeletePostId(null);
      showToast("Succesfully deleted post", "success")
    } catch (error) {
      console.error("Error deleting post:", error);
      showToast("Something went wrong, try again later", "error")
    }
  }

  const handleEditPost = async (postId: string) => {
    if (!editPostCaption.trim() && !editPostImageUrl) {
      showToast("Post cannot be empty", "error");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("postCaption", editPostCaption);
      if (editPostImageFile) {
        formData.append("postPic", editPostImageFile);
      } else if (editPostImageUrl === "") {
        formData.append("postPic", null as any);
      }
      await pb.collection("posts").update(postId, formData);
      await fetchPosts();
      setEditPostId(null);
      setEditPostCaption("");
      setEditPostImageUrl("");
      setEditPostImageFile(null);
      showToast("Succesfully edited post", "success")
    } catch (error) {
      console.error("Error editing post:", error);
      showToast("Something went wrong, try again later", "error")
    }
  };

  const handleShare = (postId: string) => {
    const shareUrl = `${window.location.origin}/search/posts/${postId}`;

    navigator.clipboard.writeText(shareUrl)
      .then(() => showToast("Link copied to clipboard!", "success"))
      .catch(() => showToast("Failed to copy link", "error"));
  };

  const handleSavePost = async (postId: string) => {
    if (!user?.id) return;
    const isSaved = savedPosts.includes(postId);
    setSavedPosts(prev => isSaved ? prev.filter(id => id !== postId) : [...prev, postId]);

    try {
      await pb.collection("posts").update(postId, {
        [isSaved ? "savedBy-" : "savedBy+"]: user.id
      });
    } catch (error) {
      setSavedPosts(prev => isSaved ? [...prev, postId] : prev.filter(id => id !== postId));
      showToast("Something went wrong", "error");
    }
  };

  const handleReportPost = async (postId: string) => {
    if (!reportReason) {
      showToast("Please select a reason", "error");
      return;
    }
    try {
      await pb.collection("reports").create({
        post: postId,
        reporter: user?.id,
        reason: reportReason,
      });
      setPosts(prev => prev.filter(p => p.id !== postId));
      setReportPostId(null);
      setReportReason("");
      showToast("Post reported successfully", "success");
    } catch (error) {
      console.error("Error reporting post:", error);
      showToast("Something went wrong", "error");
    }
  };
  if (loading) return <div className="h-full flex items-center justify-center text-white">Loading posts...</div>;
  if (error) return <div className="h-full flex items-center justify-center text-red-400">{error}</div>;

  return (
    <div className="h-full text-white overflow-auto">
      <ToastContainer />
      <div className="max-w-2xl mx-auto pb-6">
        <div className="bg-[rgba(17,25,40,0.66)] backdrop-blur-[9px] border border-[rgba(255,255,255,0.1)] rounded-lg p-4 mx-4 my-6">
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <OwnAvatar avatarUser={user} />
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's on your mind?"
              className="resize-none flex-1 overflow-y-auto bg-[rgba(17,25,40,0.55)] rounded-lg text-md h-[80px] max-h-[150px] px-2 py-2 outline-none border border-[rgba(255,255,255,0.1)]"
            />
            <div className="bi bi-card-image text-[1.5rem] opacity-70 cursor-pointer" onClick={() => imageRef.current?.click()} />
            <input type="file" accept="image/*" ref={imageRef} className="hidden" onChange={handleImageUpload} />
            <button type="submit" className="px-4 py-2 bg-[#5182fe] rounded-md cursor-pointer">Post</button>
          </form>
          {postImage && (
            <div className="mt-3">
              <span className="bi bi-x text-[1.5rem] opacity-70 cursor-pointer" onClick={() => { setPostImage(null); setPostImageUrl(""); }} />
              <Image alt="post preview" width={100} height={100} src={postImageUrl} className="w-auto object-cover max-h-[6rem] min-h-[4rem] rounded-md" />
            </div>
          )}
        </div>

        {posts.map((post) => (
          <div key={`${post.id}-${refreshKey}`} className="bg-[rgba(81,130,254,0.16)] backdrop-blur-[9px] border border-[rgba(255,255,255,0.1)] mb-6 mx-4 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 relative">
              <div className="flex items-center gap-3">
                <ChatAvatar avatarUser={post.user} />
                <div>
                  <p className="font-semibold text-sm">{post.username}</p>
                  <p className="text-xs text-gray-400">{timeAgo(post.created)}</p>
                </div>
              </div>
              <i className="bi bi-three-dots-vertical text-xl cursor-pointer hover:text-gray-400"
                onClick={(e) => {
                  const menu = e.currentTarget.nextElementSibling as HTMLDivElement;
                  if (menu) {
                    const isVisible = menu.style.display === "flex";
                    menu.style.display = isVisible ? "none" : "flex";
                    const handleClickOutside = (event: MouseEvent) => {
                      if (menu && !menu.contains(event.target as Node) && event.target !== e.currentTarget) {
                        menu.style.display = "none";
                        document.removeEventListener("click", handleClickOutside);
                      }
                    }; if (!isVisible) document.addEventListener("click", handleClickOutside);

                  }
                }}
              />
              {post.user?.id === user?.id ? (
                <div className="menu absolute hidden top-10 right-2 flex-col items-start bg-[rgba(17,25,40,0.95)] backdrop-blur-[9px] border border-[rgba(255,255,255,0.1)] rounded-lg p-1 z-30 min-w-[160px]">
                  <p className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[rgba(255,255,255,0.07)] text-sm"
                    onClick={(e) => { e.stopPropagation(); setDeletePostId(post.id); }}>
                    <span className="bi bi-trash text-red-400" />
                    <span className="text-red-400">Delete post</span>
                  </p>
                  <p className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[rgba(255,255,255,0.07)] text-sm"
                    onClick={(e) => { e.stopPropagation(); setEditPostId(post.id); setEditPostCaption(post.postCaption ?? ""); setEditPostImageUrl(post.postPic ?? ""); setEditPostImageFile(null); }}>
                    <span className="bi bi-pencil text-gray-300" />
                    <span className="text-gray-300">Edit post</span>
                  </p>
                  <p className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[rgba(255,255,255,0.07)] text-sm"
                    onClick={(e) => { e.stopPropagation(); handleShare(post.id); }}>
                    <span className="bi bi-send text-gray-300" />
                    <span className="text-gray-300">Share post</span>
                  </p>
                </div>
              ) : (
                <div className="menu absolute hidden top-10 right-2 flex-col items-start bg-[rgba(17,25,40,0.95)] backdrop-blur-[9px] border border-[rgba(255,255,255,0.1)] rounded-lg p-1 z-30 min-w-[160px]">
                  <p className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[rgba(255,255,255,0.07)] text-sm"
                    onClick={(e) => { e.stopPropagation(); handleShare(post.id); }}>
                    <span className="bi bi-send text-gray-300" />
                    <span className="text-gray-300">Share post</span>
                  </p>
                  <p className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[rgba(255,255,255,0.07)] text-sm"
                    onClick={(e) => { e.stopPropagation(); handleSavePost(post.id); }}>
                    <span className={`bi ${savedPosts.includes(post.id) ? "bi-bookmark-fill text-[#5182fe]" : "bi-bookmark text-gray-300"}`} />
                    <span className={savedPosts.includes(post.id) ? "text-[#5182fe]" : "text-gray-300"}>
                      {savedPosts.includes(post.id) ? "Unsave post" : "Save post"}
                    </span>
                  </p>
                  <p className="cursor-pointer w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[rgba(255,255,255,0.07)] text-sm"
                    onClick={(e) => { e.stopPropagation(); setReportPostId(post.id); }}>
                    <span className="bi bi-flag text-gray-300" />
                    <span className="text-gray-300">Report post</span>
                  </p>
                </div>
              )}

            </div>

            {post.postPic ? (
              <div className="relative">
                <Image alt="post" width={600} height={600} src={post.postPic} className="w-full object-cover" onClick={() => setFullImage(post)} />
              </div>
            ) : post.postCaption ? (
              <div className="px-4 py-5 border-y border-[rgba(255,255,255,0.07)]">
                <p className="text-sm leading-relaxed">{post.postCaption}</p>
              </div>
            ) : null}

            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-10">
                <div className="flex items-end  gap-2">
                  <i
                    className={`text-xl cursor-pointer ${likedPosts.includes(post.id) ? "bi bi-heart-fill text-red-500" : "bi bi-heart hover:text-gray-400"}`}
                    onClick={() => handlePostLike(post.id)}
                  />
                  <span className="text-md font-normal opacity-65">{post.likes?.toLocaleString() || 0}</span>
                </div>
                <div className="flex items-end gap-2">
                  <i className="bi bi-chat text-xl cursor-pointer hover:text-gray-400" onClick={() => setShowComments(showComments === post.id ? null : post.id)} />
                  <span className="text-md font-normal opacity-65">{post.comments?.length || 0}</span>
                </div>
                <div className="">
                  <div className="">
                    <i
                      className="bi bi-send text-xl cursor-pointer hover:text-gray-400"
                      onClick={() => handleShare(post.id)}
                    />
                  </div>
                </div>
              </div>
              <i
                className={`text-xl cursor-pointer ${savedPosts.includes(post.id) ? "bi bi-bookmark-fill text-[#5182fe]" : "bi bi-bookmark hover:text-gray-400"}`}
                onClick={() => handleSavePost(post.id)}
              />
            </div>

            <div className="px-4 pb-3">
              {post.postPic && post.postCaption && (
                <p className="text-sm">
                  <span className="font-semibold mr-2">{post.username}</span>
                  <span>{post.postCaption}</span>
                </p>
              )}
            </div>

            {showComments === post.id && (
              <div className="border-t border-[rgba(255,255,255,0.07)] px-4 pb-4">
                {/* Comments list */}
                <div className="mt-3 flex flex-col gap-1 max-h-[280px] overflow-y-auto pr-1">
                  {post.comments?.length === 0 && (
                    <p className="text-xs text-gray-500 text-center py-4">No comments yet. Be the first!</p>
                  )}
                  {post.comments?.map((comment: Comment) => (
                    <div key={comment.id} className={`flex items-start gap-2 py-2 ${comment.replyTo ? "ml-8 border-l-2 border-[rgba(81,130,254,0.3)] pl-3" : ""}`}>
                      <ChatAvatar avatarUser={comment.user} />
                      <div className="flex-1 min-w-0">
                        <div className="bg-[rgba(17,25,40,0.6)] rounded-2xl px-3 py-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-xs text-white">{comment.username}</span>
                            {comment.user?.id === post.user?.id && (
                              <span className="text-[9px] bg-[#5182fe] text-white px-1.5 py-0.5 rounded-full font-semibold tracking-wide">CREATOR</span>
                            )}
                            {comment.replyToUsername && (
                              <span className="text-[10px] text-[#5182fe]">↩ @{comment.replyToUsername}</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-200 mt-0.5 break-words">{comment.text}</p>
                        </div>
                        <div className="flex items-center gap-3 mt-1 ml-2">
                          <span className="text-[10px] text-gray-500">{timeAgo(comment.created)}</span>
                          <button
                            className="text-[10px] text-gray-400 hover:text-[#5182fe] transition-colors font-medium cursor-pointer"
                            onClick={() => setReplyingTo(
                              replyingTo?.id === comment.id ? null : { id: comment.id, username: comment.username, postId: post.id }
                            )}>
                            {replyingTo?.id === comment.id ? "Cancel" : "Reply"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply indicator */}
                {replyingTo?.postId === post.id && (
                  <div className="flex items-center gap-2 mt-2 px-2 py-1 bg-[rgba(81,130,254,0.1)] rounded-lg border border-[rgba(81,130,254,0.2)]">
                    <span className="text-[11px] text-[#5182fe]">↩ Replying to <span className="font-semibold">@{replyingTo.username}</span></span>
                    <button onClick={() => setReplyingTo(null)} className="ml-auto text-gray-400 hover:text-white text-xs cursor-pointer">✕</button>
                  </div>
                )}

                {/* Input */}
                <div className="mt-2 flex gap-2 items-center">
                  <OwnAvatar avatarUser={user} />
                  <div className="flex-1 flex gap-2 bg-[rgba(17,25,40,0.55)] rounded-full px-3 py-1.5 border border-[rgba(255,255,255,0.1)] focus-within:border-[#5182fe] transition-colors">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={replyingTo?.postId === post.id ? `Reply to @${replyingTo.username}...` : "Add a comment..."}
                      className="flex-1 bg-transparent text-sm outline-none text-white placeholder-gray-500"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handlePostComment(post.id, replyingTo?.postId === post.id ? replyingTo : undefined);
                      }}
                    />
                    <button
                      onClick={() => handlePostComment(post.id, replyingTo?.postId === post.id ? replyingTo : undefined)}
                      className="text-[#5182fe] text-sm font-semibold cursor-pointer hover:text-white transition-colors">
                      Post
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {fullImage && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-80 flex items-center justify-center z-50" onClick={() => setFullImage(null)}>
          <img src={fullImage?.postPic ?? ""} alt="Full View" className="max-w-[90%] max-h-[90%] rounded-lg" />
        </div>
      )}
      {deletePostId && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-[rgba(17,25,40,0.95)] border border-[rgba(255,255,255,0.1)] rounded-md p-6">
            <p className="text-lg mb-4">Are you sure you want to delete this post?</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => setDeletePostId(null)} className="px-4 py-2 bg-gray-500 rounded-md text-sm cursor-pointer hover:bg-gray-600">Cancel</button>
              <button onClick={() => handleDeletePost(deletePostId)} className="px-4 py-2 bg-red-500 rounded-md text-sm cursor-pointer hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
      {editPostId && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="border border-[rgba(255,255,255,0.1)] rounded-md w-[400px] mx-auto p-2 bg-[rgba(17,25,40,0.95)]">
            <textarea name="editPost" id="editPost" className="text-md bg-[rgba(17,25,40,0.55)] resize-none backdrop-blur-[9px] border border-[rgba(255,255,255,0.1)] rounded-md p-3 text-sm outline-none overflow-y-auto w-full flex-1 max-h-[150px]" placeholder={editPostCaption || "Add a caption..."} value={editPostCaption} onChange={(e) => setEditPostCaption(e.target.value)} />
            <div className="my-3">
              <label className="cursor-pointer text-[#5182fe] text-sm flex items-center gap-2">
                <span className="bi bi-card-image"></span> {editPostImageUrl ? "Change" : "Add"} Image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setEditPostImageFile(file);
                      setEditPostImageUrl(URL.createObjectURL(file));
                    }
                  }}
                />
              </label>
            </div>
            {editPostImageUrl &&
              <div className="my-3">
                <span className="bi bi-x text-[1.5rem] opacity-70 cursor-pointer" onClick={() => {
                  setEditPostImageUrl("");
                  setEditPostImageFile(null);
                }} />
                <Image alt="post preview" width={100} height={100} src={editPostImageUrl} className="w-auto object-cover max-h-[6rem] min-h-[4rem] rounded-md" />
              </div>
            }
            <div className="flex justify-center gap-4">
              <button onClick={() => handleEditPost(editPostId)} className="px-4 py-2 bg-[#5182fe] rounded-md text-sm cursor-pointer hover:bg-[#5183fe]">Save</button>
              <button onClick={() => {
                setEditPostId(null)
                setEditPostCaption("")
                setEditPostImageUrl("")
                setEditPostImageFile(null)
              }}
                className="px-4 py-2 bg-gray-500 rounded-md text-sm cursor-pointer hover:bg-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}
      {reportPostId && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-[rgba(17,25,40,0.95)] border border-[rgba(255,255,255,0.1)] rounded-md p-6 w-[350px]">
            <p className="text-lg font-semibold mb-1">Report Post</p>
            <p className="text-sm text-gray-400 mb-4">Why are you reporting this post?</p>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full bg-[rgba(17,25,40,0.55)] border border-[rgba(255,255,255,0.1)] rounded-md px-3 py-2 text-sm text-white outline-none mb-4">
              <option value="">Select a reason</option>
              {["Spam", "Inappropriate", "Harassment", "Misinformation", "Other"].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <div className="flex justify-center gap-4">
              <button onClick={() => { setReportPostId(null); setReportReason(""); }} className="px-4 py-2 bg-gray-500 rounded-md text-sm cursor-pointer hover:bg-gray-600">Cancel</button>
              <button onClick={() => handleReportPost(reportPostId)} className="px-4 py-2 bg-red-500 rounded-md text-sm cursor-pointer hover:bg-red-600">Report</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Posts;