import React from "react";
import { socials } from "../constants";

const FooterSection = () => {
  return (
    <section className=" h-auto w-full flex flex-col pt-10 pb-5 space-y-5 px-4">
      <div className=" flex flex-col items-center justify-center gap-5">
        <h1 className=" text-6xl text-[#faeadd] tracking-wider uppercase font-black">
          #lingodeck
        </h1>
        <div className=" flex gap-5">
          {socials.map((social) => {
            return (
              <a
                key={social.id}
                href={social.link}
                className="ring-1 ring-[#faeadd]/20 rounded-full p-4 hover:bg-[#faeadd]/20 transition-colors ease-in-out duration-300"
              >
                <social.icon color="#faeadd" size={30} />
              </a>
            );
          })}
        </div>
      </div>
      <div className="text-[#777372] flex flex-col gap-2 lg:gap-0 lg:flex-row justify-between items-center">
        <span>Copyright © 2026 Lingo Deck - All Rights Reserved</span>
        <div className=" space-x-3">
          <a href="" className="hover:underline">
            Privacy Policy
          </a>
          <a href="#" className="hover:underline">
            Terms of Service
          </a>
        </div>
      </div>
    </section>
  );
};

export default FooterSection;
