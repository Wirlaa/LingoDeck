import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/api";
import toast from "react-hot-toast";

const LoginSection = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error("All fields are required");
      return;
    }

    try {
      const res = await api.post("/login", {
        email: formData.email,
        password: formData.password,
      });

      const user = res.data.data.user;
      const token = res.data.data.jwToken;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      window.dispatchEvent(new Event("storage"));

      toast.success("Login successful 🎉");

      setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch (err) {
      const message = err.response?.data?.message || "Login failed";

      toast.error(message);
    }
  };

  return (
    <section
      className="relative min-h-screen flex items-center justify-center px-4"
      style={{
        backgroundImage: "url(/images/login.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 backdrop-blur-sm" />

      <div className="relative z-10 bg-[#f3e2c7] p-2 rounded-[26px] border-[3px] border-[#d2b48c] shadow-xl w-full max-w-140">
        <div className="relative bg-[#fff4df] rounded-[20px] px-4 sm:px-6 py-8 border-2 border-[#e6cfae]">
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-[#f5d7a1] px-6 py-2 rounded-full border-2 border-[#d2a56d] shadow">
            <h2 className="text-[#8b5a2b] font-bold text-sm">Login</h2>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-6">
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#8b5a2b] w-20">Email</span>
              <input
                name="email"
                value={formData.email}
                onChange={handleChange}
                type="email"
                placeholder="enter email"
                className="flex-1 bg-[#fffaf2] border-2 border-[#e6cfae] rounded-full px-4 py-2 outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-[#8b5a2b] w-20">Password</span>
              <input
                name="password"
                value={formData.password}
                onChange={handleChange}
                type="password"
                placeholder="enter password"
                className="flex-1 bg-[#fffaf2] border-2 border-[#e6cfae] rounded-full px-4 py-2 outline-none"
              />
            </div>

            <button
              type="submit"
              className="mt-4 bg-[#6ec6c2] cursor-pointer hover:bg-[#5bb3af] text-white py-2 rounded-full shadow-md font-medium"
            >
              Login
            </button>

            <div className="text-center text-sm text-[#8b5a2b] mt-2">
              Not registered yet?
              <Link to="/register" className="ml-1 hover:underline">
                Register
              </Link>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default LoginSection;
