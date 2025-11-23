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
      <div className="relative flex items-center justify-center">
        <img
          src="https://storage.googleapis.com/glide-prod.appspot.com/uploads-v2/WFlh1WFWGtO11jwoHGnd/pub/1eaqdsHJVJbwEvSURATP.png"
          alt="DIETA"
          className="w-40 h-40 z-10 animate-pulse"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-48 h-48 animate-spin-slow" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#f8c045"
              strokeWidth="3"
              strokeDasharray="70 200"
              strokeLinecap="round"
              className="opacity-80"
            />
          </svg>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-52 h-52 animate-spin-reverse" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="48"
              fill="none"
              stroke="#f8c045"
              strokeWidth="2"
              strokeDasharray="40 200"
              strokeLinecap="round"
              className="opacity-40"
            />
          </svg>
        </div>
      </div>

      <style>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes spin-reverse {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }

        .animate-spin-slow {
          animation: spin-slow 2s linear infinite;
        }

        .animate-spin-reverse {
          animation: spin-reverse 3s linear infinite;
        }
      `}</style>
    </div>
  );
}