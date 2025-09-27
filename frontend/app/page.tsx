import ShaderBackground from "@/components/shader-background";
import HomeHeader from "@/components/home-header";
import HomeHero from "@/components/home-hero";

export default function HomePage() {
  return (
    <ShaderBackground>
      <div className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 animated-gradient opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-br from-background/40 via-background/20 to-background/40" />

        <HomeHeader />

        <HomeHero />
      </div>
    </ShaderBackground>
  );
}
