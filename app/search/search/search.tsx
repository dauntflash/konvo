"use client";

import React, { useEffect, useState } from "react";
import { fetchAllUsers } from "@/lib/getUsers";
import { RecordModel } from "pocketbase";
import { useAuth } from "@/lib/useAuth";
import pb from "@/lib/pocketbase";
import UserAvatar from "@/app/components/Avatars/userAvatar";

function Search() {
  const [usersList, setUserList] = useState<RecordModel[]>([]);
  const { user } = useAuth();
  const [addedUsers, setAddedUsers] = useState<RecordModel[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<RecordModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);


  useEffect(() => {
    if (!user?.id) return;

    const abortController = new AbortController();

    const loadData = async () => {
      setIsLoading(true);
      try {
        const allUsers = await fetchAllUsers({ signal: abortController.signal });

        const contactRecords = await pb.collection("contacts").getFullList({
          filter: `owner = "${user.id}"`,
          expand: "contact",
          $autoCancel: false,
        });

        const contacts = contactRecords
          .map((rec) => rec.expand?.contact)
          .filter((contact): contact is RecordModel => !!contact);
        setAddedUsers(contacts);

        const filteredUsers = allUsers.filter(
          (u) => u.id !== user.id && !contacts.some((c) => c.id === u.id)
        );

        setUserList(filteredUsers);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.error("Error loading users or contacts:", err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    return () => {
      abortController.abort();
    };
  }, [user]);

  const handleAddUser = async (contactUser: RecordModel) => {
    setAddingUserId(contactUser.id);
    try {
      await pb.collection("contacts").create({
        owner: user?.id,
        contact: contactUser.id,
      });

      const updatedContacts = await pb.collection("contacts").getFullList({
        filter: `owner = "${user?.id}"`,
        expand: "contact",
      });

      const newContacts = updatedContacts
        .map((rec) => rec.expand?.contact)
        .filter((contact): contact is RecordModel => !!contact);
      setAddedUsers(newContacts);

      setUserList((prev) => prev.filter((u) => u.id !== contactUser.id));
    } catch (err) {
      console.error("Failed to add contact:", err);
    } finally {
      setAddingUserId(null);
    }
  };

  useEffect(() => {
    if (!searchInput.trim()) {
      setSearchResults([]);
      return;
    }

    const filteredResults = usersList.filter((user) =>
      user.username.toLowerCase().includes(searchInput.toLowerCase())
    );
    setSearchResults(filteredResults);
  }, [searchInput, usersList]);

  const displayUsers = searchInput ? searchResults : usersList;

  return (
    <section className="px-2 sm:px-4 py-2 sm:py-3 w-full md:w-[400px] h-full flex flex-col">
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
          <h1 className="text-lg sm:text-2xl font-bold text-white">Discover People</h1>
        </div>
        <p className="text-gray-400 text-xs sm:text-sm">Find and connect with new people</p>
      </div>

      <div className="relative mb-4 sm:mb-6">
        <div className="absolute left-0 pl-2 flex items-center"></div>
        <input
          type="text"
          placeholder="Search by username..."
          className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border-gray-700 bg-transparent border-[1px] outline-none text-xs sm:text-sm rounded-xl text-white placeholder-gray-400 "
          onChange={(e) => setSearchInput(e.target.value)}
          value={searchInput}
        />
        {searchInput && (
          <div
            className="bi bi-x absolute inset-y-0 right-0 pr-2 sm:pr-3 flex items-center text-gray-400 hover:text-white cursor-pointer"
            onClick={() => setSearchInput("")}></div>
        )}
      </div>
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400 text-xs sm:text-sm">Loading users...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
            {displayUsers.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-8 sm:py-12">
                <div className="text-center px-2">
                  <h3 className="text-white text-sm sm:text-lg font-medium mb-1 sm:mb-2">
                    {searchInput ? `No users found for "${searchInput}"` : "No users available"}
                  </h3>
                  <p className="text-gray-400 text-xs sm:text-sm">
                    {searchInput
                      ? `Try searching for a different username`
                      : ""}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1 sm:space-y-2">
                {displayUsers.map((user, index) => (
                  <div
                    key={user.id}
                    className="group relative rounded-xl p-1 bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.2)] border border-gray-700/50 hover:border-gray-600"
                    style={{
                      animationDelay: `${index * 50}ms`,
                    }}>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <div className="relative flex-shrink-0">
                        <UserAvatar avatarUser={user} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-semibold truncate text-xs sm:text-sm">{user.username}</h4>
                        <h4 className="text-white truncate text-[8px] sm:text-[10px]">{user.about}</h4>
                      </div>

                      <button
                        onClick={() => handleAddUser(user)}
                        disabled={addingUserId === user.id}
                        className="bg-[#5182fe] text-white px-2 sm:px-4 py-1 rounded-lg transition-all duration-200 hover:scale-105 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm flex-shrink-0">
                        {addingUserId === user.id ? (
                          <>
                            <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full"></div>
                            <span className="hidden sm:inline">Adding...</span>
                          </>
                        ) : (
                          <>Chat</>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default Search;
