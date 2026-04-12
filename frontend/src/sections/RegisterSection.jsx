import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const RegisterSection = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    repeatPassword: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.repeatPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      const res = await api.post("/users", {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });

      toast.success("Account created successfully 🎉");
      setTimeout(() => {
        navigate("/login");
      }, 1000);
      console.log(res.data);
    } catch (err) {
      const message = err.response?.data?.message || "Something went wrong";

      toast.error(message);
    }
  };

  return (
    <section
      className="relative min-h-screen flex items-center justify-center px-4"
      style={{
        backgroundImage: "url(/images/register.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 backdrop-blur-sm" />

      <div className="relative z-10 bg-[#e6f2ef] p-2 rounded-[26px] border-[3px] border-[#b7d6cf] shadow-xl w-full max-w-140">
        <div className="relative bg-[#f4fbf9] rounded-[20px] px-4 sm:px-6 py-8 border-2 border-[#cfe7e2]">
          <div className="absolute -top-5 sm:-top-6 left-1/2 -translate-x-1/2 bg-[#bfe6df] px-4 sm:px-6 py-1.5 sm:py-2 rounded-full border-2 border-[#8fc9bf] shadow">
            <h2 className="text-[#2f6f68] font-bold text-xs sm:text-sm tracking-wide">
              Register
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start mt-4">
            <form
              onSubmit={handleSubmit}
              className="flex-1 w-full flex flex-col gap-3"
            >
              <div className="flex items-center gap-2 w-full">
                <span className="text-xs sm:text-sm text-[#2f6f68] w-20 shrink-0">
                  Username
                </span>
                <input
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="enter username"
                  className="flex-1 bg-white border-2 border-[#cfe7e2] rounded-full px-4 py-2 text-sm outline-none"
                />
              </div>

              <div className="flex items-center gap-2 w-full">
                <span className="text-xs sm:text-sm text-[#2f6f68] w-20 shrink-0">
                  Email
                </span>
                <input
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  type="email"
                  placeholder="enter email"
                  className="flex-1 bg-white border-2 border-[#cfe7e2] rounded-full px-4 py-2 text-sm outline-none"
                />
              </div>

              <div className="flex items-center gap-2 w-full">
                <span className="text-xs sm:text-sm text-[#2f6f68] w-20 shrink-0">
                  Password
                </span>
                <input
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  type="password"
                  placeholder="enter password"
                  className="flex-1 bg-white border-2 border-[#cfe7e2] rounded-full px-4 py-2 text-sm outline-none"
                />
              </div>

              <div className="flex items-center gap-2 w-full">
                <span className="text-xs sm:text-sm text-[#2f6f68] w-20 shrink-0">
                  Repeat
                </span>
                <input
                  name="repeatPassword"
                  value={formData.repeatPassword}
                  onChange={handleChange}
                  type="password"
                  placeholder="repeat password"
                  className="flex-1 bg-white border-2 border-[#cfe7e2] rounded-full px-4 py-2 text-sm outline-none"
                />
              </div>

              <button
                type="submit"
                className="mt-4 cursor-pointer bg-[#6ec6c2] hover:bg-[#5bb3af] text-white py-2 rounded-full shadow-md font-medium"
              >
                Create Account
              </button>

              <div className="text-center text-sm text-[#2f6f68]">
                Already registered?
                <Link to="/login" className="hover:underline ml-1">
                  Login
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RegisterSection;
