import pb from "./pocketbase";

export const fetchAllUsers = async ({ signal }: { signal?: AbortSignal } = {}) => {
  try {
    const records = await pb.collection("users").getFullList({
      $autoCancel: false,  
      signal, 
    });
    return records;
  } catch (error) {
    console.error("Failed to fetch users:", error);
    throw error;
  }
};
