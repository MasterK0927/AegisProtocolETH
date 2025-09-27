import ShaderBackground from "@/components/shader-background";
import HomeHeader from "@/components/home-header";
import HomeHero from "@/components/home-hero";

export default function HomePage() {
  return (
    <ShaderBackground>
      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="absolute inset-0 animated-gradient opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/60 to-background/80" />

        <HomeHeader />

        <HomeHero />
      </div>
    </ShaderBackground>
  );
}
