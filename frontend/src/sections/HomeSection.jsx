import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SplitText } from "gsap/all";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

const HomeSection = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem("token");
  });

  useEffect(() => {
    const checkAuth = () => {
      setIsLoggedIn(!!localStorage.getItem("token"));
    };

    window.addEventListener("storage", checkAuth);

    return () => {
      window.removeEventListener("storage", checkAuth);
    };
  }, []);

  useGSAP(() => {
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
      .to(".hero-subtitle", {
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

    if (isLoggedIn) {
      textTl
        .to(".quiz-link", {
          duration: 0.5,
          opacity: 1,
          ease: "power1.inOut",
        })
        .to(".battle-link", {
          duration: 0.5,
          opacity: 1,
          ease: "power1.inOut",
        });
    }
  }, [isLoggedIn]);

  return (
    <section
      style={{
        backgroundImage: "url(/images/hero.png)",
      }}
      className="h-screen relative w-full hero-section overflow-hidden flex justify-center items-center px-4 bg-cover bg-center"
    >
      <div className="backdrop-blur-xs absolute inset-0 bg-black/10" />

      <div>
        <div className="justify-self-center relative z-10 overflow-hidden hero-title">
          <h1
            className="uppercase font-bold text-5xl lg:text-9xl text-[#f5d7a1]"
            style={{ textShadow: "2px 2px 2px black" }}
          >
            lingo deck
          </h1>
        </div>

        <div
          style={{ clipPath: "polygon(50% 0, 50% 0, 50% 100%, 50% 100%)" }}
          className="bg-[#fff4df] border-8 border-[#f3e2c7] -rotate-7 relative z-10 px-4 py-2 hero-subtitle rounded-3xl"
        >
          <h3 className="text-5xl lg:text-9xl uppercase text-[#8b5a2b] font-bold">
            learn + fun
          </h3>
        </div>

        <div className="pt-20 max-w-md justify-self-center overflow-hidden">
          <p
            className="text-white text-sm lg:text-xl relative z-10 text-center paragraph"
            style={{ textShadow: "2px 2px 2px black" }}
          >
            Discover the joy of learning languages with our interactive deck!
          </p>
        </div>

        {isLoggedIn && (
          <div className="relative z-10 flex justify-center items-center gap-6 mt-10 btns">
            <Link
              to="/quest"
              className="bg-[#8b5a2b] border-4 border-[#f3e2c7] 
  shadow-[4px_4px_0px_#5a3b1a]
  px-8 py-2 rounded-md text-[#fff4df] quiz-link opacity-0
  transition-all duration-150
  hover:translate-x-[2px] hover:translate-y-[2px]
  hover:shadow-[2px_2px_0px_#5a3b1a]
  active:translate-x-[4px] active:translate-y-[4px]
  active:shadow-[0px_0px_0px_#5a3b1a]"
            >
              Quest
            </Link>

            <Link
              to="/challenge"
              className="bg-[#a9743a] border-4 border-[#f3e2c7] 
  shadow-[4px_4px_0px_#5a3b1a]
  px-8 py-2 rounded-md text-[#fff4df] battle-link opacity-0
  transition-all duration-150
  hover:translate-x-[2px] hover:translate-y-[2px]
  hover:shadow-[2px_2px_0px_#5a3b1a]
  active:translate-x-[4px] active:translate-y-[4px]
  active:shadow-[0px_0px_0px_#5a3b1a]"
            >
              Challenge
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default HomeSection;
