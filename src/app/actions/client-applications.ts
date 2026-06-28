'use server';

import { z } from 'zod';
import { getServiceClient } from '@/lib/db/supabase';
import { requireAuth } from '@/lib/auth/server-auth';

const courierApplicationSchema = z.object({
  full_name: z.string().min(1, 'Nombre completo requerido'),
  document_id: z.string().min(1, 'Documento de identidad requerido'),
  birth_date: z.string().min(1, 'Fecha de nacimiento requerida'),
  phone: z.string().min(1, 'Teléfono requerido'),
  whatsapp: z.string().optional().default(''),
  city: z.string().min(1, 'Ciudad requerida'),
  neighborhood: z.string().optional().default(''),
  address: z.string().min(1, 'Dirección requerida'),
  vehicle_type: z.enum(['bike', 'motorcycle', 'car', 'van'], { message: 'Tipo de vehículo requerido' }),
  vehicle_brand: z.string().optional().default(''),
  vehicle_model: z.string().optional().default(''),
  vehicle_color: z.string().optional().default(''),
  vehicle_plate: z.string().optional().default(''),
  document_photo: z.string().optional().default(''),
  license: z.string().optional().default(''),
  soat: z.string().optional().default(''),
  techno_review: z.string().optional().default(''),
  vehicle_photo: z.string().optional().default(''),
  profile_photo: z.string().optional().default(''),
  payment_method: z.string().optional().default(''),
  payment_account_number: z.string().optional().default(''),
  emergency_contact: z.string().optional().default(''),
  emergency_phone: z.string().optional().default(''),
  accepted_terms: z.boolean().refine(v => v === true, 'Debes aceptar los términos'),
  accepted_privacy: z.boolean().refine(v => v === true, 'Debes aceptar las políticas de privacidad'),
});

const businessApplicationSchema = z.object({
  business_name: z.string().min(1, 'Nombre del negocio requerido'),
  business_type: z.string().min(1, 'Tipo de negocio requerido'),
  category: z.string().optional().default(''),
  description: z.string().optional().default(''),
  phone: z.string().min(1, 'Teléfono requerido'),
  whatsapp: z.string().optional().default(''),
  email: z.string().email('Email inválido').or(z.literal('')).optional().default(''),
  city: z.string().min(1, 'Ciudad requerida'),
  address: z.string().min(1, 'Dirección requerida'),
  lat: z.number().optional(),
  lng: z.number().optional(),
  logo_url: z.string().optional().default(''),
  banner_url: z.string().optional().default(''),
  rut_url: z.string().optional().default(''),
  owner_name: z.string().min(1, 'Nombre del propietario requerido'),
  owner_document: z.string().min(1, 'Documento del propietario requerido'),
  avg_prep_time_minutes: z.number().int().min(0).optional().default(15),
  accepts_delivery: z.boolean().optional().default(true),
  accepts_pickup: z.boolean().optional().default(true),
  accepted_terms: z.boolean().refine(v => v === true, 'Debes aceptar los términos'),
  accepted_privacy: z.boolean().refine(v => v === true, 'Debes aceptar las políticas de privacidad'),
  accepted_commission: z.boolean().refine(v => v === true, 'Debes aceptar la comisión'),
});

export type CourierApplicationInput = z.infer<typeof courierApplicationSchema>;
export type BusinessApplicationInput = z.infer<typeof businessApplicationSchema>;

