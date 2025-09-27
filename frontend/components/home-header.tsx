import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomeHeader() {
  return (
    <nav className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-border/50 backdrop-blur-sm">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">Æ</span>
        </div>
        <span className="text-xl font-bold text-foreground">
          Aegis Protocol
        </span>
      </div>

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
        <Button variant="outline" size="sm">
          Connect Wallet
        </Button>
      </div>
    </nav>
  );
}
