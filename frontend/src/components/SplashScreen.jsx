import { useState, useEffect } from "react";
import docguardLogo from "../assets/docguard-logo.jpg";

export default function SplashScreen({ onFinish }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Keep logo visible for 1.5s, then start 500ms smooth fade-out
    const timer1 = setTimeout(() => {
      setFading(true);
    }, 1500);

    const timer2 = setTimeout(() => {
      if (onFinish) onFinish();
    }, 2000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-white flex items-center justify-center transition-opacity duration-500 ease-out ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ backgroundColor: "#ffffff" }}
    >
      <img
        src={docguardLogo}
        alt="DOCGUARD Logo"
        className="max-w-[220px] max-h-[140px] w-auto h-auto object-contain select-none"
      />
    </div>
  );
}
