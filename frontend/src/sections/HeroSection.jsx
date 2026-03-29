import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SplitText } from "gsap/all";

const HeroSection = () => {
  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".hero-section",
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    });
    tl.to(".hero-section", {
      scale: 0.8,
      rotate: -10,
    });

    const splitText = SplitText.create(".hero-title h1", { type: "chars" });
    const splitParagraph = SplitText.create(".paragraph", { type: "words" });

    const textTl = gsap.timeline({});

    textTl
      .from(splitText.chars, {
        yPercent: 200,
        duration: 0.5,
        ease: "power1.inOut",
        stagger: 0.02,
      })
      .to(" .hero-subtitle", {
        duration: 0.5,
        clipPath: "polygon(100% 0, 0% 0, 0% 100%, 100% 100%)",
        ease: "power1.inOut",
      })
      .from(splitParagraph.words, {
        yPercent: 200,
        duration: 0.5,
        ease: "power1.inOut",
        stagger: 0.02,
      });
  });

  return (
    <section
      style={{
        backgroundImage: "url(/images/hero.png)",
      }}
      className="h-screen relative w-full hero-section overflow-hidden flex justify-center items-center px-4 bg-cover bg-center"
    >
      <div className=" backdrop-blur-xs absolute inset-0" />
      <div className="">
        <div className=" justify-self-center relative z-10  overflow-hidden hero-title">
          <h1 className=" uppercase font-bold text-6xl lg:text-9xl text-dark-brown">
            lingo deck
          </h1>
        </div>
        <div
          style={{ clipPath: "polygon(50% 0, 50% 0, 50% 100%, 50% 100%)" }}
          className=" bg-[#a16833] border-8 border-[#f9e9dc] border-solid -rotate-7 relative z-10 px-4 py-2 hero-subtitle"
        >
          <h3 className=" text-6xl lg:text-9xl uppercase text-[#fde1cc] font-bold">
            learn + fun
          </h3>
        </div>
        <div className=" pt-20 max-w-md justify-self-center overflow-hidden">
          <p className=" text-black lg:text-xl relative z-10 text-center paragraph">
            Discover the joy of learning languages with our interactive deck!
          </p>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
