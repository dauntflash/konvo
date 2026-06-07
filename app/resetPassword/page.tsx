'use client'

import pb from '@/lib/pocketbase';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useState } from 'react'
import { toast, ToastContainer } from 'react-toastify';

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

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
      case "success": return toast.success(message, toastOptions);
      case "error": return toast.error(message, toastOptions);
      case "loading": return toast.loading(message, toastOptions);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      showToast("Invalid or expired reset link.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match.", "error");
      return;
    }
    if (newPassword.length < 8) {
      showToast("Password must be at least 8 characters.", "error");
      return;
    }

    try {
      showToast("Resetting password...", "loading");
      await pb.collection("users").confirmPasswordReset(token, newPassword, confirmPassword);
      showToast("Password reset successful! Redirecting to login...", "success");
      setTimeout(() => router.replace("/"), 2000);
    } catch (error) {
      showToast("Invalid or expired reset link. Please try again.", "error");
    }
  };

  return (
    <div className='h-full w-full text-white'>
      <ToastContainer />
      <div className="w-full sm:w-[90%] md:w-[600px] flex flex-col items-start justify-center mx-auto mt-10 sm:mt-20 px-4 sm:px-0">
        <span
          className="bi bi-chevron-left text-[30px] cursor-pointer hover:text-blue-500 rounded-[100%] w-10 h-10 flex items-center justify-center hover:bg-gray-400"
          onClick={() => router.replace("/")}
        />
        <form onSubmit={handleSubmit} className="w-full mt-8 pl-3">
          <h1 className="font-bold text-[30px]">Reset your password</h1>
          <p className="text-[16px] mb-4">Enter your new password below.</p>

          <div className="w-full flex items-center border-[1px] border-[rgba(255,255,255,0.5)] rounded-md mb-4">
            <input
              type={showNewPassword ? "text" : "password"}
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="flex-1 p-3 outline-none bg-transparent font-extralight"
            />
            <div
              className="text-[20px] cursor-pointer px-3"
              onClick={() => setShowNewPassword(prev => !prev)}>
              {showNewPassword ? <span className="bi bi-eye-slash" /> : <span className="bi bi-eye" />}
            </div>
          </div>

          <div className="w-full flex items-center border-[1px] border-[rgba(255,255,255,0.5)] rounded-md mb-4">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="flex-1 p-3 outline-none bg-transparent font-extralight"
            />
            <div
              className="text-[20px] cursor-pointer px-3"
              onClick={() => setShowConfirmPassword(prev => !prev)}>
              {showConfirmPassword ? <span className="bi bi-eye-slash" /> : <span className="bi bi-eye" />}
            </div>
          </div>

          <button
            type="submit"
            className="w-full p-3 bg-blue-500 text-white rounded-2xl hover:bg-blue-600 font-semibold">
            Reset Password
          </button>
        </form>
      </div>
    </div>
  );
}