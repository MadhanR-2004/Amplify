'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GradientBackground from '@/components/GradientBackground';

export default function Home() {
  const router = useRouter();

  return (
    <GradientBackground>
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-16">
          {/* Hero Section */}
          <div className="text-center text-white mb-16">
            <div className="mb-6 flex justify-center">
              <img
  src="/logo.png"
  alt="Music Streaming App"
  className="h-20 sm:h-24 md:h-32 w-auto drop-shadow-lg" // Increased from h-16/h-20/h-24
  onError={(e) => { (e.target as HTMLImageElement).src = '/default-thumbnail.svg'; }}
/>
            </div>
            <p className="text-xl mb-8 text-gray-100 max-w-2xl mx-auto">
              Discover, stream, and enjoy millions of songs. Create playlists, follow artists, and immerse yourself in the world of music.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/auth/register"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
              >
                Get Started
              </Link>
              <Link
                href="/auth/login"
                className="border border-white text-white hover:bg-white hover:text-gray-900 px-8 py-3 rounded-lg font-semibold transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>

        {/* Removed feature cards and demo section as requested */}
      </div>
      </div>
    </GradientBackground>
  );
}
