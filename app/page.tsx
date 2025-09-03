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
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-pink-400 bg-clip-text text-transparent">
              🎵 Music Streaming App
            </h1>
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

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-white">
            <div className="text-4xl mb-4">🎧</div>
            <h3 className="text-xl font-semibold mb-2">High Quality Audio</h3>
            <p className="text-gray-300">
              Experience your favorite music in crystal clear quality with our advanced audio streaming technology.
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-white">
            <div className="text-4xl mb-4">📱</div>
            <h3 className="text-xl font-semibold mb-2">Cross Platform</h3>
            <p className="text-gray-300">
              Access your music library from any device - mobile, tablet, or desktop. Your music follows you everywhere.
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 text-white">
            <div className="text-4xl mb-4">🎵</div>
            <h3 className="text-xl font-semibold mb-2">Personal Playlists</h3>
            <p className="text-gray-300">
              Create unlimited playlists, discover new music, and share your favorite songs with friends.
            </p>
          </div>
        </div>

        {/* Demo Section */}
        <div className="text-center text-white">
          <h2 className="text-3xl font-bold mb-8">Ready to Start Your Musical Journey?</h2>
          <div className="bg-white/5 backdrop-blur-lg rounded-xl p-8 max-w-md mx-auto">
            <h3 className="text-xl font-semibold mb-4">Try Demo Account</h3>
            <p className="text-gray-300 mb-4">
              Experience the app with our demo account (no registration required)
            </p>
            <button
              onClick={() => router.push('/demo')}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-lg font-semibold transition-all"
            >
              Try Demo
            </button>
          </div>
        </div>
      </div>
      </div>
    </GradientBackground>
  );
}
