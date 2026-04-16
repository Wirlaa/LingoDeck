import { Navbar } from "./components/Navbar";
import gsap from "gsap";
import { ScrollSmoother, ScrollTrigger, SplitText } from "gsap/all";
import { useGSAP } from "@gsap/react";
import FooterSection from "./sections/FooterSection";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useEffect, useState } from "react";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import QuestPage from "./pages/QuestPage";
import CardRewardPage from "./pages/CardRewardPage";
import ChallengePage from "./pages/ChallengePage";
import ProfilePage from "./pages/ProfilePage";

function isAuthenticated() {
  try {
    const user = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    return Boolean(user && token);
  } catch {
    return false;
  }
}

function ProtectedRoute({ children }) {
  const [authenticated, setAuthenticated] = useState(isAuthenticated());

  useEffect(() => {
    const syncAuth = () => setAuthenticated(isAuthenticated());

    window.addEventListener("storage", syncAuth);
    return () => {
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  if (!authenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

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
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quest"
              element={
                <ProtectedRoute>
                  <QuestPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/challenge"
              element={
                <ProtectedRoute>
                  <ChallengePage />
                </ProtectedRoute>
              }
            />
            <Route path="/reward" element={<CardRewardPage />} />
          </Routes>
          <FooterSection />
        </div>
      </div>
    </>
  );
};

export default App;
