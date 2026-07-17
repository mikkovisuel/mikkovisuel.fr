"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";

interface ResolvedPillar {
  id: string;
  slug: string;
  title: string;
  description: string;
  order: number;
  cover: string;
}

const bentoAreas = ["a", "b", "c", "d", "e"];

export function PortfolioGrid({ pillars }: { pillars: ResolvedPillar[] }) {
  const reduce = useReducedMotion();
  const sorted = [...pillars].sort((a, b) => a.order - b.order);
  const isBento = sorted.length === bentoAreas.length;

  return (
    <div className={isBento ? "portfolio-bento is-bento" : "portfolio-bento"}>
      {sorted.map((pillar, index) => (
        <motion.div
          key={pillar.id}
          data-area={isBento ? bentoAreas[index] : undefined}
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{
            duration: 0.6,
            delay: index * 0.06,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          <Link
            href={`/portfolio/${pillar.slug}`}
            className="group relative block h-full min-h-[240px] overflow-hidden rounded-2xl border border-line"
          >
            <Image
              src={pillar.cover}
              alt={pillar.title}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5">
              <h3 className="font-display text-lg font-medium text-white sm:text-xl">
                {pillar.title}
              </h3>
              <p className="mt-1 max-w-[38ch] text-sm text-white/70">
                {pillar.description}
              </p>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
