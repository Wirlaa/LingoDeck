import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { forwardRef } from "react";

export const QuestCard = forwardRef(
  ({ question, options, difficulty, onAnswer }, ref) => {
    const optionsRef = useRef([]);

    const difficultyColors = {
      beginner: "bg-blue-200",
      intermediate: "bg-yellow-200",
      difficult: "bg-red-200",
    };

    const difficultyBackgrounds = {
      beginner: "/images/beginner-card.png",
      intermediate: "/images/intermediate-card.png",
      difficult: "/images/difficult-card.png",
    };

    const buttonsColors = {
      beginner: "bg-blue-500",
      intermediate: "bg-yellow-500",
      difficult: "bg-red-500",
    };

    const borderColors = {
      beginner: "border-blue-700",
      intermediate: "border-yellow-700",
      difficult: "border-red-700",
    };

    useGSAP(() => {
      const tl = gsap.timeline({ delay: 0.5 });

      tl.fromTo(ref.current, { x: "-300%" }, { x: 0, duration: 0.5 })

        .fromTo(optionsRef.current, { y: "500%" }, { y: 0, stagger: 0.1 });
    }, [question]);

    return (
      <div
        ref={ref}
        className={`${difficultyColors[difficulty]} h-[500px] w-[500px] bg-center bg-cover bg-no-repeat mb-20 mt-30 rounded-3xl bg-[#f8f1e5] shadow-lg border border-[#e5d5c0] p-6 flex flex-col justify-between relative`}
        style={{
          backgroundImage: `url(${difficultyBackgrounds[difficulty]})`,
        }}
      >
        <h2 className="text-xl font-bold text-black relative z-10">
          {question}
        </h2>

        <span
          className={`absolute z-10 top-4 right-4 ${buttonsColors[difficulty]} text-white text-xs px-3 py-1 rounded-full uppercase`}
        >
          {difficulty}
        </span>

        <div className="flex flex-col gap-3 overflow-y-hidden relative z-10">
          {options.map((opt, index) => (
            <button
              key={index}
              ref={(el) => (optionsRef.current[index] = el)}
              onClick={() => onAnswer(opt)}
              className={`${buttonsColors[difficulty]} ${borderColors[difficulty]} text-white font-bold backdrop-blur-xs border opacity-80 rounded-xl py-3 shadow-md hover:opacity-90 cursor-pointer`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  },
);
