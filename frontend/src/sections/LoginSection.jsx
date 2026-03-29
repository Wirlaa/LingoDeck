import React from "react";
import { Link } from "react-router-dom";

const LoginSection = () => {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center px-4"
      style={{
        backgroundImage: "url(/images/login.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 backdrop-blur-sm" />
      <div className="relative z-10 bg-[#f3e2c7] p-2 rounded-[26px] border-[3px] border-[#d2b48c] shadow-xl w-full max-w-140">
        <div className="relative bg-[#fff4df] rounded-[20px] px-4 sm:px-6 py-8 border-2 border-[#e6cfae]">
          <div className="absolute -top-5 sm:-top-6 left-1/2 -translate-x-1/2 bg-[#f5d7a1] px-4 sm:px-6 py-1.5 sm:py-2 rounded-full border-2 border-[#d2a56d] shadow">
            <h2 className="text-[#8b5a2b] font-bold text-xs sm:text-sm tracking-wide">
              Login
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start mt-4">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-[#ffe8c7] rounded-2xl sm:rounded-[18px] border-2 border-[#d2b48c] flex items-center justify-center text-xl sm:text-2xl overflow-hidden">
                🔐
              </div>

              <div className="absolute -bottom-2 -right-2 bg-[#7fd1d8] w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-white text-[10px] sm:text-xs shadow">
                ✎
              </div>
            </div>

            <form className="flex-1 w-full flex flex-col gap-3">
              <div className="flex items-center gap-2 w-full">
                <span className="text-xs sm:text-sm text-[#8b5a2b] w-14 sm:w-16 shrink-0">
                  Email
                </span>
                <input
                  type="email"
                  placeholder="enter email"
                  className="flex-1 min-w-0 bg-[#fffaf2] border-2 border-[#e6cfae] rounded-full px-3 sm:px-4 py-1.5 text-xs sm:text-sm outline-none"
                />
                <button className="bg-[#7fd1d8] text-white w-6 h-6 sm:w-7 sm:h-7 rounded-full text-[10px] sm:text-xs shadow shrink-0">
                  ✎
                </button>
              </div>
              <div className="flex items-center gap-2 w-full">
                <span className="text-xs sm:text-sm text-[#8b5a2b] w-14 sm:w-16 shrink-0">
                  Password
                </span>
                <input
                  type="password"
                  placeholder="enter password"
                  className="flex-1 min-w-0 bg-[#fffaf2] border-2 border-[#e6cfae] rounded-full px-3 sm:px-4 py-1.5 text-xs sm:text-sm outline-none"
                />
                <button className="bg-[#7fd1d8] text-white w-6 h-6 sm:w-7 sm:h-7 rounded-full text-[10px] sm:text-xs shadow shrink-0">
                  ✎
                </button>
              </div>
              <button className="mt-4 bg-[#6ec6c2] hover:bg-[#5bb3af] text-white py-2 rounded-full shadow-md font-medium text-sm sm:text-base">
                Login
              </button>
              <div className="text-center text-xs sm:text-sm text-[#8b5a2b]  mt-2">
                Not registered yet?{" "}
                <Link to="/register" className="hover:underline">
                  Register
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LoginSection;
