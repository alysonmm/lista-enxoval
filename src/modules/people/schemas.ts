import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome."),
  phone: z.string().trim().min(8, "Informe um telefone válido."),
  whatsapp: z.string().trim().optional(),
  email: z.union([z.string().trim().email(), z.literal("")]).optional(),
  cpf: z.string().trim().optional(),
  cep: z.string().trim().optional(),
  street: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

export const newParentPasswordSchema = z.object({
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

const babySexEnum = z.enum(["FEMALE", "MALE", "NOT_INFORMED"]);

export const babySchema = z.object({
  name: z.string().trim().optional(),
  nameUndefined: z.boolean().default(false),
  sex: babySexEnum.default("NOT_INFORMED"),
  expectedBirthDate: z.string().trim().optional(),
  showerDate: z.string().trim().optional(),
  photoUrl: z.string().trim().optional(),
  message: z.string().trim().optional(),
  theme: z.string().trim().optional(),
});

export type BabyInput = z.infer<typeof babySchema>;

export function toOptionalDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
