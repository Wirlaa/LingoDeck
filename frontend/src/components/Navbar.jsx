import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";

export function Navbar() {
  const navItems = [
    { id: 1, name: "Home", link: "/" },
    { id: 2, name: "Game", link: "/game" },
    { id: 3, name: "About", link: "/about" },
    { id: 4, name: "Contact", link: "/contact" },
  ];

  const [isOpen, setIsOpen] = useState(false);
  const tl = useRef(null);
  const topLine = useRef(null);
  const middleLine = useRef(null);
  const bottomLine = useRef(null);

  const toggleMenu = () => setIsOpen((prev) => !prev);

  const closeMenu = () => setIsOpen(false);

  useGSAP(() => {
    tl.current = gsap.timeline({ paused: true });

    tl.current.to(".navbar-menu", {
      duration: 0.6,
      clipPath: "polygon(100% 0, 0% 0, 0% 100%, 100% 100%)",
      ease: "power3.inOut",
    });

    tl.current.fromTo(
      ".navbar-menu a",
      {
        opacity: 0,
        y: 20,
      },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.1,
      },
      "-=0.3",
    );
    tl.current.to(
      topLine.current,
      {
        y: 8,
        rotate: 45,
        duration: 0.3,
      },
      0,
    );

    tl.current.to(
      bottomLine.current,
      {
        y: -8,
        rotate: -45,
        duration: 0.3,
      },
      0,
    );

    tl.current.to(
      middleLine.current,
      {
        opacity: 0,
        duration: 0.2,
      },
      0,
    );
  }, []);

  useEffect(() => {
    if (!tl.current) return;

    if (isOpen) {
      tl.current.play();
    } else {
      tl.current.reverse();
    }
  }, [isOpen]);

  return (
    <nav className="fixed top-0 left-0 w-full p-4 z-50 mix-blend-difference">
      <div className="relative">
        <div className=" flex justify-between items-center">
          <Link to="/" className="font-bold cursor-pointer text-white">
            Lingo Deck
          </Link>
          <div className=" flex items-center gap-4">
            <Link
              to="/login"
              className="uppercase border border-white  text-white rounded-full py-1 px-7 cursor-pointer hover:bg-white hover:text-black transition-colors duration-300 ease-in-out"
            >
              login
            </Link>
            <button
              className="flex flex-col gap-1 cursor-pointer z-50 relative"
              onClick={toggleMenu}
            >
              <div ref={topLine} className="w-7 h-1 bg-white rounded-md" />
              <div ref={middleLine} className="w-7 h-1 bg-white rounded-md" />
              <div ref={bottomLine} className="w-7 h-1 bg-white rounded-md" />
            </button>
          </div>
        </div>

        <div
          className="navbar-menu bg-white flex flex-col justify-around items-center p-4 absolute top-10 right-0 w-80 h-80 rounded-md"
          style={{
            clipPath: "polygon(100% 0, 100% 0, 100% 0, 100% 0)",
          }}
        >
          {navItems.map((item) => (
            <Link
              key={item.id}
              to={item.link}
              onClick={closeMenu}
              className="text-4xl opacity-0 text-black"
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
