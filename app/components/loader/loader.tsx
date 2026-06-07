import React from "react";

type LoaderProps = {
  size?: "small" | "medium" | "large";
  fullScreen?: boolean;
};

export default function Loader({ size = "medium", fullScreen = false }: LoaderProps) {
  const sizeClasses = {
    small: "h-4 w-4 border-2",
    medium: "h-8 w-8 border-2",
    large: "h-12 w-12 border-3",
  };

  return (
    <div
      className={`flex items-center justify-center ${
        fullScreen ? "h-screen w-screen" : "h-full w-full"
      }`}>
      <div
        className={`animate-spin rounded-full border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent ${sizeClasses[size]}`}
      />
    </div>
  );
}
