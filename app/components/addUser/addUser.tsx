import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { fetchAllUsers } from "@/lib/getUsers";
import { RecordModel } from "pocketbase";
import { useAuth } from "@/lib/useAuth";
import pb from "@/lib/pocketbase";
import UserAvatar from "../Avatars/userAvatar";

type headerProp = {
  setAdd: React.Dispatch<React.SetStateAction<boolean>>;
};

function AddUser({ setAdd }: headerProp) {
  const [usersList, setUserList] = useState<RecordModel[]>([]);
  const { user } = useAuth();
  const [addedUsers, setAddedUsers] = useState<RecordModel[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<RecordModel[]>([]);

  console.log("here are the added users", addedUsers);

  useEffect(() => {
    if (!user?.id) return;


    const abortController = new AbortController();

    const loadData = async () => {
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
        // Only log errors that aren't from request cancellation
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.error("Error loading users or contacts:", err);
        }
      }
    };

    loadData();

    // Cleanup function to cancel pending requests when component unmounts
    return () => {
      abortController.abort();
    };
  }, [user]);

  const handleAddUser = async (contactUser: RecordModel) => {
    try {
      await pb.collection("contacts").create({
        owner: user?.id, // Use the logged-in user's ID as owner
        contact: contactUser.id, // Use the selected user's ID as contact
      });

      // Re-fetch contacts after successful addition
      const updatedContacts = await pb.collection("contacts").getFullList({
        filter: `owner = "${user?.id}"`,
        expand: "contact",
        $autoCancel: false,
      });

      // Update the state with new contacts
      const newContacts = updatedContacts
        .map((rec) => rec.expand?.contact)
        .filter((contact): contact is RecordModel => !!contact);
      setAddedUsers(newContacts);

      // Remove the added user from the usersList
      setUserList((prev) => prev.filter((u) => u.id !== contactUser.id));
    } catch (err) {
      console.error("Failed to add contact:", err);
    }
  };

  useEffect(() => {
    let newArray: React.SetStateAction<RecordModel[]> = [];
    usersList.map((user) => {
      if (newArray.includes(user)) return;
      let newName = user.username;
      if (newName.includes(searchInput)) {
        newArray.push(user);
      }
    });
    setSearchResults(newArray);
  }),
    [searchInput];
  return (
    <div className="absolute bg-[rgba(17,25,40)] w-[400px] top-[20%] left-[30%] rounded-md flex flex-col gap-2 z-30 h-[60%]">
      <input
        type="text"
        placeholder="search"
        onChange={(e) => setSearchInput(e.target.value)}
        value={searchInput}
        className=" rounded-lg  h-[40px] mx-3 my-7 text-[20px] text-black  px-5 py-4 border-none outline-none placeholder:opacity-60 w-auto"
      />
      {usersList.length === 0 && (
        <div className="w-full h-[100px] flex items-center justify-center">
          <span className="text-white text-[20px] font-semibold ">No users found.</span>
        </div>
      )}
      <div className="h-full overflow-scroll">
        {searchInput ? (
          searchResults.length === 0 ? (
            <div className="w-full h-[100px] flex items-center justify-center p-3 text-center">
              <span className="text-white text-[20px] font-semibold ">{'The user "'+ searchInput+'" does not exist try another name' }</span>
            </div>
          ) : (
            searchResults.map((user) => (
              <div
                key={user.id}
                className="flex p-3 items-center px-5 gap-4 border-b-[1px] border-[rgba(255,255,255,0.3)] bg-[rgba(17,25,40)] hover:bg-[rgba(255,255,255,0.1)] h-auto">
                <UserAvatar avatarUser={user}/>
                <div className="flex justify-between items-center w-full">
                  <span className="font-bold flex-1">{user.username}</span>
                  <span
                    className="bg-[#5182fe] p-4 rounded-md cursor-pointer"
                    onClick={() => {
                      handleAddUser(user);
                      setAdd(false);
                    }}>
                    Add user
                  </span>
                </div>
              </div>
            ))
          )
        ) : (
          usersList.map((user) => (
            <div
              key={user.id}
              className="flex p-3 items-center px- gap-4 border-b-[1px] border-[rgba(255,255,255,0.3)] bg-[rgba(17,25,40)] hover:bg-[rgba(255,255,255,0.1)] h-auto">
              <UserAvatar avatarUser={user}/>
              <div className="flex justify-between items-center w-full">
                <span className="font-bold flex-1">{user.username}</span>
                <span
                  className="bg-[#5182fe] p-4 rounded-md cursor-pointer"
                  onClick={() => {
                    handleAddUser(user);
                    setAdd(false);
                  }}>
                  Add user
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AddUser;
