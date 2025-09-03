'use client';

import GradientBackground from '@/components/GradientBackground';
import ArtistDiscographyDemo from '@/components/ArtistDiscographyDemo';

export default function DemoPage() {
  return (
    <>
      <GradientBackground />
      <div className="min-h-screen relative z-10">
        <ArtistDiscographyDemo />
      </div>
    </>
  );
}
