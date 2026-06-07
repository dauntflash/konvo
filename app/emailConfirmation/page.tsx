'use client'

import pb from '@/lib/pocketbase';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react'
import { toast, ToastContainer } from 'react-toastify';

export default function emailConfirmation() {
  const [email, setEmail] = useState("");
  const router = useRouter();


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


 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!email) {
    showToast("Please enter your email address.", "error");
    return;
  }

  try {
    showToast("Sending reset email...", "loading");
    await pb.collection("users").requestPasswordReset(email);
    showToast("Reset email sent! Check your inbox.", "success");
    setEmail("");
  } catch (error) {
    showToast("Something went wrong. Please try again.", "error");
  }
}
  return (
    <div className='h-full w-full text-white'>
      <ToastContainer /> 
      <div className="w-full sm:w-[90%] md:w-[600px] flex flex-col items-start justify-center mx-auto mt-10 sm:mt-20 px-4 sm:px-0">
        <span className="bi bi-chevron-left text-[30px] cursor-pointer hover:text-blue-500 rounded-[100%] w-10 h-10 flex items-center justify-center hover:bg-gray-400" onClick={() => router.back()}></span>
        <form onSubmit={handleSubmit} className="w-full mt-8 pl-3">
          <h1 className="font-bold text-[30px]">Find your account</h1>
          <p className="text-[16px] mb-4">Enter your email address to search for your account.</p>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border-[1px] outline-none border-[rgba(255,255,255,0.5)] rounded-md font-extralight mb-4 bg-transparent"
          />
          <button
            type="submit"
            className="w-full p-3 bg-blue-500 text-white rounded-2xl hover:bg-blue-600 font-semibold">
            Continue
          </button>
        </form>
      </div>
    </div>
  )
}
