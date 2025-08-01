import { Link } from "wouter";
import { Github, Twitter, Instagram, MessageCircle } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-brand-dark-purple/50 border-t border-white/10">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <img src="/fandomly-logo.png" alt="Fandomly" className="h-8 w-auto" />
              <span className="text-3xl font-bold gradient-text">Fandomly</span>
            </div>
            <p className="text-gray-300 mb-6 max-w-md">
              The ultimate platform for creators to build lasting relationships with their fans through innovative loyalty programs and Web3 rewards.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-gray-300 hover:text-brand-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-gray-300 hover:text-brand-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-gray-300 hover:text-brand-primary transition-colors">
                <MessageCircle className="h-5 w-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-gray-300 hover:text-brand-primary transition-colors">
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold text-white mb-6">Product</h4>
            <ul className="space-y-4">
              <li><Link href="/#features" className="text-gray-300 hover:text-brand-secondary transition-colors">Features</Link></li>
              <li><Link href="/#pricing" className="text-gray-300 hover:text-brand-secondary transition-colors">Pricing</Link></li>
              <li><a href="#" className="text-gray-300 hover:text-brand-secondary transition-colors">API</a></li>
              <li><a href="#" className="text-gray-300 hover:text-brand-secondary transition-colors">Integrations</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold text-white mb-6">Support</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-gray-300 hover:text-brand-secondary transition-colors">Documentation</a></li>
              <li><a href="#" className="text-gray-300 hover:text-brand-secondary transition-colors">Help Center</a></li>
              <li><a href="#" className="text-gray-300 hover:text-brand-secondary transition-colors">Contact</a></li>
              <li><a href="#" className="text-gray-300 hover:text-brand-secondary transition-colors">Status</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="text-gray-400 text-sm">
            © 2024 Fandomly. All rights reserved.
          </div>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-gray-400 hover:text-brand-secondary text-sm transition-colors">Privacy Policy</a>
            <a href="#" className="text-gray-400 hover:text-brand-secondary text-sm transition-colors">Terms of Service</a>
            <a href="#" className="text-gray-400 hover:text-brand-secondary text-sm transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
