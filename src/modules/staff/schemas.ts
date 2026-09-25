import { z } from "zod";

export const staffRoleEnum = z.enum(["ADMIN", "MANAGER", "SELLER"]);

export const staffSchema = z
  .object({
    name: z.string().trim().min(2, "Informe o nome."),
    email: z.string().trim().email("Informe um e-mail válido."),
    role: staffRoleEnum,
    storeId: z.string().trim().optional(),
    phone: z.string().trim().optional(),
  })
  .refine((data) => data.role === "ADMIN" || !!data.storeId, {
    message: "Selecione a unidade para Gerente/Vendedor.",
    path: ["storeId"],
  });

export type StaffInput = z.infer<typeof staffSchema>;

export const staffPasswordSchema = z.object({
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});
