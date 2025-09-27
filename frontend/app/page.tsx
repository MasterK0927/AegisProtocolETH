import "./home.css";

import ShaderBackground from "@/components/shader-background";
import HomeHeader from "@/components/home-header";
import HomeHero from "@/components/home-hero";

export default function HomePage() {
  return (
    <ShaderBackground>
      <div className="home-page relative min-h-screen overflow-hidden">
        <div className="home-gradient animated-gradient" />
        <div className="home-gradient-overlay" />

        <HomeHeader variant="landing" />

        <HomeHero />
      </div>
    </ShaderBackground>
  );
}
