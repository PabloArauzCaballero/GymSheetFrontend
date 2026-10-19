import { z } from 'zod';
import { gymDirectoryEntrySchema } from './social';

export const socialMapCoordinatesSchema = z.object({
  latitude: z.number().finite().min(-85).max(85),
  longitude: z.number().finite().min(-180).max(180),
}).strict();

export const socialMapCellSchema = z.object({
  id: z.string().min(1),
  center: socialMapCoordinatesSchema,
  count: z.number().int().positive(),
}).strict();

export const socialMapAreasSchema = z.object({
  cells: z.array(socialMapCellSchema),
}).strict();

export const socialMapPeopleSchema = z.array(gymDirectoryEntrySchema);

/** Grindr-style grid: a profile plus its approximate distance (km, from a public cell center). */
export const socialMapNearbyPersonSchema = gymDirectoryEntrySchema.extend({
  distanceKm: z.number().int().nonnegative().nullable(),
});
export const socialMapNearbySchema = z.object({
  preferencesApplied: z.boolean(),
  people: z.array(socialMapNearbyPersonSchema),
}).strict();

export const socialMapGymSchema = z.object({
  kind: z.literal('GYM'),
  source: z.literal('OPENSTREETMAP'),
  sourceId: z.string().min(1),
  name: z.string().min(1),
  address: z.string().nullable(),
  city: z.string().nullable(),
  region: z.string().nullable(),
  latitude: z.number().finite().min(-85).max(85),
  longitude: z.number().finite().min(-180).max(180),
  tags: z.record(z.string(), z.string()),
  license: z.literal('ODbL-1.0'),
  attribution: z.string().min(1),
  updatedAt: z.string().datetime(),
  registered: z.literal(false),
}).strict();

export const socialMapGymsSchema = z.array(socialMapGymSchema).max(200);
export const socialMapCitySchema = z.object({
  id: z.string().min(1), name: z.string().min(1), region: z.string().nullable(),
  latitude: z.number().finite().min(-85).max(85), longitude: z.number().finite().min(-180).max(180),
  source: z.literal('OPENSTREETMAP'),
}).strict();
export const socialMapCitiesSchema = z.array(socialMapCitySchema).max(10);

export type SocialMapCoordinates = z.infer<typeof socialMapCoordinatesSchema>;
export type SocialMapBounds = { south: number; west: number; north: number; east: number };
export type SocialMapCell = z.infer<typeof socialMapCellSchema>;
export type SocialMapPerson = z.infer<typeof gymDirectoryEntrySchema>;
export type SocialMapGym = z.infer<typeof socialMapGymSchema>;
export type SocialMapCity = z.infer<typeof socialMapCitySchema>;
export type SocialMapNearbyPerson = z.infer<typeof socialMapNearbyPersonSchema>;
export type SocialMapNearby = z.infer<typeof socialMapNearbySchema>;
