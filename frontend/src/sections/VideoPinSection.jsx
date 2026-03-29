import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useMediaQuery } from "react-responsive";

const VideoPinSection = () => {
  const isMobile = useMediaQuery({ query: "(max-width: 768px)" });
  useGSAP(() => {
    if (!isMobile) {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: ".vid-pin-section",
          start: "-15% top",
          end: "200% top",
          scrub: 1.5,
          pin: true,
        },
      });

      tl.to(".video-box", {
        clipPath: "circle(100% at 50% 50%)",
        ease: "power1.inOut",
      });
    }
    gsap.to(".circle-text", {
      rotate: 360,
      ease: "none",
      repeat: -1,
      duration: 20,
    });
  });
  return (
    <section className="vid-pin-section relative md:h-[110vh] h-dvh overflow-hidden md:-translate-y-[15%]!">
      <div
        style={{
          clipPath: isMobile
            ? "circle(100% at 50% 50%)"
            : "circle(6% at 50% 50%)",
        }}
        className=" video-box size-full absolute inset-0 object-cover"
      >
        <video
          src="/videos/reel.mp4"
          playsInline
          autoPlay
          muted
          loop
          className="object-cover size-full"
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 md:scale-100 scale-200">
          <img
            src="/images/circle-text.svg"
            alt="circle-text"
            className="circle-text size-[15vw]"
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[9vw] flex justify-center items-center bg-[#ffffff1a] backdrop-blur-xl rounded-full">
            <img
              src="/images/play.svg"
              alt="play button"
              className="size-[3vw] ml-[.5vw]"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default VideoPinSection;
