import { getBrowserClient } from '@/lib/db/supabase';
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface City {
  id: string;
  name: string;
  slug: string;
  department: string | null;
  is_active: boolean;
  latitude: number | null;
  longitude: number | null;
}

export interface Zone {
  id: string;
  city_id: string;
  name: string;
  slug: string;
  is_active: boolean;
  latitude: number | null;
  longitude: number | null;
  delivery_estimate: string | null;
}

export interface DeliveryRate {
  id: string;
  city_id: string | null;
  zone_id: string | null;
  base_rate: number;
  rate_per_km: number;
  min_order_amount: number;
  free_delivery_min: number | null;
  is_active: boolean;
}

async function getClient() {
  return getBrowserClient();
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const coverageService = {
  async getCities(): Promise<City[]> {
    const supabase = await getClient();
    const { data } = await supabase.from('cities').select('*').eq('is_active', true).order('name');
    return (data || []) as City[];
  },

  async getAllCities(): Promise<City[]> {
    const supabase = await getClient();
    const { data } = await supabase.from('cities').select('*').order('name');
    return (data || []) as City[];
  },

  async createCity(name: string, department?: string): Promise<void> {
    const supabase = await getClient();
    const slug = name.toLowerCase().replace(/[^a-záéíóúñ]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const { error } = await supabase.from('cities').insert({ name, slug, department });
    if (error) throw new Error(error.message);
  },

  async toggleCity(id: string, isActive: boolean): Promise<void> {
    const supabase = await getClient();
    await supabase.from('cities').update({ is_active: isActive }).eq('id', id);
  },

  async getZones(cityId?: string): Promise<Zone[]> {
    const supabase = await getClient();
    let q = supabase.from('zones').select('*, cities!inner(name)').eq('is_active', true).order('name');
    if (cityId) q = q.eq('city_id', cityId);
    const { data } = await q;
    return (data || []) as any[];
  },

  async getAllZones(): Promise<(Zone & { city_name: string })[]> {
    const supabase = await getClient();
    const { data } = await supabase.from('zones').select('*, cities(name)').order('name');
    return ((data || []) as any[]).map((z: any) => ({ ...z, city_name: z.cities?.name || '' }));
  },

  async createZone(cityId: string, name: string, deliveryEstimate?: string): Promise<void> {
    const supabase = await getClient();
    const slug = name.toLowerCase().replace(/[^a-záéíóúñ]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const { error } = await supabase.from('zones').insert({ city_id: cityId, name, slug, delivery_estimate: deliveryEstimate });
    if (error) throw new Error(error.message);
  },

  async toggleZone(id: string, isActive: boolean): Promise<void> {
    const supabase = await getClient();
    await supabase.from('zones').update({ is_active: isActive }).eq('id', id);
  },

  async getRates(cityId?: string): Promise<DeliveryRate[]> {
    const supabase = await getClient();
    let q = supabase.from('delivery_rates').select('*, cities(name), zones(name)').order('created_at');
    if (cityId) q = q.eq('city_id', cityId);
    const { data } = await q;
    return (data || []) as any[];
  },

  async upsertRate(rate: Partial<DeliveryRate>): Promise<void> {
    const supabase = await getClient();
    const { error } = await supabase.from('delivery_rates').upsert(rate as any);
    if (error) throw new Error(error.message);
  },

  async toggleRate(id: string, isActive: boolean): Promise<void> {
    const supabase = await getClient();
    await supabase.from('delivery_rates').update({ is_active: isActive }).eq('id', id);
  },

  async detectCityFromCoords(lat: number, lng: number): Promise<{ city: City | null; zone: Zone | null }> {
    const supabase = await getClient();
    const { data: cities } = await supabase.from('cities').select('*').eq('is_active', true);
    const allCities = (cities || []) as City[];
    let nearestCity: City | null = null;
    let minDist = Infinity;
    for (const c of allCities) {
      if (c.latitude && c.longitude) {
        const d = haversine(lat, lng, c.latitude, c.longitude);
        if (d < minDist) {
          minDist = d;
          nearestCity = c;
        }
      }
    }
    if (!nearestCity || minDist > 100) return { city: null, zone: null };

    const { data: zones } = await supabase.from('zones').select('*').eq('city_id', nearestCity.id).eq('is_active', true);
    const allZones = (zones || []) as Zone[];
    let nearestZone: Zone | null = null;
    let minZDist = Infinity;
    for (const z of allZones) {
      if (z.latitude && z.longitude) {
        const d = haversine(lat, lng, z.latitude, z.longitude);
        if (d < minZDist) {
          minZDist = d;
          nearestZone = z;
        }
      }
    }
    return { city: nearestCity, zone: nearestZone };
  },

  async getBusinessesByZone(cityId?: string, zoneId?: string) {
    const supabase = await getClient();
    let q = supabase.from('businesses').select('*').eq('is_active', true);
    if (cityId) q = q.eq('city_id', cityId);
    if (zoneId) q = q.eq('zone_id', zoneId);
    const { data } = await q.order('rating', { ascending: false });
    return (data || []) as any[];
  },

  async calculateDeliveryFee(cityId: string, distanceKm: number): Promise<number> {
    const supabase = await getClient();
    const { data } = await supabase.from('delivery_rates').select('*').eq('city_id', cityId).eq('is_active', true).limit(1).single();
    if (!data) return 0;
    const rate = data as DeliveryRate;
    return rate.base_rate + rate.rate_per_km * distanceKm;
  },
};
