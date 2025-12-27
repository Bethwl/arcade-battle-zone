import { useState, useEffect } from 'react';
import './LandingPage.css';

type LandingPageProps = {
  onStart: () => void;
};

export function LandingPage({ onStart }: LandingPageProps) {
  const [showLogo, setShowLogo] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    // Animation sequence
    setTimeout(() => setShowLogo(true), 1000);   // Logo after 1s
    setTimeout(() => setShowButton(true), 3000); // Button after 3s
  }, []);

  return (
    <div className="landing-page">
      {/* CRT Boot Effect */}
      <div className="crt-boot"></div>

      {/* Animated Background */}
      <div className="starfield"></div>
      <div className="scanlines"></div>

      {/* Main Content */}
      <div className="landing-content">
        {/* Logo */}
        {showLogo && (
          <div className="logo-container fade-in">
            <h1 className="landing-title">FHE ROCK•PAPER•SCISSORS</h1>
            <p className="landing-subtitle">ENCRYPTED GAMING ON BLOCKCHAIN</p>
          </div>
        )}

        {/* INSERT COIN */}
        {showButton && (
          <div className="insert-coin-container fade-in">
            <div className="coin-graphic">💰</div>
            <div className="insert-coin-text blink">INSERT COIN</div>
          </div>
        )}

        {/* START Button */}
        {showButton && (
          <button
            className="start-button arcade-glow fade-in-delay"
            onClick={onStart}
          >
            <span className="start-text">START GAME</span>
            <span className="start-hint">PRESS TO BEGIN</span>
          </button>
        )}
      </div>

      {/* Decorative Elements */}
      <div className="corner-lights"></div>
    </div>
  );
}
