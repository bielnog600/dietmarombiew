import React, { useState, useEffect } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Start fade out after 3.5 seconds
    const fadeTimeout = setTimeout(() => {
      setIsVisible(false);
    }, 1500);

    // Complete transition and notify parent after 4 seconds
    const finishTimeout = setTimeout(() => {
      onFinish();
    }, 1000);

    return () => {
      clearTimeout(fadeTimeout);
      clearTimeout(finishTimeout);
    };
  }, [onFinish]);

  return (
    <div 
      className={`fixed inset-0 bg-[rgb(23,23,23)] flex flex-col items-center justify-center z-50 transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ height: '100dvh' }}
    >
      <img 
        src="https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WFlh1WFWGtO11jwoHGnd/pub/1eaqdsHJVJbwEvSURATP.png"
        alt="DIETA"
        className="w-40 h-40 mb-8 animate-pulse"
      />
      <div className="w-16 h-16 border-4 border-[#f8c045] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}