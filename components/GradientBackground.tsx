'use client';

import { useEffect, useRef } from 'react';
import { NeatGradient } from "@firecms/neat";
import { config } from '@/lib/gradient-config';
import { loadTheme, getThemeById } from '@/lib/themes';

interface GradientBackgroundProps {
  className?: string;
  children?: React.ReactNode;
}

export default function GradientBackground({ className = '', children }: GradientBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const neatRef = useRef<NeatGradient | null>(null);

  useEffect(() => {
    if (canvasRef.current && !neatRef.current) {
      try {
        // Load saved theme or use default
        const savedTheme = loadTheme();
        const themeConfig = getThemeById(savedTheme);
        const currentConfig = { ...config, ...themeConfig.config };

        neatRef.current = new NeatGradient({
          ref: canvasRef.current,
          ...currentConfig
        });
      } catch (error) {
        console.error('Error initializing gradient:', error);
      }
    }

    // Listen for theme changes
    const handleThemeChange = (event: CustomEvent) => {
      if (neatRef.current && event.detail?.theme) {
        try {
          neatRef.current.destroy();
          neatRef.current = new NeatGradient({
            ref: canvasRef.current!,
            ...config,
            ...event.detail.theme
          });
        } catch (error) {
          console.error('Error updating gradient theme:', error);
        }
      }
    };

    window.addEventListener('backgroundThemeChange', handleThemeChange as EventListener);

    // Cleanup function
    return () => {
      window.removeEventListener('backgroundThemeChange', handleThemeChange as EventListener);
      if (neatRef.current) {
        try {
          neatRef.current.destroy();
          neatRef.current = null;
        } catch (error) {
          console.error('Error destroying gradient:', error);
        }
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Gradient Canvas */}
      <canvas 
        ref={canvasRef}
        className="fixed inset-0 -z-10 w-full h-full"
        style={{ 
          width: '100vw', 
          height: '100vh',
          pointerEvents: 'none'
        }}
      />
      
      {/* Content overlay */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
