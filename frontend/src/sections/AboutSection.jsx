import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SplitText } from "gsap/all";

const AboutSection = () => {
  useGSAP(() => {
    const firstMsgSplit = SplitText.create(".first-message", {
      type: "words",
    });

    const secondMsgSplit = SplitText.create(".second-message", {
      type: "words",
    });

    gsap.to(firstMsgSplit.words, {
      color: "#faeade",
      ease: "power1.in",
      stagger: 1,
      scrollTrigger: {
        trigger: ".message-content",
        start: "top center",
        end: "30% center",
        scrub: true,
      },
    });

    gsap.to(secondMsgSplit.words, {
      color: "#faeade",
      ease: "power1.in",
      stagger: 1,
      scrollTrigger: {
        trigger: ".second-message",
        start: "top center",
        end: "bottom center",
        scrub: true,
      },
    });

    gsap.to(".msg-text-scroll", {
      clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
      duration: 1,
      ease: "power1.inOut",
      scrollTrigger: {
        trigger: ".msg-text-scroll",
        start: " 80% top",
        end: " 40% top ",
        scrub: true,
      },
    });

    gsap.from(".message-content", {
      scale: 0.6,
      rotate: 10,
      scrollTrigger: {
        trigger: ".message-content",
        start: "top bottom",
        end: "top top",
        scrub: true,
      },
    });
  });
  return (
    <section className="message-content">
      <div className=" container mx-auto flex justify-center items-center py-20 relative">
        <div className=" w-full h-full">
          <div className="msg-wrapper">
            <h1 className=" first-message">ready to learn a new language?</h1>
            <div
              style={{
                clipPath: "polygon(0 0, 0 0, 0 100%, 0% 100%)",
              }}
              className="msg-text-scroll"
            >
              <div className=" bg-light-brown pb-3 md:pb-5 px-5">
                <h2 className=" capitalize text-red-brown">fuel up</h2>
              </div>
            </div>
            <h1 className="second-message">
              because things are about to get exciting!
            </h1>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
