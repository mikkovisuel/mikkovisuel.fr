"use client";

import { useEffect, useRef } from "react";

// Aperçu vidéo autoplay dans la grille portfolio : muet + boucle (requis par
// les navigateurs pour autoriser l'autoplay, sinon l'icône lecteur reste
// barrée) et piloté par IntersectionObserver pour ne jouer que les vidéos
// réellement visibles à l'écran.
export function PortfolioVideo({ src, className }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      src={src}
      muted
      loop
      playsInline
      controls
      preload="metadata"
      className={className}
    />
  );
}
