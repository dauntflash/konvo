import type { Metadata } from "next";
// @ts-ignore: no type declarations for this CSS module
import "bootstrap-icons/font/bootstrap-icons.css";
// @ts-ignore: side-effect CSS import has no type declarations in this project
import "./globals.css";
import SideBar from "./components/sideBar/sideBar";
import AuthWrapper from "./components/providers/AuthWrapper";

export const metadata: Metadata = {
  title: "Konvo App",
  description: "Konvo Application",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthWrapper>
          {/* Show on mobile/tablet — block message */}
          <div className="flex md:hidden h-screen w-screen flex-col items-center justify-center bg-[rgba(17,25,40,1)] text-white px-8 text-center gap-6">
            <i className="bi bi-laptop text-6xl text-[#5182fe]" />
            <h1 className="text-2xl font-bold">Desktop Only</h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              Konvo is designed for desktop use. Please open this app on a laptop or desktop computer for the best experience. Coming to mobile soon!
            </p>
          </div>

          {/* Show on desktop only */}
          <div className="hidden md:flex flex-row-reverse size-full overflow-hidden h-screen">
            <div className="flex-1 overflow-hidden">
              {children}
            </div>
            <div className="flex-shrink-0">
              <SideBar />
            </div>
          </div>
        </AuthWrapper>
      </body>
    </html>
  );
}