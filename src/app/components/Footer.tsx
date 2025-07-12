
import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-[#111111] py-6">
      <div className="container mx-auto px-6 text-center">
        <div className="mb-3 flex justify-center space-x-6">
          <a href="#" className="text-gray-100 hover:text-[var(--accent)] transition duration-200">About</a>
          <a href="/contact" className="text-gray-100 hover:text-[var(--accent)] transition duration-200">Contact</a>
          <a href="#" className="text-gray-100 hover:text-[var(--accent)] transition duration-200">Terms</a>
        </div>
        <p className="text-gray-400 text-sm">© {new Date().getFullYear()} ScreenMe. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
