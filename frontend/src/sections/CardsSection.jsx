import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { cards } from "../constants";
import { useMediaQuery } from "react-responsive";

const CardsSection = () => {
  const isMobile = useMediaQuery({ query: "(max-width: 768px)" });
  useGSAP(() => {
    if (!isMobile) {
      gsap.set(".cards-section", { marginTop: "-140vh" });
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: ".cards-section",
        start: "top bottom",
        end: "200% top",
        scrub: true,
      },
    });
    tl.to(".cards-section .first-title", {
      xPercent: 70,
    })
      .to(
        ".cards-section .second-title",
        {
          xPercent: 80,
        },
        "<",
      )
      .to(
        ".cards-section .third-title",
        {
          xPercent: -50,
        },
        "<",
      );

    const pinTl = gsap.timeline({
      scrollTrigger: {
        trigger: ".cards-section",
        start: "10% top",
        end: "200% top",
        scrub: true,
        pin: true,
      },
    });
    pinTl.from(".vd-card", {
      yPercent: 150,
      stagger: 0.2,
      ease: "power1.inOut",
    });
  });
  return (
    <section className="bg-milk relative w-full h-[120dvh] cards-section">
      <div className="absolute size-full flex flex-col items-center pt-[5vw]">
        <h1 className="first-title text-black text-[18vw] leading-none uppercase font-bold tracking-wider md:text-[13rem]">
          quiz
        </h1>
        <h1 className="second-title text-light-brown text-[18vw] leading-none uppercase font-bold tracking-wider md:text-[13rem]">
          or
        </h1>
        <h1 className="third-title text-black text-[18vw] leading-none uppercase font-bold tracking-wider md:text-[13rem]">
          battle
        </h1>
      </div>
      <div className="pin-box flex items-center justify-center w-full ps-52 absolute 2xl:bottom-32 bottom-[50vh]">
        {cards.map((card, index) => {
          return (
            <div
              key={index}
              className={`${card.translation} ${card.rotation} vd-card md:w-96 w-80 flex-none md:rounded-[2vw] rounded-3xl -ms-44 overflow-hidden 2xl:relative absolute border-[.5vw] border-milk`}
            >
              <video
                src={card.src}
                playsInline
                muted
                loop
                autoPlay
                className=" size-full object-cover"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default CardsSection;
