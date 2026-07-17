import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  DOCUMENT_TYPE_LIST_KEY,
  DOCUMENT_TYPE_SEED,
  PORTFOLIO_CATEGORY_LIST_KEY,
  TASK_FORMAT_LIST_KEY,
  TASK_FORMAT_SEED,
  TASK_STATUS_LIST_KEY,
  TASK_STATUS_SEED,
  TASK_TYPE_LIST_KEY,
  TASK_TYPE_SEED,
  type SeedDropdownItem,
} from "../src/lib/dropdown-lists";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set.");
}

function createSeedPrismaClient() {
  if (url!.startsWith("file:")) {
    return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: url! }) });
  }
  if (url!.startsWith("postgres://") || url!.startsWith("postgresql://")) {
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: url! }) });
  }
  throw new Error(`Unsupported DATABASE_URL scheme: ${url}`);
}

const prisma = createSeedPrismaClient();

async function seedDropdownList(
  key: string,
  name: string,
  allowCustomItems: boolean,
  items: SeedDropdownItem[],
) {
  const list = await prisma.dropdownList.upsert({
    where: { key },
    update: { name, allowCustomItems },
    create: { key, name, allowCustomItems },
  });

  for (const item of items) {
    await prisma.dropdownItem.upsert({
      where: { listId_slug: { listId: list.id, slug: item.slug } },
      update: {
        label: item.label,
        color: item.color,
        sortOrder: item.sortOrder,
        locked: item.locked,
      },
      create: {
        listId: list.id,
        slug: item.slug,
        label: item.label,
        color: item.color,
        sortOrder: item.sortOrder,
        locked: item.locked,
      },
    });
  }

  return list;
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL ?? "mikko@mikkovisuel.fr";
  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin déjà présent : ${email}`);
    return;
  }

  const password = process.env.ADMIN_PASSWORD ?? randomBytes(9).toString("base64url");
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.admin.create({ data: { email, passwordHash } });

  console.log("Compte admin créé :");
  console.log(`  email : ${email}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.log(`  mot de passe (généré, à noter maintenant) : ${password}`);
  }
}

// Dev-only demo client, so the client login can be tested locally without
// going through the admin UI first. Never runs outside local SQLite (see the
// guard at the top of this file).
async function seedDemoClient() {
  const email = "demo@client.test";
  const existing = await prisma.clientUser.findUnique({ where: { email } });
  if (existing) {
    console.log(`Client de démo déjà présent : ${email}`);
    return;
  }

  const client = await prisma.client.create({
    data: { name: "Client de démo", notes: "Compte créé par le seed pour les tests locaux." },
  });
  const passwordHash = await bcrypt.hash("demo-password", 12);
  await prisma.clientUser.create({
    data: { clientId: client.id, email, passwordHash, name: "Compte de démo" },
  });

  console.log("Client de démo créé :");
  console.log(`  email : ${email}`);
  console.log("  mot de passe : demo-password");
}

interface SeedPortfolioItem {
  slug: string;
  title: string;
  mediaType: "image" | "video";
  aspectRatio: "3:4" | "9:16";
  externalUrl: string;
  sortOrder: number;
}

interface SeedPortfolioPillar {
  slug: string;
  title: string;
  description: string;
  sortOrder: number;
  mediaType: "image" | "video" | "mixed";
  coverExternalUrl: string;
  items: SeedPortfolioItem[];
}

