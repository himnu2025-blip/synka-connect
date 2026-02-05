import { Link } from 'react-router-dom';
import { BrandLogo } from '@/components/BrandLogo';

export function Footer() {
  return (
    <footer className="py-8 sm:py-12 px-4 border-t border-border/50 w-full overflow-hidden">
      <div className="container px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
          <BrandLogo size="md" />

          <nav className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <Link to="/support" className="hover:text-foreground transition-colors">
              Support
            </Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">
              Contact
            </Link>
          </nav>

          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Synka™. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
