const FooterSection = () => {
  return (
    <section className="h-auto w-full flex flex-col pt-10 pb-5 space-y-5 px-4 bg-[#8b5a2b]">
      <div className="flex flex-col items-center justify-center gap-5">
        <h1 className="text-4xl lg:text-6xl text-[#f5d7a1] tracking-wider uppercase font-black drop-shadow-[3px_3px_0px_#5a3b1a]">
          #lingodeck
        </h1>
      </div>
      <div className="text-[#f3e2c7] flex justify-center items-center">
        <span className="text-xs lg:text-base drop-shadow-[1px_1px_0px_#5a3b1a]">
          Copyright © 2026 Lingo Deck - All Rights Reserved
        </span>
      </div>
    </section>
  );
};

export default FooterSection;
