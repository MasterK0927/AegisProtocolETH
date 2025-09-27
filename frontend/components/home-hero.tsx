import { Figtree, Instrument_Serif } from "next/font/google";

import { cn } from "@/lib/utils";

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-figtree",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "normal",
  display: "swap",
  variable: "--font-instrument-serif",
});

export default function HomeHero() {
  return (
    <main
      className={cn(
        "landing-hero absolute bottom-8 left-8 z-20 max-w-lg",
        figtree.className,
        figtree.variable,
        instrumentSerif.variable
      )}
    >
      <div className="text-left">
        {/* <div
          className="landing-hero__badge inline-flex items-center px-3 py-1 rounded-full bg-white/5 backdrop-blur-sm mb-4 relative"
          style={{
            filter: "url(#glass-effect)",
          }}
        >
          <div className="absolute top-0 left-1 right-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full" />
          <span className="text-white/90 text-xs font-light relative z-10">
            ✨ New Paper Shaders Experience
          </span>
        </div> */}

        <h1 className="text-7xl md:text-7xl md:leading-16 tracking-tight font-light text-white mb-4">
          <span className="font-medium italic instrument">Impressive</span>{" "}
        AI
          <br />
          <span className="font-light tracking-tight text-white">
            Agents
          </span>
        </h1>

        <p className="landing-hero__description text-s font-light text-white/70 mb-4 leading-relaxed">
          Create stunning AI agents with our advanced blockchain technology.
          Interactive ownership, seamless rentals, and beautiful experiences
          that respond to your every need.
        </p>

        <div className="landing-hero__actions flex items-center gap-4 flex-wrap">
          <button className="landing-hero__button landing-hero__button--outline px-8 py-3 rounded-full bg-transparent border border-white/30 text-white font-normal text-xs transition-all duration-200 hover:bg-white/10 hover:border-white/50 cursor-pointer">
            Explore Agents
          </button>
          <button className="landing-hero__button landing-hero__button--solid px-8 py-3 rounded-full bg-white text-black font-normal text-xs transition-all duration-200 hover:bg-white/90 cursor-pointer">
            Get Started
          </button>
        </div>
      </div>
    </main>
  );
}
