import { z } from "zod";

const phoneRe = /^0[2-5]\d{8}$/;

export const learnerSchema = z.object({
  fullname: z.string().min(1),
  email: z.string().email(),
  phone: z.string().regex(phoneRe, "Phone must be a 10-digit Ghanaian number (0[2-5]XXXXXXXX)"),
  gender: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  institution: z.string().nullable().optional(),
  graduated: z.boolean().optional(),
  cohortId: z.coerce.number().int().positive().optional(),
});
