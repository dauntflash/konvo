import { useRef, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
// @ts-ignore: side-effect import of CSS without type declarations
import "react-toastify/dist/ReactToastify.css";
import { SignUp } from "@/lib/auth/signUp";
import { Login } from "@/lib/auth/login";
import { useAuth } from "@/lib/useAuth";
import Loader from "../loader/loader";
import emailConfirmation from "../../resetPassword/page";
import Link from "next/link";

function Authentication() {
  const { isAuthenticated, setIsAuthenticated } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
      case "success":
        return toast.success(message, toastOptions);
      case "error":
        return toast.error(message, toastOptions);
      case "loading":
        return toast.loading(message, toastOptions);
    }
  };

  const clearForm = () => {
    setEmail("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setLoginEmail("");
    setLoginPassword("");
  };

  const handleErrors = (error: any) => {
    if (!error) return "An unknown error occurred";

    if (error.response?.data) {
      const data = error.response.data;
      const firstKey = Object.keys(data)[0];
      if (data[firstKey]?.message) {
        return data[firstKey].message;
      }
    }

    if (error.response?.message) {
      return error.response.message;
    }

    if (typeof error.message === "string") {
      return error.message;
    }

    return "Something went wrong. Please try again.";
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setIsLoading(true);
      showToast("Creating account...", "loading");

      const user = await SignUp(email, password, username);

      if (user) {
        toast.dismiss();
        await new Promise((resolve) => {
          toast.success("Account created successfully!", {
            position: "top-center",
            autoClose: 2000,
            onClose: () => resolve(null),
          });
        });
        clearForm();
        setIsLogin(true); // Show login form after signup
      }
    } catch (error) {
      toast.dismiss();
      const message = error instanceof Error ? error.message : "Signup failed";
      showToast(message, "error");
      console.error("Signup error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      showToast("Logging in...", "loading");

      await Login(loginEmail, loginPassword);

      toast.dismiss();

      const promise = new Promise((resolve) => {
        toast.success("Logged in successfully!", {
          position: "top-center",
          autoClose: 2000,
          onClose: () => resolve(null),
        });
      });

      await promise;

      setIsLoading(false);
      clearForm();
      setIsAuthenticated(true);
    } catch (error: any) {
      setIsLoading(false);
      toast.dismiss();

      console.error("Login error:", error);
      const errorMessage = handleErrors(error);
      showToast(errorMessage, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden">
      {isLoading && <Loader size="small" />}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        toastClassName="backdrop-blur-md"
      />
      <div
        className={`absolute top-0 left-0 w-full h-full transition-transform duration-700 ease-in-out ${isLogin ? "translate-x-0" : "-translate-x-full"
          }`}>
        {
          <div className="w-full h-full flex justify-between">
            <div className="flex-1 my-8 sm:my-[5rem] px-4 sm:px-0">
              <form onSubmit={handleLogin} className="text-white rounded-lg p-3 sm:p-5 w-full sm:w-[80%] md:w-[60%] mx-auto">
                <h1 className="font-bold text-xl sm:text-2xl md:text-[30px] text-center p-2 sm:p-3 mb-6 sm:mb-[4rem]">Welcome Back</h1>
                <div className="inputDiv">
                  <input
                    type="email"
                    placeholder="Email"
                    className="inputStyle"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="inputDiv">
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    placeholder="Password"
                    className="inputStyle"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                  <div
                    className="text-[20px] cursor-pointer px-3"
                    onClick={() => setShowLoginPassword((prev) => !prev)}>
                    {showLoginPassword ? (
                      <span className="bi bi-eye-slash"></span>
                    ) : (
                      <span className="bi bi-eye"></span>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className={`btnStyle ${isLoading ? "cursor-not-allowed opacity-70" : ""}`}
                  disabled={isLoading}>
                  LOGIN
                </button>
                <div className="text-xs sm:text-sm md:text-[15px] text-center italic">
                  Forgot your password?{" "}
                  <span
                    onClick={() => {
                      clearForm()
                    }}
                  >
                    <Link href="/emailConfirmation" className="text-[#5182fe] cursor-pointer">
                    Reset it here
                    </Link>
                  </span>
                </div>
              </form>
            </div>

            <div className="hidden sm:flex sidePanel">
              <h1 className="font-bold text-sm md:text-[20px] text-center">
                Don't have an account? <br /> Please Sign up!
              </h1>
              <button
                onClick={() => {
                  setIsLogin(false);
                  clearForm();
                }}
                className="toggleBtn">
                SIGN UP
              </button>
            </div>
          </div>
        }
        {/* Login Form */}
      </div>

      {/* Sign Up Form */}
      <div
        className={`absolute top-0 left-full w-full h-full transition-transform duration-700 ease-in-out ${isLogin ? "translate-x-0" : "-translate-x-full"
          }`}>
        <div className="w-full h-full flex flex-col-reverse sm:flex-row-reverse justify-between">
          <div className="flex-1 my-8 sm:my-[5rem] px-4 sm:px-0">
            <form onSubmit={handleSignUp} className="text-white rounded-lg p-3 sm:p-5 w-full sm:w-[80%] md:w-[60%] mx-auto">
              <h1 className="font-bold text-xl sm:text-2xl md:text-[30px] text-center p-2 sm:p-3 mb-4 sm:mb-[2rem]">
                Create your Account
              </h1>
              <div className="inputDiv">
                <input
                  type="text"
                  placeholder="Username"
                  className="inputStyle"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="off"
                />
              </div>
              <div className="inputDiv">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="inputStyle"
                  required
                  autoComplete="off"
                />
              </div>

              <div className="inputDiv">
                <input
                  type={showSignUpPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="inputStyle"
                  required
                  autoComplete="off"
                />
                <div
                  className="text-[20px] cursor-pointer px-3"
                  onClick={() => setShowSignUpPassword((prev) => !prev)}>
                  {showSignUpPassword ? (
                    <span className="bi bi-eye-slash"></span>
                  ) : (
                    <span className="bi bi-eye"></span>
                  )}
                </div>
              </div>
              <div className="inputDiv">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  className="inputStyle"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="off"
                />
                <div
                  className="text-[20px] cursor-pointer px-3"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}>
                  {showConfirmPassword ? (
                    <span className="bi bi-eye-slash"></span>
                  ) : (
                    <span className="bi bi-eye"></span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className={`btnStyle ${isLoading ? "cursor-not-allowed opacity-70" : ""}`}
                disabled={isLoading}>
                SIGN UP
              </button>
            </form>
          </div>

          <div className="hidden sm:flex sidePanel">
            <h1 className="font-bold text-sm md:text-[20px] text-center">
              Already have an account? <br /> Please Login!
            </h1>
            <button
              onClick={() => {
                setIsLogin(true);
                clearForm();
              }}
              className="toggleBtn">
              LOGIN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Authentication;
