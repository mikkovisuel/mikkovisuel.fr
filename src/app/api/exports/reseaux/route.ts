import { createElement } from "react";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import sharp from "sharp";
import { getAdminSession } from "@/lib/dal";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";
import { logAuditEvent } from "@/lib/audit-log";
import { getClientIp } from "@/lib/request-ip";
import {
  SOCIAL_POST_STATUS,
  engagementRate,
  formatCount,
  formatLabel,
  formatRate,
  formatSchedule,
  networkLabel,
  parseParisDateTimeLocal,
} from "@/lib/social-posts";
import {
  SocialReportDocument,
  type SocialReportKpi,
  type SocialReportPost,
} from "@/components/pdf/social-report-document";

const MONTH_FORMATTER = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
// Garde-fou mémoire (conteneur de production, voir l'incident du
// 2026-07-17) : au-delà, les publications restent listées sans vignette.
const MAX_THUMBNAILS = 40;
const CAPTION_EXCERPT = 280;

// Vignette JPEG (react-pdf ne lit pas le WebP des vignettes du site) du
// premier visuel image d'une publication. Une erreur de lecture ne doit
// jamais empêcher le rapport : la publication s'affiche alors sans image.
async function jpegThumbnail(storageKey: string): Promise<string | null> {
  try {
    const original = await getStorageAdapter().read(storageKey);
    const jpeg = await sharp(original)
      .rotate()
      .resize(240, 300, { fit: "cover" })
      .jpeg({ quality: 70 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

// Intl.NumberFormat("fr-FR") sépare les milliers par une espace fine
// insécable (U+202F), absente de Clash Display : react-pdf l'affichait "1/400"
// (défaut constaté sur le premier rapport généré). Espace normale à la place.
function pdfCount(value: number | null | undefined) {
  return formatCount(value).replace(/[\u202f\u00a0]/g, " ");
}

function signedDelta(value: number) {
  return { text: `${value >= 0 ? "+" : ""}${pdfCount(value)}`, positive: value >= 0 };
}

// Rapport mensuel "réseaux sociaux" d'un client (livraison 2, choix
// "global par client") : chiffres saisis à la main pour le mois + les
// publications marquées publiées sur ce mois (heure de Paris). Admin
// uniquement — c'est l'admin qui l'envoie au client.
export async function GET(request: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse(null, { status: 403 });
  }

  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId") ?? "";
  const year = Number(url.searchParams.get("annee"));
  const month = Number(url.searchParams.get("mois"));
  if (!clientId || !Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12 || year < 2020 || year > 2100) {
    return NextResponse.json({ error: "Paramètres invalides (clientId, annee, mois)." }, { status: 400 });
  }

  const client = await db.client.findUnique({ where: { id: clientId }, select: { id: true, name: true } });
  if (!client) {
    return new NextResponse(null, { status: 404 });
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const monthStart = parseParisDateTimeLocal(`${year}-${pad(month)}-01T00:00`)!;
  const monthEnd = parseParisDateTimeLocal(`${nextYear}-${pad(nextMonth)}-01T00:00`)!;
  const previousYear = month === 1 ? year - 1 : year;
  const previousMonth = month === 1 ? 12 : month - 1;

  const [stats, previous, posts] = await Promise.all([
    db.socialMonthlyStats.findUnique({ where: { clientId_year_month: { clientId, year, month } } }),
    db.socialMonthlyStats.findUnique({
      where: { clientId_year_month: { clientId, year: previousYear, month: previousMonth } },
    }),
    db.socialPost.findMany({
      where: { clientId, status: SOCIAL_POST_STATUS.PUBLIE, publishedAt: { gte: monthStart, lt: monthEnd } },
      include: {
        media: {
          where: { mimeType: { startsWith: "image/" } },
          orderBy: { sortOrder: "asc" },
          take: 1,
          select: { storageKey: true },
        },
      },
      orderBy: { publishedAt: "asc" },
    }),
  ]);

  const rate = engagementRate(stats?.reach ?? null, stats?.interactions ?? null);
  const kpis: SocialReportKpi[] = [
    {
      label: "Abonnés (fin de mois)",
      value: pdfCount(stats?.followers),
      delta:
        stats?.followers != null && previous?.followers != null
          ? signedDelta(stats.followers - previous.followers)
          : null,
    },
    { label: "Portée", value: pdfCount(stats?.reach) },
    { label: "Interactions", value: pdfCount(stats?.interactions) },
    { label: "Taux d'engagement", value: formatRate(rate).replace(/[\u202f\u00a0]/g, " ") },
    { label: "Publications", value: pdfCount(posts.length) },
  ];

  // Séquentiel, pas Promise.all : décoder plusieurs grandes images en
  // parallèle ferait grimper la mémoire du conteneur.
  const reportPosts: SocialReportPost[] = [];
  for (const [index, post] of posts.entries()) {
    const firstImage = post.media[0];
    const caption = post.caption?.trim() ?? "";
    reportPosts.push({
      id: post.id,
      title: post.title,
      meta: `${formatSchedule(post.publishedAt)} · ${formatLabel(post.format)} · ${post.networks.map(networkLabel).join(", ")}`,
      caption: caption ? (caption.length > CAPTION_EXCERPT ? `${caption.slice(0, CAPTION_EXCERPT)}…` : caption) : null,
      publishedUrl: post.publishedUrl,
      thumbnail: firstImage && index < MAX_THUMBNAILS ? await jpegThumbnail(firstImage.storageKey) : null,
    });
  }

  const monthLabel = MONTH_FORMATTER.format(new Date(Date.UTC(year, month - 1, 1)));
  const documentElement = createElement(SocialReportDocument, {
    clientName: client.name,
    monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
    kpis,
    notes: stats?.notes ?? null,
    posts: reportPosts,
    generatedAt: new Date(),
  }) as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(documentElement);

  const slug = client.name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const fileName = `rapport-reseaux-${slug}-${year}-${pad(month)}.pdf`;

  await logAuditEvent({
    actorType: "ADMIN",
    actorId: admin.id,
    actorLabel: admin.email,
    action: "data_export",
    targetType: "Export",
    targetLabel: fileName,
    ipAddress: await getClientIp(),
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
