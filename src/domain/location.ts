import { z } from "zod";
import { preferencesSchema } from "./schemas";

export const publicIpSchema = z.union([z.ipv4(), z.ipv6()]);
export const locationSuggestionSchema = z.object({ city: preferencesSchema.shape.city, country: preferencesSchema.shape.country, currency: preferencesSchema.shape.currency });
export type LocationSuggestion = z.infer<typeof locationSuggestionSchema>;
