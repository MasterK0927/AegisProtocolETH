import Link from "next/link";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type HomeHeaderProps = {
  variant?: "default" | "landing";
};

export default function HomeHeader({ variant = "default" }: HomeHeaderProps) {
  return (
    <>
      <nav
        className={cn(
          "fixed inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-4",
          variant === "landing"
            ? "landing-header"
            : "bg-background/40 backdrop-blur-lg"
        )}
      >
        <Link
          href="/"
          className={cn(
            "flex items-center space-x-2",
            variant === "landing" && "landing-header__brand"
          )}
        >
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">Æ</span>
          </div>
          <span
            className={cn(
              "text-xl font-bold text-foreground",
              variant === "landing" && "landing-header__brand-text"
            )}
          >
            Aegis Protocol
          </span>
        </Link>

        <div className="flex items-center space-x-6">
          <Link
            href="/marketplace"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Marketplace
          </Link>
          <Link
            href="/create"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Create
          </Link>
          <Button
            variant="outline"
            size="sm"
            className={cn(variant === "landing" && "landing-header__cta")}
          >
            Connect Wallet
          </Button>
        </div>
      </nav>
      <div className="h-20" aria-hidden />
    </>
  );
}
