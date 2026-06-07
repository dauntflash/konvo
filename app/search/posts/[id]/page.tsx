"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import pb from "@/lib/pocketbase";
import { useAuth } from "@/lib/useAuth";
import ChatAvatar from "@/app/components/Avatars/chatAvatar";
import OwnAvatar from "@/app/components/Avatars/ownAvatar";
import Image from "next/image";
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

interface Comment {
  id: string;
  text: string;
  created: string;
  username: string;
  avatar?: string | null;
  user: any;
  replyTo?: string;
  replyToUsername?: string;
}

export default function SinglePostPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  const [post, setPost] = useState<any>(null);
  const [morePosts, setMorePosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState<"deleted" | "reported" | "unknown" | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const showToast = (message: string, type: "success" | "error") => {
    toast.dismiss();
    const opts = {
      position: "top-center" as const,
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      style: { color: "white", fontSize: "14px", fontWeight: "500" },
    };
    type === "success" ? toast.success(message, opts) : toast.error(message, opts);
  };

  const fetchPost = async () => {
    if (!id || !user) return;
    try {
      const reportRecords = await pb.collection("reports").getFullList({
        $autoCancel: false,
        filter: `reporter = "${user.id}" && post = "${id}"`,
      });
      if (reportRecords.length > 0) { setErrorType("reported"); setLoading(false); return; }

      const record = await pb.collection("posts").getOne(id as string, { expand: "creator" });
      const comments = await pb.collection("comments").getFullList({
        filter: `post = "${id}"`,
        expand: "user",
        sort: "created",
        $autoCancel: false,
      });

      const formattedPost = {
        ...record,
        postPic: record.postPic ? pb.files.getURL(record, record.postPic) : null,
        username: record?.expand?.creator?.username ?? "Unknown",
        user: record?.expand?.creator,
        likedBy: Array.isArray(record?.likedBy) ? record.likedBy : [],
        savedBy: Array.isArray(record?.savedBy) ? record.savedBy : [],
        comments: comments.map((c: any) => ({
          id: c.id,
          text: c.text,
          created: c.created,
          username: c?.expand?.user?.username ?? "Unknown",
          avatar: c?.expand?.user?.avatar ? pb.files.getURL(c.expand.user, c.expand.user.avatar) : null,
          user: c?.expand?.user,
          replyTo: c.replyTo ?? null,
          replyToUsername: c.replyToUsername ?? null,
        })),
      };

      setPost(formattedPost);
      setIsLiked(formattedPost.likedBy.includes(user?.id ?? ""));
      setIsSaved(formattedPost.savedBy.includes(user?.id ?? ""));

      if (record?.expand?.creator?.id) {
        const others = await pb.collection("posts").getFullList({
          filter: `creator = "${record.expand.creator.id}" && id != "${id}"`,
          expand: "creator",
          sort: "-created",
          $autoCancel: false,
        });
        setMorePosts(others.map((p: any) => ({
          ...p,
          postPic: p.postPic ? pb.files.getURL(p, p.postPic) : null,
          username: p?.expand?.creator?.username ?? "Unknown",
          user: p?.expand?.creator,
        })));
      }
    } catch (err: any) {
      setErrorType(err?.status === 404 ? "deleted" : "unknown");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPost(); }, [id]);

  useEffect(() => {
    if (!user) return;
    pb.collection("posts").subscribe("*", (e) => {
      if (e.action !== "update") return;
      setPost((prev: any) => {
        if (!prev || prev.id !== e.record.id) return prev;
        return { ...prev, likes: e.record.likes, likedBy: e.record.likedBy ?? [] };
      });
    });
    pb.collection("comments").subscribe("*", (e) => {
      // Only refetch if comment is from someone else — our own are added locally
      if (e.action === "create" && e.record.user === user.id) return;
      fetchPost();
    });
    return () => {
      pb.collection("posts").unsubscribe("*");
      pb.collection("comments").unsubscribe("*");
    };
  }, [user]);

  const handleLike = async () => {
    if (!post || !user) return;
    const freshPost = await pb.collection("posts").getOne(post.id);
    try {
      if (isLiked) {
        const newLikes = (freshPost.likes ?? 0) - 1;
        await pb.collection("posts").update(post.id, { likes: newLikes, "likedBy-": user.id });
        setPost((prev: any) => ({ ...prev, likes: newLikes, likedBy: prev.likedBy.filter((i: string) => i !== user.id) }));
        setIsLiked(false);
      } else {
        if ((freshPost.likedBy ?? []).includes(user.id)) return;
        const newLikes = (freshPost.likes ?? 0) + 1;
        await pb.collection("posts").update(post.id, { likes: newLikes, "likedBy+": user.id });
        setPost((prev: any) => ({ ...prev, likes: newLikes, likedBy: [...prev.likedBy, user.id] }));
        setIsLiked(true);
        if (post.user?.id && post.user.id !== user.id) {
          await pb.collection("notifications").create({
            recipient: post.user.id, actor: user.id, type: "like", post: post.id, read: false,
          });
        }
      }
    } catch (err) { console.error(err); }
  };

const handleSave = async () => {
  if (!post || !user) return;
  const optimistic = !isSaved;
  setIsSaved(optimistic);
  try {
    await pb.collection("posts").update(post.id, { 
      [optimistic ? "savedBy+" : "savedBy-"]: user.id 
    });
    setPost((prev: any) => ({
      ...prev,
      savedBy: optimistic
        ? [...prev.savedBy, user.id]
        : prev.savedBy.filter((i: string) => i !== user.id)
    }));
    showToast(optimistic ? "Post saved!" : "Removed from saved", "success");
  } catch (err) {
    setIsSaved(!optimistic);
    showToast("Something went wrong", "error");
  }
};

  const handleShare = () => {
    const url = `${window.location.origin}/search/posts/${post.id}`;
    navigator.clipboard.writeText(url)
      .then(() => showToast("Link copied!", "success"))
      .catch(() => showToast("Failed to copy link", "error"));
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !user || !post) return;
    try {
      const commentData: any = { post: post.id, user: user.id, text: newComment };
      if (replyingTo) {
        commentData.replyTo = replyingTo.id;
        commentData.replyToUsername = replyingTo.username;
      }
      const created = await pb.collection("comments").create(commentData, { expand: "user" });

      const newCommentObj: Comment = {
        id: created.id,
        text: created.text,
        created: created.created,
        username: user.username ?? "Unknown",
        avatar: user.avatar ? pb.files.getURL(user as any, user.avatar) : null,
        user: user as any,
        replyTo: replyingTo?.id,
        replyToUsername: replyingTo?.username,
      };

      setPost((prev: any) => ({ ...prev, comments: [...prev.comments, newCommentObj] }));
      setNewComment("");
      setReplyingTo(null);

      if (post.user?.id && post.user.id !== user.id) {
        await pb.collection("notifications").create({
          recipient: post.user.id, actor: user.id, type: "comment", post: post.id, read: false,
        });
      }
    } catch (err) {
      showToast("Failed to post comment", "error");
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-white">Loading post...</div>;

  if (errorType) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-white gap-4 px-4">
        <i className={`text-5xl opacity-40 ${errorType === "reported" ? "bi bi-flag" : "bi bi-exclamation-circle"}`} />
        <p className="text-lg font-semibold">
          {errorType === "reported" && "You've reported this post"}
          {errorType === "deleted" && "This post is no longer available"}
          {errorType === "unknown" && "Something went wrong"}
        </p>
        <p className="text-sm text-gray-400 text-center">
          {errorType === "reported" && "This post is hidden because you reported it."}
          {errorType === "deleted" && "It may have been removed by the author."}
          {errorType === "unknown" && "We couldn't load this post. Try again later."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-full overflow-auto text-white py-4 sm:py-8">
      <ToastContainer />
      <div className="w-full sm:max-w-2xl mx-auto px-3 sm:px-4">
        <div className="bg-[rgba(81,130,254,0.16)] backdrop-blur-[9px] border border-[rgba(255,255,255,0.1)] rounded-lg overflow-hidden mb-4 sm:mb-6">

          {/* Header */}
          <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4">
            <ChatAvatar avatarUser={post.user} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-xs sm:text-sm truncate">{post.username}</p>
              <p className="text-[10px] sm:text-xs text-gray-400">{timeAgo(post.created)}</p>
            </div>
          </div>

          {/* Image */}
          {post.postPic && (
            <Image src={post.postPic} alt="post" width={800} height={800} className="w-full object-cover" />
          )}

          {/* Caption (text-only post) */}
          {!post.postPic && post.postCaption && (
            <div className="px-3 sm:px-4 py-3 sm:py-5 border-y border-[rgba(255,255,255,0.07)]">
              <p className="text-xs sm:text-sm leading-relaxed">{post.postCaption}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3">
            <div className="flex items-center gap-4 sm:gap-8">
              <div className="flex items-center gap-1 sm:gap-2">
                <i className={`text-lg sm:text-xl cursor-pointer transition-transform active:scale-90 ${isLiked ? "bi bi-heart-fill text-red-500" : "bi bi-heart hover:text-gray-400"}`} onClick={handleLike} />
                <span className="text-xs sm:text-sm opacity-65">{post.likes?.toLocaleString() || 0}</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <i className="bi bi-chat text-lg sm:text-xl cursor-pointer hover:text-gray-400" onClick={() => setShowComments(p => !p)} />
                <span className="text-xs sm:text-sm opacity-65">{post.comments?.length || 0}</span>
              </div>
              <i className="bi bi-send text-lg sm:text-xl cursor-pointer hover:text-gray-400 transition-colors" onClick={handleShare} />
            </div>
            <i className={`text-lg sm:text-xl cursor-pointer transition-colors ${isSaved ? "bi bi-bookmark-fill text-[#5182fe]" : "bi bi-bookmark hover:text-gray-400"}`} onClick={handleSave} />
          </div>

          {/* Caption below image */}
          {post.postPic && post.postCaption && (
            <div className="px-3 sm:px-4 pb-3">
              <p className="text-xs sm:text-sm">
                <span className="font-semibold mr-2">{post.username}</span>
                <span className="text-gray-300">{post.postCaption}</span>
              </p>
            </div>
          )}

          {/* Comments section */}
          {showComments && (
            <div className="border-t border-[rgba(255,255,255,0.07)] px-4 pb-4">
              <div className="mt-3 flex flex-col gap-1 max-h-[320px] overflow-y-auto pr-1">
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
                          onClick={() => setReplyingTo(replyingTo?.id === comment.id ? null : { id: comment.id, username: comment.username })}>
                          {replyingTo?.id === comment.id ? "Cancel" : "Reply"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply indicator */}
              {replyingTo && (
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
                    placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : "Add a comment..."}
                    className="flex-1 bg-transparent text-sm outline-none text-white placeholder-gray-500"
                    onKeyDown={(e) => e.key === "Enter" && handlePostComment()}
                  />
                  <button onClick={handlePostComment} className="text-[#5182fe] text-sm font-semibold cursor-pointer hover:text-white transition-colors">
                    Post
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* More from this user */}
        {morePosts.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold mb-4 opacity-75">More from {post.username}</p>
            <div className="grid grid-cols-3 gap-1">
              {morePosts.map((p: any) => (
                <div key={p.id} onClick={() => router.push(`/search/posts/${p.id}`)}
                  className="aspect-square cursor-pointer overflow-hidden rounded-md bg-[rgba(81,130,254,0.16)] border border-[rgba(255,255,255,0.1)] relative group">
                  {p.postPic ? (
                    <img src={p.postPic} alt="post" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center px-2">
                      <p className="text-xs text-center text-gray-300 line-clamp-3">{p.postCaption}</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                    <span className="text-xs"><i className="bi bi-heart-fill text-white mr-1" />{p.likes || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}