"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/dal";

const CONTENT_ID = "homepage";

export type HomepageContentFormState = { error?: string } | undefined;

function textOrNull(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function updateHomepageContent(
  _prev: HomepageContentFormState,
  formData: FormData,
): Promise<HomepageContentFormState> {
  await verifyAdminSession();

  const data = {
    heroTitle: textOrNull(formData.get("heroTitle")),
    heroSubtitle: textOrNull(formData.get("heroSubtitle")),
    heroButtonLabel: textOrNull(formData.get("heroButtonLabel")),
    portfolioTitle: textOrNull(formData.get("portfolioTitle")),
    portfolioSubtitle: textOrNull(formData.get("portfolioSubtitle")),
  };

  await db.homepageContent.upsert({
    where: { id: CONTENT_ID },
    create: { id: CONTENT_ID, ...data },
    update: data,
  });

  revalidatePath("/");
  revalidatePath("/admin/portfolio");
  return undefined;
}
