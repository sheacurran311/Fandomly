import { Link } from "wouter";

export default function MinimalFooter() {
  return (
    <footer className="bg-brand-dark-purple/50 border-t border-white/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-gray-400 text-sm">
            © 2024 Fandomly. All rights reserved.
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link href="/privacy-policy" className="text-gray-400 hover:text-brand-secondary text-sm transition-colors">
              Privacy Policy
            </Link>
            <Link href="/data-deletion" className="text-gray-400 hover:text-brand-secondary text-sm transition-colors">
              Data Deletion
            </Link>
            <Link href="/terms-of-service" className="text-gray-400 hover:text-brand-secondary text-sm transition-colors">
              Terms of Service
            </Link>
            <a href="#" className="text-gray-400 hover:text-brand-secondary text-sm transition-colors">
              Cookie Policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

