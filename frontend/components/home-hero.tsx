import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomeHero() {
  return (
    <main className="relative z-10 flex items-end min-h-[calc(100vh-80px)] px-6 pb-24">
      <div className="max-w-2xl space-y-8">
        <div className="space-y-2">
          <div className="text-sm text-primary font-medium tracking-wide uppercase">
            ✨ New AI Agent Experience
          </div>
          <h1 className="text-6xl md:text-7xl font-bold text-balance leading-tight">
            Beautiful AI Agent
            <br />
            <span className="text-primary">Experiences</span>
          </h1>
        </div>

        <p className="text-xl text-muted-foreground max-w-lg text-pretty leading-relaxed">
          Create stunning AI agents with our advanced blockchain technology.
          Interactive ownership, seamless rentals, and beautiful experiences
          that respond to your every need.
        </p>

        <div className="flex gap-4 pt-4">
          <Button
            asChild
            size="lg"
            className="text-lg px-8 py-6 bg-primary hover:bg-primary/90"
          >
            <Link href="/marketplace">Explore AI</Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="text-lg px-8 py-6 bg-background/50 backdrop-blur-sm border-primary/20 hover:bg-primary/10"
          >
            <Link href="/create">Get Started</Link>
          </Button>
        </div>
      </div>

      <div className="absolute bottom-8 right-8 w-24 h-24 rounded-full border-2 border-primary/20 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-primary animate-pulse" />
        </div>
      </div>
    </main>
  );
}
