import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const DEFAULT_AVATAR = "🦊";

function getAvatar() {
  return localStorage.getItem("lingodeck_avatar") || DEFAULT_AVATAR;
}

export function Navbar() {
  const [user,   setUser]   = useState(null);
  const [avatar, setAvatar] = useState(getAvatar());
  const location = useLocation();

  useEffect(() => {
    const sync = () => {
      try {
        const stored = localStorage.getItem("user");
        setUser(stored ? JSON.parse(stored) : null);
      } catch { setUser(null); }
      setAvatar(getAvatar());
    };
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    window.dispatchEvent(new Event("storage"));
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav
      className="fixed top-0 left-0 w-full z-50 backdrop-blur-md"
      style={{
        background: "rgba(74, 46, 18, 0.6)",
        borderBottom: "1px solid rgba(243,226,199,0.18)",
        boxShadow: "0 2px 16px rgba(0,0,0,0.3)",
      }}
    >
      <div className="max-w-6xl mx-auto px-5 py-2.5 flex justify-between items-center">

        {/* Logo */}
        <Link to="/" style={{ textDecoration: "none" }}>
          <span
            className="font-black text-lg tracking-wider"
            style={{ color: "#f5d7a1", textShadow: "1px 2px 0 rgba(0,0,0,0.4)", letterSpacing: "0.12em" }}
          >
            LINGO DECK
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user && (
            <>
              {[{ to: "/quest", label: "Quest" }, { to: "/challenge", label: "Battle" }].map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  style={{ textDecoration: "none" }}
                  className="text-sm font-semibold px-3 py-1.5 rounded-lg transition-all duration-150"
                >
                  <span style={{
                    color: isActive(to) ? "#fff4df" : "rgba(245,215,161,0.75)",
                    background: isActive(to) ? "rgba(139,90,43,0.55)" : "transparent",
                    padding: "6px 12px",
                    borderRadius: "8px",
                  }}>
                    {label}
                  </span>
                </Link>
              ))}
            </>
          )}

          {user ? (
            <div className="flex items-center gap-2 ml-1">
              <Link
                to="/profile"
                style={{ textDecoration: "none" }}
                className="flex items-center gap-1.5 transition-opacity hover:opacity-100"
              >
                <span
                  className="text-lg leading-none"
                  style={{
                    background: "rgba(139,90,43,0.5)",
                    border: "1.5px solid rgba(243,226,199,0.4)",
                    borderRadius: "50%",
                    width: "30px",
                    height: "30px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "16px",
                  }}
                >
                  {avatar}
                </span>
                <span
                  className="text-sm font-semibold"
                  style={{ color: "#f5d7a1", opacity: 0.9 }}
                >
                  {user.username}
                </span>
              </Link>

              <button
                onClick={handleLogout}
                className="text-xs font-bold uppercase cursor-pointer py-1.5 px-4 rounded-full transition-all duration-150"
                style={{
                  background: "rgba(139,90,43,0.75)",
                  border: "1.5px solid rgba(243,226,199,0.5)",
                  color: "#fff4df",
                  letterSpacing: "0.07em",
                  boxShadow: "2px 2px 0 rgba(0,0,0,0.25)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translate(1px,1px)"; e.currentTarget.style.boxShadow = "1px 1px 0 rgba(0,0,0,0.25)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "2px 2px 0 rgba(0,0,0,0.25)"; }}
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              style={{ textDecoration: "none" }}
              className="text-xs font-bold uppercase py-1.5 px-5 rounded-full transition-all duration-150"
            >
              <span style={{
                background: "rgba(139,90,43,0.75)",
                border: "1.5px solid rgba(243,226,199,0.5)",
                color: "#fff4df",
                letterSpacing: "0.07em",
                padding: "6px 20px",
                borderRadius: "999px",
                boxShadow: "2px 2px 0 rgba(0,0,0,0.25)",
              }}>
                Login
              </span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
