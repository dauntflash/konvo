import Link from "next/link";
import React from "react";

function Help() {
  return (
    <section className="size-full flex flex-col items-center justify-center">
      <div className="w-full h-full p-4 sm:p-6 overflow-auto">
        <div className="w-full mx-auto">
          {/* Header Section */}
          <div className="text-center mb-8 sm:mb-16">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-blue-700 rounded-full mb-4 sm:mb-6 shadow-lg">
              <span className="bi bi-chat-dots-fill text-2xl sm:text-3xl text-white"></span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-2 sm:mb-3 tracking-tight">Konvo Chat</h1>
            <p className="text-base sm:text-xl text-gray-200 mb-3 sm:mb-4">A Modern Chat Experience</p>
            <div className="inline-flex items-center px-4 py-2 bg-blue-800 text-blue-100 text-xs sm:text-sm font-semibold rounded-full shadow">
              Version 1.0
            </div>
          </div>

          {/* Contact Section */}
          <div className="rounded-3xl shadow-xl p-6 sm:p-10 backdrop-blur-sm flex flex-col items-center justify-center w-full">
            <div className="text-center mb-6 sm:mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">Let's Connect</h2>
              <p className="text-gray-200 text-sm sm:text-lg leading-relaxed max-w-lg mx-auto px-2">
                Have feedback, suggestions, or questions about Konvo Chat? Reach out, and let's start a conversation!
              </p>
            </div>

            {/* Contact Links */}
            <div className="space-y-4 sm:space-y-6 w-full sm:w-[80%] md:w-[50%] px-4 sm:px-0">
              {/* Email */}
              <Link
                href="mailto:munene1052@gmail.com"
                className="flex items-center p-4 sm:p-5 bg-gray-700/50 hover:bg-gray-600/50 rounded-2xl transition-all duration-300 hover:shadow-lg group">
                <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-red-600 group-hover:bg-red-500 rounded-xl mr-3 sm:mr-5 transition-colors duration-300 flex-shrink-0">
                  <span className="bi bi-envelope-fill text-xl sm:text-2xl text-white"></span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white text-base sm:text-lg">Email</p>
                  <p className="text-gray-300 text-xs sm:text-sm truncate">munene1052@gmail.com</p>
                </div>
              </Link>

              {/* GitHub */}
              <Link
                href="https://github.com/dauntflash"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center p-4 sm:p-5 bg-gray-700/50 hover:bg-gray-600/50 rounded-2xl transition-all duration-300 hover:shadow-lg group ">
                <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-gray-600 group-hover:bg-gray-500 rounded-xl mr-3 sm:mr-5 transition-colors duration-300 flex-shrink-0">
                  <span className="bi bi-github text-xl sm:text-2xl text-white"></span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white text-base sm:text-lg">GitHub</p>
                  <p className="text-gray-300 text-xs sm:text-sm truncate">@dauntflash</p>
                </div>
              </Link>

              {/* LinkedIn */}
              <Link
                href="https://linkedin.com/in/dennis-munene-433b49304"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center p-4 sm:p-5 bg-gray-700/50 hover:bg-gray-600/50 rounded-2xl transition-all duration-300 hover:shadow-lg group w-full">
                <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-blue-600 group-hover:bg-blue-500 rounded-xl mr-3 sm:mr-5 transition-colors duration-300 flex-shrink-0">
                  <span className="bi bi-linkedin text-xl sm:text-2xl text-white"></span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-white text-base sm:text-lg">LinkedIn</p>
                  <p className="text-gray-300 text-xs sm:text-sm truncate">Dennis Munene</p>
                </div>
              </Link>
            </div>

            {/* Footer */}
            <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 text-center">
              <p className="text-xs sm:text-sm text-gray-400">
                Built with ❤️ by{" "}
                <a
                  className="italic text-blue-400 hover:text-blue-300 transition-colors duration-200"
                  href="http://github.com/dauntflash"
                  target="_blank"
                  rel="noopener noreferrer">
                  dauntflash
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Help;