import { Link } from "react-router";
import daloyMark from "../assets/daloy-mark.png";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src={daloyMark} alt="DALOY" className="h-11 w-auto sm:h-12" />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Features</a>
          <a href="#flow" className="text-sm text-muted-foreground transition-colors hover:text-foreground">How it works</a>
          <a href="#pricing" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Pricing</a>
          <a href="#faq" className="text-sm text-muted-foreground transition-colors hover:text-foreground">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="hidden text-sm font-medium text-foreground/80 transition-colors hover:text-foreground sm:inline"
          >
            Sign in
          </Link>
          <Link
            to="/login"
            className="btn-primary h-9 px-4 text-sm shadow-sm hover:shadow-md"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
