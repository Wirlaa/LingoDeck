import { useRef, useEffect, forwardRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";

const DIFFICULTY_CONFIG = {
  beginner: {
    bg:        "linear-gradient(160deg, #dbeafe 0%, #eff6ff 60%, #bfdbfe 100%)",
    badge:     { bg: "#2563eb", text: "#fff" },
    border:    "#93c5fd",
    innerBorder: "#bfdbfe",
    optionBg:  "#2563eb",
    optionHover: "#1d4ed8",
    accent:    "#3b82f6",
    label:     "Beginner",
  },
  intermediate: {
    bg:        "linear-gradient(160deg, #fef3c7 0%, #fffbeb 60%, #fde68a 100%)",
    badge:     { bg: "#d97706", text: "#fff" },
    border:    "#fcd34d",
    innerBorder: "#fde68a",
    optionBg:  "#d97706",
    optionHover: "#b45309",
    accent:    "#f59e0b",
    label:     "Intermediate",
  },
  difficult: {
    bg:        "linear-gradient(160deg, #fee2e2 0%, #fff5f5 60%, #fecaca 100%)",
    badge:     { bg: "#dc2626", text: "#fff" },
    border:    "#f87171",
    innerBorder: "#fecaca",
    optionBg:  "#dc2626",
    optionHover: "#b91c1c",
    accent:    "#ef4444",
    label:     "Difficult",
  },
};

export const QuestCard = forwardRef(
  ({ question, subtitle = "", options = [], difficulty, onAnswer, disabled = false }, ref) => {
    const optionsRef = useRef([]);
    const cfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.intermediate;

    useEffect(() => {
      optionsRef.current = [];
    }, [question]);

    useGSAP(() => {
      if (!ref?.current) return;

      const validOptions = optionsRef.current.filter(Boolean);
      const tl = gsap.timeline({ delay: 0.3 });

      tl.fromTo(ref.current, { x: "-300%" }, { x: 0, duration: 0.45, ease: "power2.out" });
      if (validOptions.length) {
        tl.fromTo(validOptions, { y: "120%", opacity: 0 }, { y: 0, opacity: 1, stagger: 0.08, duration: 0.35, ease: "back.out(1.4)" });
      }
    }, [question]);

    return (
      <div
        ref={ref}
        className="relative select-none"
        style={{
          width: "clamp(300px, 90vw, 480px)",
          minHeight: "520px",
          borderRadius: "20px",
          border: `3px solid ${cfg.border}`,
          background: cfg.bg,
          boxShadow: `0 20px 60px rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)`,
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Inner frame */}
        <div
          className="absolute inset-2 rounded-2xl pointer-events-none"
          style={{ border: `1px solid ${cfg.innerBorder}`, opacity: 0.7 }}
        />

        {/* Corner decorations */}
        {["top-3 left-3", "top-3 right-3", "bottom-3 left-3", "bottom-3 right-3"].map((pos, i) => (
          <div
            key={i}
            className={`absolute ${pos} w-4 h-4 pointer-events-none`}
            style={{
              border: `2px solid ${cfg.accent}`,
              borderRadius: "3px",
              opacity: 0.5,
              ...(i === 0 && { borderRight: "none", borderBottom: "none" }),
              ...(i === 1 && { borderLeft: "none", borderBottom: "none" }),
              ...(i === 2 && { borderRight: "none", borderTop: "none" }),
              ...(i === 3 && { borderLeft: "none", borderTop: "none" }),
            }}
          />
        ))}

        {/* Difficulty badge */}
        <div className="relative z-10 flex justify-end">
          <span
            className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ background: cfg.badge.bg, color: cfg.badge.text }}
          >
            {cfg.label}
          </span>
        </div>

        {/* Question */}
        <div className="relative z-10 flex-1">
          <p
            className="text-[10px] uppercase tracking-widest font-semibold mb-2"
            style={{ color: cfg.accent }}
          >
            Finnish
          </p>
          <h2
            className="font-bold leading-tight"
            style={{
              fontSize: question && question.length > 60 ? "1.25rem" : "1.6rem",
              color: "#1a1a2e",
              textShadow: "0 1px 2px rgba(0,0,0,0.08)",
            }}
          >
            {question || "Loading…"}
          </h2>

          {subtitle && (
            <p className="mt-2 text-sm italic" style={{ color: "#4a4a6a", opacity: 0.8 }}>
              {subtitle}
            </p>
          )}
        </div>

        {/* Divider */}
        <div
          className="relative z-10"
          style={{
            height: "1px",
            background: `linear-gradient(90deg, transparent, ${cfg.accent}66, transparent)`,
          }}
        />

        {/* Options */}
        <div className="relative z-10 flex flex-col gap-2.5 overflow-hidden">
          {options.map((opt, index) => (
            <button
              key={index}
              ref={(el) => { if (el) optionsRef.current[index] = el; }}
              onClick={() => onAnswer(opt)}
              disabled={disabled}
              className="text-white font-semibold py-2.5 px-4 rounded-xl text-sm text-left transition-all cursor-pointer disabled:cursor-not-allowed"
              style={{
                background: cfg.optionBg,
                boxShadow: `0 3px 0 ${cfg.optionHover}`,
                opacity: disabled ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!disabled) {
                  e.currentTarget.style.background = cfg.optionHover;
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = cfg.optionBg;
                e.currentTarget.style.transform = "translateY(0)";
              }}
              onMouseDown={(e) => {
                if (!disabled) {
                  e.currentTarget.style.transform = "translateY(3px)";
                  e.currentTarget.style.boxShadow = "none";
                }
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = `0 3px 0 ${cfg.optionHover}`;
              }}
            >
              <span className="opacity-50 mr-2">{String.fromCharCode(65 + index)}.</span>
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  },
);
