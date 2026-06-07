import pb from "../pocketbase";

// Initial health check to make sure there's an instance of PocketBase running
export async function isPocketBaseAvailable(): Promise<boolean> {
  try {
    await pb.health.check();
    return true;
  } catch {
    return false;
  }
}

export async function Login(email: string, password: string) {
  try {
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    if (!email.includes("@")) {
      throw new Error("Please enter a valid email address");
    }

    // Check PocketBase connectivity
    if (!(await isPocketBaseAvailable())) {
      throw new Error("PocketBase server offline. Make sure an instance is running and try again.");
    }

    try {
      const emailCheck = await pb.collection("users").getList(1, 1, {
        filter: `email = "${email}"`,
      });

      if (emailCheck.totalItems === 0) {
        throw new Error("No account found with this email address");
      }
    } catch (checkError) {
      // If we can't check the email (network/db issues), continue with auth attempt
      console.warn("Could not verify email existence:", checkError);
    }

    // Attempt authentication
    const user = await pb.collection("users").authWithPassword(email, password);
    return user;
    
  } catch (error: any) {
    console.error("Login error details:", error);

    // Handle connectivity
    if (error.name === "TypeError" || error.message?.includes("fetch")) {
      throw new Error("Unable to connect to server. Please check your internet or server status.");
    }

    // Handle PB errors
    if (error.status) {
      switch (error.status) {
        case 400:
          if (error.response?.message?.includes("Failed to authenticate")) {
            throw new Error("Incorrect email or password");
          }
          const fields = error.response?.data || {};
          if (fields.email) throw new Error("Invalid email format");
          if (fields.password) throw new Error("Invalid password");
          throw new Error("Invalid login credentials");

        case 401:
          throw new Error("Authentication failed. Please check your credentials.");
        case 403:
          throw new Error("Access denied. Your account may need verification.");
        case 404:
          throw new Error("Account not found. Check your email or sign up.");
        case 429:
          throw new Error("Too many attempts. Please wait and try again.");
        case 500:
        case 503:
          throw new Error("Server error. Try again later.");
        default:
          throw new Error(`Unexpected error (${error.status}). Please try again.`);
      }
    }

    if (error instanceof Error) throw error;

    throw new Error("Login failed. Please try again.");
  }
}
