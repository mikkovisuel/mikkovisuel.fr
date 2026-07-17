"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

export function HeroVisual({ mainSrc, detailSrc }: { mainSrc: string; detailSrc: string }) {
  const reduce = useReducedMotion();

  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-xl lg:max-w-none">
      <div
        aria-hidden
        className="absolute -right-10 -top-10 -z-10 h-56 w-56 rounded-full bg-brand-orange/30 blur-3xl"
      />
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
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
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
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
