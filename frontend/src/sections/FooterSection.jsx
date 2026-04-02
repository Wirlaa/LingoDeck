import React from "react";
import { socials } from "../constants";

const FooterSection = () => {
  return (
    <section className="h-auto w-full flex flex-col pt-10 pb-5 space-y-5 px-4 bg-[#8b5a2b]">
      <div className="flex flex-col items-center justify-center gap-5">
        <h1 className="text-4xl lg:text-6xl text-[#f5d7a1] tracking-wider uppercase font-black drop-shadow-[3px_3px_0px_#5a3b1a]">
          #lingodeck
        </h1>
        <div className="flex gap-5">
          {socials.map((social) => {
            return (
              <a
                key={social.id}
                href={social.link}
                className="bg-[#a9743a] border-2 border-[#f3e2c7] rounded-full p-4 shadow-[3px_3px_0px_#5a3b1a] transition-all duration-150 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_#5a3b1a]"
              >
                <social.icon color="#fff4df" size={20} />
              </a>
            );
          })}
        </div>
      </div>
      <div className="text-[#f3e2c7] flex flex-col gap-2 lg:gap-0 lg:flex-row justify-between items-center">
        <span className="text-xs lg:text-base drop-shadow-[1px_1px_0px_#5a3b1a]">
          Copyright © 2026 Lingo Deck - All Rights Reserved
        </span>
        <div className="space-x-3">
          <a
            href=""
            className="text-xs lg:text-base drop-shadow-[1px_1px_0px_#5a3b1a] hover:underline"
          >
            Privacy Policy
          </a>
          <a
            href="#"
            className="text-xs lg:text-base drop-shadow-[1px_1px_0px_#5a3b1a] hover:underline"
          >
            Terms of Service
          </a>
        </div>
      </div>
    </section>
  );
};

export default FooterSection;
