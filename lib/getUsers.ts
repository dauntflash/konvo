import pb from "./pocketbase";

export const fetchAllUsers = async ({ signal }: { signal?: AbortSignal } = {}) => {
  try {
    const records = await pb.collection("users").getFullList({
      requestKey: null,
      signal,
    });
    return records;
  } catch (error) {
    throw error; // let caller decide how to handle isAbort
  }
};