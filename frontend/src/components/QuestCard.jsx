import { useRef, useEffect, forwardRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

export const QuestCard = forwardRef(
  (
    {
      question,
      subtitle = "",
      options = [],
      difficulty,
      onAnswer,
      disabled = false,
    },
    ref,
  ) => {
    const optionsRef = useRef([]);

    const difficultyColors = {
      beginner: "bg-blue-200",
      intermediate: "bg-yellow-200",
      difficult: "bg-red-200",
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

    useEffect(() => {
      optionsRef.current = [];
    }, [question]);

    useGSAP(() => {
      if (!ref?.current) return;

      const validOptions = optionsRef.current.filter(Boolean);

      const tl = gsap.timeline({ delay: 0.3 });

      tl.fromTo(ref.current, { x: "-300%" }, { x: 0, duration: 0.5 });

      if (validOptions.length) {
        tl.fromTo(validOptions, { y: "500%" }, { y: 0, stagger: 0.1 });
      }
    }, [question]);

    return (
      <div
        ref={ref}
        className={`${difficultyColors[difficulty]} h-125 w-125 bg-center bg-cover bg-no-repeat mb-20 mt-30 rounded-3xl bg-[#f8f1e5] shadow-lg border border-[#e5d5c0] p-6 flex flex-col justify-between relative`}
      >
        <h2 className="text-xl font-bold text-black relative z-10">
          {question || "Loading..."}
        </h2>

        {subtitle ? (
          <p className="text-sm text-black/70 italic relative z-10 mt-2">
            {subtitle}
          </p>
        ) : null}

        <span
          className={`absolute z-10 top-4 right-4 ${buttonsColors[difficulty]} text-white text-xs px-3 py-1 rounded-full uppercase`}
        >
          {difficulty}
        </span>

        <div className="flex flex-col gap-3 overflow-y-hidden relative z-10">
          {options.map((opt, index) => (
            <button
              key={index}
              ref={(el) => {
                if (el) optionsRef.current[index] = el;
              }}
              onClick={() => onAnswer(opt)}
              disabled={disabled}
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
