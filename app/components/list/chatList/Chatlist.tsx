"use client";
import React, { useEffect, useState } from "react";
import pb from "@/lib/pocketbase";
import { RecordModel } from "pocketbase";
import { useAuth } from "@/lib/useAuth";
import UserAvatar from "../../Avatars/userAvatar";
import OnlineAvatar from "../../Avatars/onlineAvatar";
import Loader from "../../loader/loader";
import { useSound } from "../../useSound/useSound";

type Props = {
  activeUser: any;
  setActiveUser: any;
};

type UnreadMessage = {
  id: string;
  sender: string;
  receiver: string;
  text?: string;
  file?: string;
  timestamp: string;
  status: "sent" | "delivered" | "seen";
  hiddenFor?: string[];
};

function Chatlist({ activeUser, setActiveUser }: Props) {
  const [isActiveId, setIsActiveId] = useState("");
  const [contacts, setContacts] = useState<RecordModel[]>([]);
  const [unreadMessages, setUnreadMessages] = useState<UnreadMessage[]>([]);
  const [latestMessages, setLatestMessages] = useState<{ [contactId: string]: UnreadMessage }>({});
  const { user } = useAuth();
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<RecordModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const showOnlineContacts = user?.showOnlineContacts;
  const [blockedUsers, setBlockedUsers] = useState<Set<string>>(new Set());
  const playSound = useSound("/receive.wav", 1, "notification_sound");
  const fetchBlockedUsers = async () => {
    if (!user?.id) return;
    try {
      const blocks = await pb.collection("blocks").getFullList({
        filter: `blocker = "${user.id}" || blocked = "${user.id}"`,
        $autoCancel: false,
      });

      const blockedIds = new Set<string>();
      blocks.forEach((block) => {
        if (block.blocker === user.id) {
          blockedIds.add(block.blocked);
        }
        if (block.blocked === user.id) {
          blockedIds.add(block.blocker);
        }
      });

      setBlockedUsers(blockedIds);
    } catch (error) {
      console.error("Failed to fetch blocked users:", error);
    }
  };

  const isBlocked = (contactId: string) => {
    return blockedUsers.has(contactId);
  };

  const fetchContacts = async () => {
    if (!user?.id) return;
    try {
      const records = await pb.collection("contacts").getFullList({
        filter: `owner = "${user.id}"`,
        expand: "contact",
        $autoCancel: false,
      });
      const contactsData = records
        .map((rec) => rec.expand?.contact)
        .filter((contact): contact is RecordModel => !!contact);

      const uniqueContacts = contactsData.filter(
        (contact, index, self) => index === self.findIndex((c) => c.id === contact.id)
      );

      setContacts(uniqueContacts);
       
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
    }
  };

  const fetchMessages = async () => {
    if (!user?.id) return;
    try {
      const records = await pb.collection("messages").getFullList({
        filter: `(sender = "${user.id}" || receiver = "${user.id}") && hiddenFor !~ "${user.id}"`,
        sort: "-timestamp",
        $autoCancel: false,
      });
      const allMessages = records as unknown as UnreadMessage[];

      const unread = allMessages.filter((msg) => msg.receiver === user.id && msg.status !== "seen");
      setUnreadMessages(unread);

      const currentContacts = await pb.collection("contacts").getFullList({
        filter: `owner = "${user.id}"`,
        $autoCancel: false,
      });
      const existingContactIds = new Set(currentContacts.map((rec) => rec.contact));

      const sendersWhoTextedMe = new Set();
      allMessages.forEach((msg) => {
        if (msg.receiver === user.id && msg.sender !== user.id) {
          sendersWhoTextedMe.add(msg.sender);
        }
      });

      let newContactsAdded = false;
      for (const senderId of sendersWhoTextedMe) {
        if (!existingContactIds.has(senderId)) {
          try {
            await pb.collection("contacts").create({
              owner: user.id,
              contact: senderId,
            });
             
            newContactsAdded = true;
          } catch (error) {
            console.error(`Failed to add contact ${senderId}:`, error);
          }
        }
      }

      if (newContactsAdded) {
        await fetchContacts();
      }

      const latest: { [contactId: string]: UnreadMessage } = {};
      for (const msg of allMessages) {
        const contactId = msg.sender === user.id ? msg.receiver : msg.sender;
        if (!latest[contactId]) {
          latest[contactId] = msg;
        }
      }
      setLatestMessages(latest);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const getUnreadCount = (userId: string): number => {
    return unreadMessages.filter((msg) => msg.sender === userId).length;
  };

  const getLatestMessage = (contactId: string): string => {
    const draft = typeof window !== "undefined" ? localStorage.getItem(`draft_${contactId}`) : null;
    if (draft) return `Draft: ${draft}`;

    const message = latestMessages[contactId];
    if (!message) return "No messages";
    if (message.file) {
      if (message.sender === user?.id) {
        return message.text ? `You:📎 ${message.text}` : "You: 📎 Attachment";
      }
      return message.text ? `📎 ${message.text}` : "📎 Attachment";
    }
    if (message.sender === user?.id) {
      return `You: ${message.text || "No message content"}`;
    }
    return message.text || "No message content";
  };

  useEffect(() => {
    fetchContacts();
    fetchMessages();
    fetchBlockedUsers();

    let unsubscribeContacts: (() => void) | null = null;
    let unsubscribeUsers: (() => void) | null = null;
    let unsubscribeMessages: (() => void) | null = null;
    let unsubscribeBlocks: (() => void) | null = null;

    const subscribeToContacts = async () => {
      try {
        unsubscribeContacts = await pb.collection("contacts").subscribe("*", (e) => {
          if (e.record.owner === user?.id) {
             
            fetchContacts();
          }
        });
      } catch (error) {
        console.error("Failed to subscribe to contacts:", error);
      }
    };

    const subscribeToUsers = async () => {
      try {
        unsubscribeUsers = await pb.collection("users").subscribe("*", (e) => {
          const updatedUser = e.record;
          setContacts((prev) =>
            prev.map((contact) =>
              contact.id === updatedUser.id ? { ...contact, ...updatedUser } : contact
            )
          );
          if (activeUser?.id === updatedUser.id) {
            setActiveUser({ ...updatedUser });
          }
        });
      } catch (error) {
        console.error("Failed to subscribe to users:", error);
      }
    };

    const subscribeToBlocks = async () => {
      try {
        unsubscribeBlocks = await pb.collection("blocks").subscribe("*", (e) => {
          const blockRecord = e.record;
          const isRelevant = blockRecord.blocker === user?.id || blockRecord.blocked === user?.id;

          if (isRelevant) {
            fetchBlockedUsers();
          }
        });
      } catch (error) {
        console.error("Failed to subscribe to blocks:", error);
      }
    };

    const subscribeToMessages = async () => {
      try {
        unsubscribeMessages = await pb.collection("messages").subscribe("*", async (e) => {
          const message = e.record as unknown as UnreadMessage;
          const isRelevant = message.receiver === user?.id || message.sender === user?.id;
          if (!isRelevant) return;

          if (message.hiddenFor?.includes(user?.id)) {
            const contactId = message.sender === user.id ? message.receiver : message.sender;
            setLatestMessages((prev) => {
              const newLatest = { ...prev };
              delete newLatest[contactId];
              return newLatest;
            });
            setUnreadMessages((prev) => prev.filter((msg) => msg.id !== message.id));
            return;
          }

          const contactId = message.sender === user.id ? message.receiver : message.sender;

          if (e.action === "create") {
            if (message.receiver === user.id && message.sender !== user.id) {
              playSound();
              try {
                const existingContact = await pb
                  .collection("contacts")
                  .getFirstListItem(`owner = "${user.id}" && contact = "${message.sender}"`, {
                    $autoCancel: false,
                  })
                  .catch(() => null);

                if (!existingContact) {
                  await pb.collection("contacts").create({
                    owner: user.id,
                    contact: message.sender,
                  });
                  await fetchContacts();
                }
              } catch (error) {
                console.error(`Failed to add contact ${message.sender}:`, error);
              }
            }

            setLatestMessages((prev) => {
              const currentLatest = prev[contactId];
              if (
                !currentLatest ||
                new Date(message.timestamp) > new Date(currentLatest.timestamp)
              ) {
                return { ...prev, [contactId]: message };
              }
              return prev;
            });
            if (message.receiver === user.id && message.status !== "seen") {
              setUnreadMessages((prev) => {
                const exists = prev.some((msg) => msg.id === message.id);
                if (exists) return prev;
                return [...prev, message];
              });
            }
          } else if (e.action === "update") {
            setLatestMessages((prev) => {
              if (prev[contactId]?.id === message.id) {
                return { ...prev, [contactId]: message };
              }
              return prev;
            });

            setUnreadMessages((prev) => {
              if (message.status === "seen") {
                return prev.filter((msg) => msg.id !== message.id);
              }

              const exists = prev.some((msg) => msg.id === message.id);
              if (exists) {
                return prev.map((msg) => (msg.id === message.id ? message : msg));
              }

              if (
                message.receiver === user.id &&
                (message.status === "sent" || message.status === "delivered")
              ) {
                return [...prev, message];
              }

              return prev;
            });
          } else if (e.action === "delete") {
             

            setUnreadMessages((prev) => prev.filter((msg) => msg.id !== message.id));

            setLatestMessages((prev) => {
              if (prev[contactId]?.id === message.id) {
                fetchLatestMessageForContact(contactId);
                const newLatest = { ...prev };
                delete newLatest[contactId];
                return newLatest;
              }
              return prev;
            });
          }
        });
      } catch (error) {
        console.error("Failed to subscribe to messages:", error);
      }
    };

    const fetchLatestMessageForContact = async (contactId: string) => {
      try {
        const messages = await pb.collection("messages").getList(1, 1, {
          filter: `(sender = "${user?.id}" && receiver = "${contactId}") || (sender = "${contactId}" && receiver = "${user?.id}")`,
          sort: "-timestamp",
          $autoCancel: false,
        });

        if (messages.items.length > 0) {
          const latestMsg = messages.items[0] as unknown as UnreadMessage;
          setLatestMessages((prev) => ({
            ...prev,
            [contactId]: latestMsg,
          }));
        } else {
          setLatestMessages((prev) => {
            const newLatest = { ...prev };
            delete newLatest[contactId];
            return newLatest;
          });
        }
      } catch (error) {
        console.error(`Failed to fetch latest message for contact ${contactId}:`, error);
      }
    };
    subscribeToContacts();
    subscribeToUsers();
    subscribeToMessages();
    subscribeToBlocks();

    return () => {
      if (unsubscribeContacts) unsubscribeContacts();
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeMessages) unsubscribeMessages();
      if (unsubscribeBlocks) unsubscribeBlocks();
       
    };
  }, [user]);

  useEffect(() => {
     
    if (activeUser?.id) {
      setIsActiveId(activeUser.id);
    }

    let unsubscribeActiveUser: (() => void) | undefined;
    if (activeUser?.id) {
       
      pb.collection("users")
        .subscribe(activeUser.id, ({ record }) => {
           
          handleActiveUser({
            id: record.id,
            username: record.username as string,
            is_online: record.is_online as boolean,
            last_seen: record.last_seen as string,
            created: record.created as string,
            avatar: record.avatar,
            collectionId: "",
            collectionName: "",
          });
        })
        .then((unsub) => {
          unsubscribeActiveUser = unsub;
        })
        .catch((error) => {
          console.error("Failed to subscribe to active user:", error);
        });
    }
    return () => {
      if (unsubscribeActiveUser) {
         
        unsubscribeActiveUser();
      }
    };
  }, [activeUser?.id]);

  const handleActiveUser = (contact: RecordModel) => {
     
    setActiveUser(contact);
  };

  useEffect(() => {
    setUnreadMessages((prev) => {
      const uniqueMessages = Array.from(new Map(prev.map((msg) => [msg.id, msg])).values());
      return uniqueMessages;
    });
  }, [unreadMessages.length]);

  useEffect(() => {
     
    contacts.forEach((contact) => {
      const count = getUnreadCount(contact.id);
      if (count > 0) {
         
      }
    });
  }, [unreadMessages, contacts]);

  const sortedContacts = [...contacts].sort((a, b) => {
    const timestampA = latestMessages[a.id]?.timestamp;
    const timestampB = latestMessages[b.id]?.timestamp;

    if (!timestampA) return 1;
    if (!timestampB) return -1;

    return new Date(timestampB).getTime() - new Date(timestampA).getTime();
  });

  useEffect(() => {
    let newArray: React.SetStateAction<RecordModel[]> = [];
    {
      contacts.map((contact) => {
        if (newArray.includes(contact)) {
          return;
        }
        let contactName = contact.username;

        if (contactName.toLowerCase().includes(searchInput.toLowerCase())) {
          newArray.push(contact);
        }
      });
    }
    setSearchResults(newArray);
  }, [searchInput]);

  useEffect(() => {
    const loadContacts = async () => {
      setIsLoading(true);
      try {
        await fetchContacts();
      } finally {
        setIsLoading(false);
      }
    };

    loadContacts();
  }, [user?.id]);

  const savedDraft = localStorage.getItem(`draft_${activeUser.id}`);

  return (
    <section className="flex-1 mt-2 overflow-y-auto h-[100%] scrollbar-overlay w-auto overflow-x-hidden">
      {isLoading ? (
        <Loader size="medium" />
      ) : (
        <>
          {showOnlineContacts && (
            <div className="px-2 flex  overflow-auto gap-6 w-full">
              {sortedContacts.map((contact) =>
                contact.is_online && !isBlocked(contact.id) ? (
                  <div
                    key={contact.id}
                    className="flex flex-col items-center justify-center relative ">
                    <div className="">
                      <OnlineAvatar avatarUser={contact} />
                    </div>
                    <div className="h-3 w-3 rounded-[50%] bg-[#5182fe] absolute top-1 right-1"></div>

                    <span className="text-[0.8rem] font-semibold w-[60px] text-center truncate">
                      {contact.username}
                    </span>
                  </div>
                ) : null
              )}
            </div>
          )}

          <div className="flex px-4 pt-[1rem] justify-between items-center gap-4 ">
            <div className="flex border-[rgba(255,255,255,0.26)] h-max py-2 px-4 rounded-xl justify-center items-center gap-3 w-full border-[1px] dark:border-[rgba(17,25,40,0.26)] dark:text-[rgba(17,25,40)]">
              <input
                type="text"
                className="bg-transparent border-none outline-none placeholder:opacity-60 w-full text-[1.1rem] pr-2 rounded-xl"
                placeholder="search..."
                onChange={(e) => setSearchInput(e.target.value)}
                value={searchInput}
              />
              {searchInput && (
                <div
                  className="bi bi-x h-5 w-5  flex justify-center items-center rounded-full cursor-pointer"
                  onClick={() => setSearchInput("")}></div>
              )}
            </div>
          </div>
          <div className="pt-2 ">
            {contacts.length === 0 && (
              <div className="w-full h-[100px] flex items-center justify-center">
                <span className="text-white text-[1.4rem] font-semibold">No users found.</span>
              </div>
            )}
            {searchInput ? (
              searchResults.length > 0 ? (
                searchResults.map((contact) => {
                  const unreadCount = getUnreadCount(contact.id);
                  const latestMessage = getLatestMessage(contact.id);
                  const latestMessageDate = (() => {
                    const timestamp = latestMessages[contact.id]?.timestamp;
                    if (!timestamp) return "";

                    const now = new Date();
                    const messageDate = new Date(timestamp);

                    const isToday =
                      messageDate.getFullYear() === now.getFullYear() &&
                      messageDate.getMonth() === now.getMonth() &&
                      messageDate.getDate() === now.getDate();

                    return isToday
                      ? messageDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                      : messageDate.toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      });
                  })();
                  return (
                    <div
                      key={contact.id}
                      onClick={() => {
                        setIsActiveId(contact.id);
                        handleActiveUser(contact);
                      }}
                      className={`${isActiveId === contact.id
                          ? "bg-[rgba(255,255,255,0.2)] dark:bg-gray-300 bg-opacity-65"
                          : "hover:bg-[rgba(255,255,255,0.1)]"
                        } flex p-3 items-center px-8 gap-4 border-b-[1px] border-[rgba(255,255,255,0.1)] cursor-pointer relative w-auto`}>
                      <UserAvatar avatarUser={contact} />
                      {contact.is_online && !isBlocked(contact.id) && (
                        <div className="h-3 w-3 rounded-[50%] bg-[#5182fe] absolute top-5 left-[4.5rem]"></div>
                      )}
                      <div className="flex flex-col justify-between flex-1 w-[50%]">
                        <div className="flex justify-between items-center relative">
                          <span className="font-bold text-[1rem] w-[75%] truncate">
                            {contact.username}
                          </span>
                          <span className="text-xs text-gray-400 absolute right-0 flex-shrink-0">
                            {latestMessageDate}
                          </span>
                        </div>
                        <div className="flex justify-between items-center relative mr-9">
                          <span
                            className={`${unreadCount > 0 ? "" : "text-gray-400"
                              } flex-shrink-0  w-[100%] truncate`}>
                            {latestMessage}
                          </span>
                          <div className="flex-shrink-0">
                            {unreadCount > 0 && (
                              <span className="bg-[#5182fe] rounded-full flex items-center justify-center text-center h-6 w-6 text-[1rem]">
                                {getUnreadCount(contact.id)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="w-full h-[100px] flex items-center justify-center">
                  <h3 className="text-white text-lg font-medium mb-2">
                    {'No results for "' + searchInput + '" try something else'}
                  </h3>
                </div>
              )
            ) : (
              sortedContacts.map((contact) => {
                const unreadCount = getUnreadCount(contact.id);
                const latestMessage = getLatestMessage(contact.id);
                const latestMessageDate = (() => {
                  const timestamp = latestMessages[contact.id]?.timestamp;

                  if (!timestamp) return "";

                  const messageDate = new Date(timestamp);
                  const today = new Date();
                  const yesterday = new Date(today);
                  yesterday.setDate(yesterday.getDate() - 1);

                  const messageDateOnly = new Date(
                    messageDate.getFullYear(),
                    messageDate.getMonth(),
                    messageDate.getDate()
                  );
                  const todayOnly = new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    today.getDate()
                  );
                  const yesterdayOnly = new Date(
                    yesterday.getFullYear(),
                    yesterday.getMonth(),
                    yesterday.getDate()
                  );

                  if (messageDateOnly.getTime() === todayOnly.getTime()) {
                    return messageDate.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                  } else if (messageDateOnly.getTime() === yesterdayOnly.getTime()) {
                    return "Yesterday";
                  } else {
                    const daysDiff = Math.floor(
                      (todayOnly.getTime() - messageDateOnly.getTime()) / (1000 * 60 * 60 * 24)
                    );

                    if (daysDiff <= 7 && daysDiff > 1) {
                      return messageDate.toLocaleDateString("en-US", { weekday: "long" });
                    } else {
                      return messageDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year:
                          messageDate.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
                      });
                    }
                  }
                })();
                return (
                  <div
                    key={contact.id}
                    onClick={() => {
                      setIsActiveId(contact.id);
                      handleActiveUser(contact);
                    }}
                    className={`${isActiveId === contact.id
                        ? "bg-[rgba(255,255,255,0.2)] dark:bg-gray-300 bg-opacity-65"
                        : "hover:bg-[rgba(255,255,255,0.1)]"
                      } flex p-3 items-center px-8 gap-4 border-b-[1px] border-[rgba(255,255,255,0.1)] cursor-pointer relative w-auto`}>
                    <UserAvatar avatarUser={contact} />
                    {contact.is_online && !isBlocked(contact.id) && (
                      <div className="h-3 w-3 rounded-[50%] bg-[#5182fe] absolute top-5 left-[4.5rem]"></div>
                    )}
                    <div className="flex flex-col justify-between flex-1 w-[50%]">
                      <div className="flex justify-between items-center relative">
                        <span className="font-bold text-[1rem] w-[65%] truncate">
                          {contact.username}
                        </span>
                        <span className="text-xs text-gray-400 absolute right-0 flex-shrink-0">
                          {latestMessageDate}
                        </span>
                      </div>
                      <div className="flex justify-between items-center relative mr-9">
                        <span
                          className={`${unreadCount > 0 ? "" : "text-gray-400"
                            } flex-shrink-0  w-[100%] truncate`}>
                          {latestMessage}
                        </span>
                        <div className="flex-shrink-0">
                          {unreadCount > 0 && (
                            <span className="bg-[#5182fe] rounded-full flex items-center justify-center text-center h-6 w-6 text-[0.75rem]">
                              {getUnreadCount(contact.id)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default Chatlist;
