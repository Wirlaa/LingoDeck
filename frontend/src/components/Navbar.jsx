import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export function Navbar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkUser = () => {
      const storedUser = localStorage.getItem("user");

      if (storedUser) {
        setUser(JSON.parse(storedUser));
      } else {
        setUser(null);
      }
    };

    checkUser();

    window.addEventListener("storage", checkUser);

    return () => {
      window.removeEventListener("storage", checkUser);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <nav className="fixed top-0 left-0 w-full p-4 z-50 bg-[#8b5a2b]/40 backdrop-blur-sm">
      <div className="relative">
        <div className="flex justify-between items-center">
          <Link
            to="/"
            className="font-bold cursor-pointer text-[#f5d7a1] 
            drop-shadow-[2px_2px_0px_#5a3b1a]"
          >
            Lingo Deck
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/profile"
                  className="text-[#f5d7a1] text-sm 
                  drop-shadow-[1px_1px_0px_#5a3b1a] hover:underline"
                >
                  Hello, {user.username}
                </Link>

                <button
                  onClick={handleLogout}
                  className="uppercase cursor-pointer 
                  bg-[#8b5a2b] border-2 border-[#f3e2c7] 
                  text-[#fff4df] 
                  rounded-full py-1 px-5 
                  shadow-[3px_3px_0px_#5a3b1a]
                  transition-all duration-150
                  hover:translate-x-0.5 hover:translate-y-0.5
                  hover:shadow-[1px_1px_0px_#5a3b1a]"
                >
                  logout
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="uppercase 
                bg-[#8b5a2b] border-2 border-[#f3e2c7] 
                text-[#fff4df] 
                rounded-full py-1 px-7 
                shadow-[3px_3px_0px_#5a3b1a]
                transition-all duration-150
                hover:translate-x-0.5 hover:translate-y-0.5
                hover:shadow-[1px_1px_0px_#5a3b1a]"
              >
                login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
