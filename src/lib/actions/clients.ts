"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/dal";
import { hashPassword } from "@/lib/password";
import {
  ClientSchema,
  ClientUserSchema,
  ClientUserEditSchema,
  type ClientFormState,
  type ClientUserFormState,
  type ClientUserEditFormState,
} from "@/lib/validation/client";

export async function createClient(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  await verifyAdminSession();

  const parsed = ClientSchema.safeParse({
    name: formData.get("name"),
    notes: formData.get("notes"),
    address: formData.get("address"),
    siret: formData.get("siret"),
    vatNumber: formData.get("vatNumber"),
    billingEmail: formData.get("billingEmail"),
    driveUrl: formData.get("driveUrl"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const client = await db.client.create({ data: parsed.data });
  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${client.id}`);
}

export async function updateClient(
  clientId: string,
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  await verifyAdminSession();

  const parsed = ClientSchema.safeParse({
    name: formData.get("name"),
    notes: formData.get("notes"),
    address: formData.get("address"),
    siret: formData.get("siret"),
    vatNumber: formData.get("vatNumber"),
    billingEmail: formData.get("billingEmail"),
    driveUrl: formData.get("driveUrl"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  await db.client.update({ where: { id: clientId }, data: parsed.data });
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/clients");
  return undefined;
}

export async function deleteClient(clientId: string) {
  await verifyAdminSession();
  await db.client.delete({ where: { id: clientId } });
  revalidatePath("/admin/clients");
  redirect("/admin/clients");
}

export async function createClientUser(
  clientId: string,
  _prev: ClientUserFormState,
  formData: FormData,
): Promise<ClientUserFormState> {
  await verifyAdminSession();

  const parsed = ClientUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: formData.get("phone"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const existing = await db.clientUser.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: "Un compte existe déjà avec cet email." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.clientUser.create({
    data: {
      clientId,
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      phone: parsed.data.phone || null,
      role: parsed.data.role || null,
    },
  });

  revalidatePath(`/admin/clients/${clientId}`);
  return undefined;
}

export async function updateClientUser(
  clientUserId: string,
  clientId: string,
  _prev: ClientUserEditFormState,
  formData: FormData,
): Promise<ClientUserEditFormState> {
  await verifyAdminSession();

  const parsed = ClientUserEditSchema.safeParse({
    phone: formData.get("phone"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  await db.clientUser.update({
    where: { id: clientUserId },
    data: { phone: parsed.data.phone || null, role: parsed.data.role || null },
  });

  revalidatePath(`/admin/clients/${clientId}`);
  return { success: true };
}

export async function deleteClientUser(clientUserId: string, clientId: string) {
  await verifyAdminSession();
  await db.clientUser.delete({ where: { id: clientUserId } });
  revalidatePath(`/admin/clients/${clientId}`);
}
