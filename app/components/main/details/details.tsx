"use client";
import React, { useState, useEffect } from "react";
import Files from "./sharedMedia/files";
import UserAvatar from "../../Avatars/userAvatar";
import Loader from "../../loader/loader";
import pb from "@/lib/pocketbase";
import { useAuth } from "@/lib/useAuth";

type props = {
  activeUser: any;
  info: any;
};

function Details({ activeUser, info }: props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (info) {
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 500);
    }
  }, [info, activeUser?.id]);

  const checkIfBlocked = async () => {
    if (!user?.id || !activeUser?.id) return;

    try {
      await pb
        .collection("blocks")
        .getFirstListItem(`blocker = "${user.id}" && blocked = "${activeUser.id}"`);
      setBlocked(true);
    } catch (error) {
      setBlocked(false);
    }
  };

  const handleBlockUser = async () => {
    try {
      await pb.collection("blocks").create({
        blocker: user?.id,
        blocked: activeUser.id,
      });
      setBlocked(true);
      setShowBlockConfirm(false);
    } catch (error) {
      console.error("Error blocking user:", error);
    }
  };

  const handleUnblockUser = async () => {
    try {
      const blocks = await pb.collection("blocks").getFullList({
        filter: `blocker = "${user?.id}" && blocked = "${activeUser.id}"`,
      });
      await pb.collection("blocks").delete(blocks[0].id);
      setBlocked(false);
    } catch (error) {
      console.error("Error unblocking user:", error);
    }
  };
  const handleDeleteChat = async () => {
    if (!user?.id || !activeUser?.id) return;
    setShowDeleteConfirm(false);

    try {
      const messages = await pb.collection("messages").getFullList({
        filter: `(sender = "${user.id}" && receiver = "${activeUser.id}") || (sender = "${activeUser.id}" && receiver = "${user.id}")`,
        $autoCancel: false,
      });

      for (const message of messages) {
        const currentHiddenFor = message.hiddenFor || [];

        if (!currentHiddenFor.includes(user.id)) {
          await pb.collection("messages").update(message.id, {
            hiddenFor: [...currentHiddenFor, user.id],
          });
        }
      }

    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };
  useEffect(() => {
    checkIfBlocked();
  }, [activeUser?.id, user?.id]);

  return (
    <section
      className={`flex-1 h-full flex flex-col transition-all duration-500 w-full overflow-hidden ${
        info ? "max-w-full" : "max-w-0"
      }`}>
      {isLoading ? (
        <Loader size="medium" />
      ) : (
        <>
          <div className="flex flex-col py-7 items-center gap-3 border-b-[1px] border-[rgba(255,255,255,0.3)]">
            <div className="w-14 h-14 rounded-full bg-[rgba(17,25,40,0.75)] flex items-center justify-center">
              <UserAvatar avatarUser={activeUser} />
            </div>
            <span className="font-bold text-xl">{activeUser.username}</span>
            <span className="text-[.8rem] max-w-[400px] break-all px-4">{activeUser.about}</span>
          </div>
          <div className=" flex-1 flex flex-col px-4 py-3 *:text-[1rem] *:font-medium gap-6 w-full overflow-auto">
            <div className="">
              <div
                onClick={() => setOpen((prev) => !prev)}
                className="flex justify-between items-center cursor-pointer py-2">
                <span>Shared Files</span>
                <span
                  className={` text-xl ${open ? "bi bi-chevron-down" : "bi bi-chevron-up"}`}></span>
              </div>
              <div
                className={`h-full overflow-hidden transition-all duration-450 ${
                  open ? "max-h-full" : "max-h-0"
                }`}>
                <div className="">
                  <Files activeUser={activeUser} />
                </div>
              </div>
            </div>
          </div>

          {blocked ? (
            <button
              className="bg-[rgba(230,74,105,0.553)] hover:bg-[rgba(230,74,105,0.753)] mx-4 p-2 text-[1rem] transition-all duration-300 my-2 rounded-sm"
              onClick={handleUnblockUser}>
              Unblock User
            </button>
          ) : (
            <button
              className="bg-[rgba(230,74,105,0.553)] hover:bg-[rgba(230,74,105,0.753)] mx-4 p-2 text-[1rem] transition-all duration-300 my-2 rounded-sm"
              onClick={() => setShowBlockConfirm(true)}>
              Block User
            </button>
          )}

          <button className="bg-[rgba(230,74,105,0.553)] hover:bg-[rgba(230,74,105,0.753)] mx-4 p-2 text-[1rem]  my-2 rounded-sm" onClick={() => setShowDeleteConfirm(true)}>
            Delete Chat
          </button>

          {showBlockConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center text-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-80 text-black">
                <h2 className="text-lg font-semibold mb-4">Block user?</h2>
                <p className="mb-4">Are you sure you want to block {activeUser.username}?</p>
                <div className="flex flex-col gap-2 justify-center">
                  <button
                    className="px-4 py-2 bg-red-500 text-white rounded-md"
                    onClick={handleBlockUser}>
                    Confirm Block
                  </button>
                  <button
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md"
                    onClick={() => setShowBlockConfirm(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center text-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-80 text-black">
                <h2 className="text-lg font-semibold mb-4">Delete all chats?</h2>
                <p className="mb-4">Are you sure you want to delete all chats? This action is irreversible</p>
                <div className="flex flex-col gap-2 justify-center">
                  <button
                    className="px-4 py-2 bg-red-500 text-white rounded-md"
                    onClick={handleDeleteChat}>
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
        </>
      )}
    </section>
  );
}

export default Details;
