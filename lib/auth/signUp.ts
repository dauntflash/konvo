import pb from "../pocketbase";


export async function isPocketBaseAvailable(): Promise<boolean> {
  try {
    await pb.health.check();
    return true;
  } catch {
    return false;
  }
}

export async function SignUp(email: string, password: string, username: string) {
  try {
    if (!email || !password || !username) {
      throw new Error("All fields are required");
    }

    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }
    if (password.toLocaleLowerCase() === username.toLocaleLowerCase() || password.toLocaleLowerCase() === email.toLocaleLowerCase()) {
      throw new Error("Password cannot be the same as username or email");
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error("Username can only contain letters, numbers, and underscores");
    }
    if (username.length < 3 || username.length > 20) {
      throw new Error("Username must be between 3 and 20 characters long");
    }
    if (!(await isPocketBaseAvailable())) {
      throw new Error("PocketBase server offline. Make sure an instance is running and try again");
    }
    const emailExists = await pb.collection("users").getList(1, 1, {
      filter: `email = "${email}"`,
    });

    if (emailExists.totalItems > 0) {
      throw new Error("Email already registered");
    }

    const usernameExists = await pb.collection("users").getList(1, 1, {
      filter: `username = "${username}"`,
    });

    if (usernameExists.totalItems > 0) {
      throw new Error("Username already taken");
    }

    const data = {
      email,
      password,
      passwordConfirm: password, 
      username,
      emailVisibility: true, 
      verified: false, 
      showChatsProfilePic: true,
      showOnlineContacts: true,
    };

    const createdUser = await pb.collection("users").create(data);

    return createdUser;
  } catch (error) {
    console.error("Signup error details:", error);

    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw new Error("Failed to create account. Please try again.");
  }
}