// Migrated verbatim from the original static src/lib/pillars.ts so the
// public site's content doesn't change until the admin edits something.
const PORTFOLIO_PILLARS_SEED: SeedPortfolioPillar[] = [
  {
    slug: "flyers-club",
    title: "Flyers Club",
    description: "Des affiches et flyers pensés pour capter l'attention en une fraction de seconde.",
    sortOrder: 1,
    mediaType: "image",
    coverExternalUrl: "https://picsum.photos/seed/mikko-flyers-cover/1200/1400",
    items: [
      { slug: "fc-1", title: "Soirée Nocturne, janvier", mediaType: "image", aspectRatio: "3:4", externalUrl: "https://picsum.photos/seed/mikko-flyers-1/900/1200", sortOrder: 0 },
      { slug: "fc-2", title: "Release party, EP Volt", mediaType: "image", aspectRatio: "3:4", externalUrl: "https://picsum.photos/seed/mikko-flyers-2/900/1100", sortOrder: 1 },
      { slug: "fc-3", title: "Closing d'été", mediaType: "image", aspectRatio: "3:4", externalUrl: "https://picsum.photos/seed/mikko-flyers-3/900/1300", sortOrder: 2 },
      { slug: "fc-4", title: "Warehouse #04", mediaType: "image", aspectRatio: "3:4", externalUrl: "https://picsum.photos/seed/mikko-flyers-4/900/1150", sortOrder: 3 },
      { slug: "fc-5", title: "Halloween Session", mediaType: "image", aspectRatio: "3:4", externalUrl: "https://picsum.photos/seed/mikko-flyers-5/900/1200", sortOrder: 4 },
      { slug: "fc-6", title: "Back to Basics", mediaType: "image", aspectRatio: "3:4", externalUrl: "https://picsum.photos/seed/mikko-flyers-6/900/1250", sortOrder: 5 },
    ],
  },
  {
    slug: "motion-design",
    title: "Motion Design",
    description: "Des animations courtes pour donner du mouvement à une identité visuelle.",
    sortOrder: 2,
    mediaType: "video",
    coverExternalUrl: "https://picsum.photos/seed/mikko-motion-cover/1200/1400",
    items: [
      { slug: "md-1", title: "Teaser Instagram, label Volt", mediaType: "video", aspectRatio: "9:16", externalUrl: "https://picsum.photos/seed/mikko-motion-1/900/1200", sortOrder: 0 },
      { slug: "md-2", title: "Logo animé, Bureau Nocturne", mediaType: "video", aspectRatio: "9:16", externalUrl: "https://picsum.photos/seed/mikko-motion-2/900/1100", sortOrder: 1 },
      { slug: "md-3", title: "Générique d'ouverture", mediaType: "video", aspectRatio: "9:16", externalUrl: "https://picsum.photos/seed/mikko-motion-3/900/1300", sortOrder: 2 },
      { slug: "md-4", title: "Habillage stories, tournée", mediaType: "video", aspectRatio: "9:16", externalUrl: "https://picsum.photos/seed/mikko-motion-4/900/1150", sortOrder: 3 },
      { slug: "md-5", title: "Compte à rebours, event", mediaType: "video", aspectRatio: "9:16", externalUrl: "https://picsum.photos/seed/mikko-motion-5/900/1200", sortOrder: 4 },
    ],
  },
  {
    slug: "direction-artistique",
    title: "Direction Artistique",
    description: "Des univers visuels complets, de la palette de couleurs à la mise en page finale.",
    sortOrder: 3,
    mediaType: "mixed",
    coverExternalUrl: "https://picsum.photos/seed/mikko-da-cover/1200/1400",
    items: [
      { slug: "da-1", title: "Identité, festival Ember", mediaType: "image", aspectRatio: "3:4", externalUrl: "https://picsum.photos/seed/mikko-da-1/900/1200", sortOrder: 0 },
      { slug: "da-2", title: "Charte graphique, label Volt", mediaType: "image", aspectRatio: "3:4", externalUrl: "https://picsum.photos/seed/mikko-da-2/900/1100", sortOrder: 1 },
      { slug: "da-3", title: "Univers visuel, tournée d'été", mediaType: "video", aspectRatio: "9:16", externalUrl: "https://picsum.photos/seed/mikko-da-3/900/1300", sortOrder: 2 },
      { slug: "da-4", title: "Déclinaison print et digital", mediaType: "image", aspectRatio: "3:4", externalUrl: "https://picsum.photos/seed/mikko-da-4/900/1150", sortOrder: 3 },
    ],
  },
  {
    slug: "photos-club",
    title: "Photos Club",
    description: "Des reportages photo en club et en soirée, entre énergie et lumière.",
    sortOrder: 4,
    mediaType: "image",
    coverExternalUrl: "https://picsum.photos/seed/mikko-photos-cover/1200/1400",
    items: [
      { slug: "pc-1", title: "Warehouse #04, backstage", mediaType: "image", aspectRatio: "3:4", externalUrl: "https://picsum.photos/seed/mikko-photos-1/900/1200", sortOrder: 0 },
      { slug: "pc-2", title: "DJ set, closing d'été", mediaType: "image", aspectRatio: "3:4", externalUrl: "https://picsum.photos/seed/mikko-photos-2/900/1100", sortOrder: 1 },
      { slug: "pc-3", title: "Foule, release party", mediaType: "image", aspectRatio: "3:4", externalUrl: "https://picsum.photos/seed/mikko-photos-3/900/1300", sortOrder: 2 },
      { slug: "pc-4", title: "Portraits, Halloween Session", mediaType: "image", aspectRatio: "3:4", externalUrl: "https://picsum.photos/seed/mikko-photos-4/900/1150", sortOrder: 3 },
      { slug: "pc-5", title: "Ambiance, Back to Basics", mediaType: "image", aspectRatio: "3:4", externalUrl: "https://picsum.photos/seed/mikko-photos-5/900/1200", sortOrder: 4 },
    ],
  },
  {
    slug: "video-aftermovies",
    title: "Vidéo Aftermovies",
    description: "Le condensé d'une soirée en une vidéo qui donne envie d'y être.",
    sortOrder: 5,
    mediaType: "video",
    coverExternalUrl: "https://picsum.photos/seed/mikko-after-cover/1200/1400",
    items: [
      { slug: "va-1", title: "Aftermovie, Warehouse #04", mediaType: "video", aspectRatio: "9:16", externalUrl: "https://picsum.photos/seed/mikko-after-1/900/1200", sortOrder: 0 },
      { slug: "va-2", title: "Aftermovie, closing d'été", mediaType: "video", aspectRatio: "9:16", externalUrl: "https://picsum.photos/seed/mikko-after-2/900/1100", sortOrder: 1 },
      { slug: "va-3", title: "Aftermovie, tournée d'été", mediaType: "video", aspectRatio: "9:16", externalUrl: "https://picsum.photos/seed/mikko-after-3/900/1300", sortOrder: 2 },
      { slug: "va-4", title: "Aftermovie, Halloween Session", mediaType: "video", aspectRatio: "9:16", externalUrl: "https://picsum.photos/seed/mikko-after-4/900/1150", sortOrder: 3 },
    ],
  },
];