export async function submitCourierApplicationAction(data: CourierApplicationInput) {
  const parsed = courierApplicationSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues.map(e => e.message).join(', ') };
  }

  const result = await requireAuth();
  if (result.error) return { error: result.error.message };

  const supabase = getServiceClient();
  const userId = result.session.user.id;

  const { data: existing } = await supabase
    .from('courier_applications')
    .select('id, status')
    .eq('user_id', userId)
    .in('status', ['pending', 'approved'])
    .maybeSingle();

  if (existing) {
    return { error: existing.status === 'pending' ? 'Ya tienes una solicitud de repartidor pendiente de revisión' : 'Tu solicitud de repartidor ya fue aprobada' };
  }

  const payload = parsed.data;
  const insertData = {
    user_id: userId,
    status: 'pending',
    full_name: payload.full_name,
    document_id: payload.document_id,
    birth_date: payload.birth_date,
    phone: payload.phone,
    whatsapp: payload.whatsapp || null,
    city: payload.city,
    neighborhood: payload.neighborhood || null,
    address: payload.address,
    vehicle_type: payload.vehicle_type,
    vehicle_brand: payload.vehicle_brand || null,
    vehicle_model: payload.vehicle_model || null,
    vehicle_color: payload.vehicle_color || null,
    vehicle_plate: payload.vehicle_plate || null,
    document_photo_url: payload.document_photo || null,
    license_url: payload.license || null,
    soat_url: payload.soat || null,
    techno_review_url: payload.techno_review || null,
    vehicle_photo_url: payload.vehicle_photo || null,
    profile_photo_url: payload.profile_photo || null,
    payment_method: payload.payment_method || null,
    payment_account_number: payload.payment_account_number || null,
    emergency_contact: payload.emergency_contact || null,
    emergency_phone: payload.emergency_phone || null,
    accepted_terms: payload.accepted_terms,
    accepted_privacy: payload.accepted_privacy,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error: insertError } = await supabase
    .from('courier_applications')
    .insert(insertData);

  if (insertError) return { error: 'Error al enviar solicitud: ' + insertError.message };

  return { success: true };
}

export async function submitBusinessApplicationAction(data: BusinessApplicationInput) {
  const parsed = businessApplicationSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues.map(e => e.message).join(', ') };
  }

  const result = await requireAuth();
  if (result.error) return { error: result.error.message };

  const supabase = getServiceClient();
  const userId = result.session.user.id;

  const { data: existing } = await supabase
    .from('business_applications')
    .select('id, status')
    .eq('user_id', userId)
    .in('status', ['pending', 'approved'])
    .maybeSingle();

  if (existing) {
    return { error: existing.status === 'pending' ? 'Ya tienes una solicitud de negocio pendiente de revisión' : 'Tu solicitud de negocio ya fue aprobada' };
  }

  const payload = parsed.data;
  const insertData = {
    user_id: userId,
    status: 'pending',
    business_name: payload.business_name,
    business_type: payload.business_type,
    category: payload.category || null,
    description: payload.description || null,
    phone: payload.phone,
    whatsapp: payload.whatsapp || null,
    email: payload.email || null,
    city: payload.city,
    address: payload.address,
    lat: payload.lat ?? null,
    lng: payload.lng ?? null,
    logo_url: payload.logo_url || null,
    banner_url: payload.banner_url || null,
    rut_url: payload.rut_url || null,
    owner_name: payload.owner_name,
    owner_document: payload.owner_document,
    avg_prep_time_minutes: payload.avg_prep_time_minutes,
    accepts_delivery: payload.accepts_delivery,
    accepts_pickup: payload.accepts_pickup,
    accepted_terms: payload.accepted_terms,
    accepted_privacy: payload.accepted_privacy,
    accepted_commission: payload.accepted_commission,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error: insertError } = await supabase
    .from('business_applications')
    .insert(insertData);

  if (insertError) return { error: 'Error al enviar solicitud: ' + insertError.message };

  return { success: true };
}

export async function getMyCourierApplication() {
  const result = await requireAuth();
  if (result.error) return null;

  const supabase = getServiceClient();
  const { data } = await supabase
    .from('courier_applications')
    .select('*')
    .eq('user_id', result.session.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data || null;
}

export async function getMyBusinessApplication() {
  const result = await requireAuth();
  if (result.error) return null;

  const supabase = getServiceClient();
  const { data } = await supabase
    .from('business_applications')
    .select('*')
    .eq('user_id', result.session.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data || null;
}
