import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SplitText } from "gsap/all";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

const HomeSection = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => !!localStorage.getItem("token"),
  );

  useEffect(() => {
    const check = () => setIsLoggedIn(!!localStorage.getItem("token"));
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, []);

  useGSAP(() => {
    const splitTitle = SplitText.create(".hero-title h1", { type: "chars" });
    const tl = gsap.timeline({ delay: 0.15 });
    tl.from(splitTitle.chars, {
      yPercent: 120,
      opacity: 0,
      duration: 0.55,
      ease: "power3.out",
      stagger: 0.025,
    })
      .from(
        ".hero-badge",
        {
          opacity: 0,
          y: -10,
          rotation: -4,
          scale: 0.92,
          duration: 0.4,
          ease: "back.out(1.6)",
        },
        "-=0.1",
      )
      .from(
        ".hero-tagline",
        { opacity: 0, y: 8, duration: 0.35, ease: "power2.out" },
        "-=0.05",
      )
      .from(
        ".hero-cta",
        {
          opacity: 0,
          y: 14,
          scale: 0.92,
          duration: 0.35,
          stagger: 0.09,
          ease: "back.out(1.4)",
        },
        "-=0.05",
      );
  }, [isLoggedIn]);

  const pressProps = () => ({
    onMouseEnter: (e) => {
      e.currentTarget.style.transform = "scale(1.06)";
    },
    onMouseDown: (e) => {
      e.currentTarget.style.boxShadow = "none";
    },
    onMouseUp: (e) => {
      e.currentTarget.style.boxShadow = "";
    },
    onMouseLeave: (e) => {
      e.currentTarget.style.transform = "scale(1)";
      e.currentTarget.style.boxShadow = "";
    },
  });

  return (
    <section
      style={{ backgroundImage: "url(/images/hero.png)" }}
      className="relative h-screen w-full overflow-hidden flex items-center justify-center bg-cover bg-center"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom,rgba(0,0,0,0.05) 0%,rgba(0,0,0,0.3) 55%,rgba(0,0,0,0.52) 100%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center px-4 text-center w-full max-w-4xl mx-auto gap-3">
        {/* Title — whiteSpace nowrap prevents the orphan K */}
        <div className="hero-title overflow-hidden">
          <h1
            style={{
              fontSize: "clamp(3rem, 9vw, 6.5rem)",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "-0.02em",
              color: "#f5d7a1",
              textShadow: "3px 4px 0 rgba(0,0,0,0.5), 0 0 40px rgba(0,0,0,0.3)",
              whiteSpace: "nowrap",
              lineHeight: 1,
            }}
          >
            LINGO DECK
          </h1>
        </div>

        {/* Compact rotated badge */}
        <div
          className="hero-badge"
          style={{
            background: "#fff4df",
            border: "4px solid #f3e2c7",
            borderRadius: "14px",
            padding: "5px 16px",
            transform: "rotate(-2deg)",
            boxShadow: "3px 3px 0 #8b5a2b",
            display: "inline-block",
          }}
        >
          <span
            style={{
              fontSize: "clamp(0.9rem, 3vw, 1.7rem)",
              fontWeight: 900,
              color: "#8b5a2b",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            Learn · Collect · Battle
          </span>
        </div>

        {/* Tagline */}
        <p
          className="hero-tagline font-semibold"
          style={{
            fontSize: "clamp(0.82rem, 2vw, 1.05rem)",
            color: "rgba(255,255,255,0.9)",
            textShadow: "1px 2px 8px rgba(0,0,0,0.8)",
            maxWidth: "460px",
            lineHeight: 1.6,
          }}
        >
          Master Finnish through quests. Build your card deck. Conquer the
          battle arena.
        </p>

        {/* CTAs */}
        {isLoggedIn ? (
          <div className="flex flex-wrap items-center justify-center gap-3 mt-1">
            {[
              {
                to: "/quest",
                label: "◆ Quest",
                bg: "linear-gradient(135deg,#8b5a2b,#6a421f)",
                shadow: "0 5px 0 #4a2c10",
                border: "3px solid #f3e2c7",
              },
              {
                to: "/challenge",
                label: "⚔ Battle",
                bg: "linear-gradient(135deg,#a9743a,#8b5a2b)",
                shadow: "0 5px 0 #5a3b1a",
                border: "3px solid #f3e2c7",
              },
              {
                to: "/profile",
                label: "✦ Collection",
                bg: "rgba(0,0,0,0.5)",
                shadow: "none",
                border: "2px solid rgba(243,226,199,0.5)",
              },
            ].map(({ to, label, bg, shadow, border }) => (
              <Link
                key={to}
                to={to}
                className="hero-cta font-black uppercase tracking-widest"
                style={{
                  fontSize: "clamp(0.73rem,1.8vw,0.92rem)",
                  background: bg,
                  border,
                  color: "#fff4df",
                  padding: "clamp(10px,1.8vw,13px) clamp(20px,3.5vw,34px)",
                  borderRadius: "12px",
                  boxShadow: shadow,
                  textDecoration: "none",
                  letterSpacing: "0.1em",
                  display: "inline-block",
                  transform: "scale(1)",
                  transition: "transform 0.1s,box-shadow 0.1s",
                }}
                {...pressProps()}
              >
                {label}
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap justify-center mt-1">
            <Link
              to="/login"
              className="hero-cta"
              style={{
                fontSize: "clamp(0.8rem,2vw,0.95rem)",
                background: "rgba(0,0,0,0.45)",
                border: "2px solid rgba(243,226,199,0.4)",
                color: "#f5d7a1",
                padding: "clamp(11px,2vw,14px) clamp(20px,3vw,32px)",
                borderRadius: "12px",
                backdropFilter: "blur(4px)",
                fontWeight: 600,
                textDecoration: "none",
                transform: "scale(1)",
                transition: "transform 0.1s,box-shadow 0.1s",
              }}
              {...pressProps()}
            >
              Log in
            </Link>
          </div>
        )}

        {!isLoggedIn && (
          <div className="hero-cta flex flex-wrap justify-center gap-2 mt-1">
            {["◆ Collect Cards", "⚔ Battle Bosses", "✦ Learn Finnish"].map(
              (f) => (
                <span
                  key={f}
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    padding: "4px 12px",
                    borderRadius: "999px",
                    background: "rgba(0,0,0,0.45)",
                    border: "1px solid rgba(243,226,199,0.25)",
                    color: "#f5d7a1",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  {f}
                </span>
              ),
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default HomeSection;
