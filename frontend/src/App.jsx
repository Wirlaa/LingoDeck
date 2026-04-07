import { Navbar } from "./components/Navbar";
import gsap from "gsap";
import { ScrollSmoother, ScrollTrigger, SplitText } from "gsap/all";
import { useGSAP } from "@gsap/react";
import FooterSection from "./sections/FooterSection";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import QuestPage from "./pages/QuestPage";

const App = () => {
  gsap.registerPlugin(ScrollTrigger, ScrollSmoother, SplitText);
  useGSAP(() => {
    ScrollSmoother.create({
      smooth: 1,
      effects: true,
      smoothTouch: 0.1,
    });
  });

  return (
    <>
      <Toaster position="top-right" />
      <Navbar />
      <div id="smooth-wrapper">
        <div id="smooth-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/quest" element={<QuestPage />} />
          </Routes>
          <FooterSection />
        </div>
      </div>
    </>
  );
};

export default App;