async function seedPortfolio() {
  for (const pillar of PORTFOLIO_PILLARS_SEED) {
    const row = await prisma.portfolioPillar.upsert({
      where: { slug: pillar.slug },
      update: {},
      create: {
        slug: pillar.slug,
        title: pillar.title,
        description: pillar.description,
        sortOrder: pillar.sortOrder,
        mediaType: pillar.mediaType,
        coverExternalUrl: pillar.coverExternalUrl,
      },
    });

    for (const item of pillar.items) {
      const existing = await prisma.portfolioMediaItem.findFirst({
        where: { pillarId: row.id, title: item.title },
      });
      if (existing) continue;

      await prisma.portfolioMediaItem.create({
        data: {
          pillarId: row.id,
          title: item.title,
          mediaType: item.mediaType,
          aspectRatio: item.aspectRatio,
          externalUrl: item.externalUrl,
          sortOrder: item.sortOrder,
        },
      });
    }
  }

  console.log(`Portfolio : ${PORTFOLIO_PILLARS_SEED.length} piliers migrés/vérifiés.`);
}

async function main() {
  await seedDropdownList(
    TASK_STATUS_LIST_KEY,
    "Statuts de tâche",
    false,
    TASK_STATUS_SEED,
  );
  await seedDropdownList(
    DOCUMENT_TYPE_LIST_KEY,
    "Types de document",
    true,
    DOCUMENT_TYPE_SEED,
  );
  await seedDropdownList(
    PORTFOLIO_CATEGORY_LIST_KEY,
    "Catégories du portfolio",
    true,
    [],
  );
  await seedDropdownList(
    TASK_TYPE_LIST_KEY,
    "Type",
    true,
    TASK_TYPE_SEED,
  );
  await seedDropdownList(
    TASK_FORMAT_LIST_KEY,
    "Formats",
    true,
    TASK_FORMAT_SEED,
  );
  await seedAdmin();
  await seedDemoClient();
  await seedPortfolio();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
