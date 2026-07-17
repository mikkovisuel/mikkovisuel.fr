import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: "Adresse email invalide." }),
  password: z.string().min(1, { message: "Mot de passe requis." }),
});

export type LoginFormState = {
  error?: string;
} | undefined;

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: "Mot de passe actuel requis." }),
    newPassword: z.string().min(8, { message: "8 caractères minimum." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les nouveaux mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

export type ChangePasswordState = { error?: string; success?: boolean } | undefined;
