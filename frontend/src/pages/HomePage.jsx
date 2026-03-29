import React from "react";
import HeroSection from "../sections/HeroSection";
import AboutSection from "../sections/AboutSection";
import VideoPinSection from "../sections/VideoPinSection";
import CardsSection from "../sections/CardsSection";

const HomePage = () => {
  return (
    <main>
      <HeroSection />
      <AboutSection />
      <VideoPinSection />
      <CardsSection />
    </main>
  );
};

export default HomePage;
