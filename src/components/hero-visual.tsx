"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

const ENTRANCE_EASE = [0.16, 1, 0.3, 1] as const;
const ENTRANCE_DURATION = 0.9;

export function HeroVisual({ mainSrc, detailSrc }: { mainSrc: string; detailSrc: string }) {
  const reduce = useReducedMotion();

  // Balancement perpétuel : une légère rotation 2D en boucle, indépendante
  // du tournant 3D d'entrée (rotateY), démarrée une fois l'entrée terminée
  // (delay = fin de l'entrée) pour ne pas se superposer visuellement.
  // Désactivée entièrement si l'utilisateur préfère moins d'animations.
  const mainSway = reduce
    ? undefined
    : { rotate: { duration: 6, repeat: Infinity, ease: "easeInOut" as const, delay: ENTRANCE_DURATION } };
  const detailSway = reduce
    ? undefined
    : {
        rotate: {
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut" as const,
          delay: ENTRANCE_DURATION + 0.2,
        },
      };

  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-xl lg:max-w-none">
      <div
        aria-hidden
        className="absolute -right-10 -top-10 -z-10 h-56 w-56 rounded-full bg-brand-orange/30 blur-3xl"
      />
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 20, rotateY: -32, scale: 0.94 }}
        animate={{
          opacity: 1,
          y: 0,
          rotateY: 0,
          scale: 1,
          ...(reduce ? {} : { rotate: [0, -2.5, 2.5, 0] }),
        }}
        transition={{
          opacity: { duration: ENTRANCE_DURATION, ease: ENTRANCE_EASE },
          y: { duration: ENTRANCE_DURATION, ease: ENTRANCE_EASE },
          rotateY: { duration: ENTRANCE_DURATION, ease: ENTRANCE_EASE },
          scale: { duration: ENTRANCE_DURATION, ease: ENTRANCE_EASE },
          ...mainSway,
        }}
        style={{ transformPerspective: 1400 }}
        className="absolute inset-0 overflow-hidden rounded-2xl border border-line"
      >
        <Image
          src={mainSrc}
          alt="Direction artistique réalisée par Mikko Visuel pour une soirée club"
          fill
          priority
          sizes="(min-width: 1024px) 55vw, 90vw"
          className="object-cover"
        />
      </motion.div>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 20, rotateY: 32, scale: 0.94 }}
        animate={{
          opacity: 1,
          y: 0,
          rotateY: 0,
          scale: 1,
          ...(reduce ? {} : { rotate: [0, 2, -2, 0] }),
        }}
        transition={{
          opacity: { duration: ENTRANCE_DURATION, delay: 0.2, ease: ENTRANCE_EASE },
          y: { duration: ENTRANCE_DURATION, delay: 0.2, ease: ENTRANCE_EASE },
          rotateY: { duration: ENTRANCE_DURATION, delay: 0.2, ease: ENTRANCE_EASE },
          scale: { duration: ENTRANCE_DURATION, delay: 0.2, ease: ENTRANCE_EASE },
          ...detailSway,
        }}
        style={{ transformPerspective: 1400 }}
        className="absolute -bottom-8 -left-6 aspect-[3/4] w-2/5 overflow-hidden rounded-2xl border border-line shadow-xl sm:-left-10"
      >
        <Image
          src={detailSrc}
          alt="Détail d'un flyer club signé Mikko Visuel"
          fill
          sizes="(min-width: 1024px) 20vw, 40vw"
          className="object-cover"
        />
      </motion.div>
    </div>
  );
}
