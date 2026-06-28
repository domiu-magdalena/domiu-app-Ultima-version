'use server';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { getServiceClient } from '@/lib/db/supabase';
import { requireAuth } from '@/lib/auth/server-auth';
import { serverAudit } from '@/lib/audit/server-audit';
import { ADMIN_ROLES } from '@/types/auth';

export interface CourierApplication {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  full_name: string;
  document_id: string;
  vehicle_type: string;
  vehicle_brand: string | null;
  vehicle_model: string | null;
  vehicle_color: string | null;
  vehicle_plate: string | null;
  license_number: string | null;
  address: string | null;
  city: string | null;
  birth_date: string | null;
  document_photo_url: string | null;
  license_url: string | null;
  soat_url: string | null;
  techno_review_url: string | null;
  vehicle_photo_url: string | null;
  profile_photo_url: string | null;
  payment_method: string | null;
  payment_account_number: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  experience_years: number | null;
  has_vehicle: boolean;
  references: string | null;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

export interface BusinessApplication {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  business_name: string;
  business_type: string;
  category: string | null;
  description: string | null;
  owner_name: string;
  owner_document: string;
  owner_email: string;
  owner_phone: string | null;
  address: string;
  city: string;
  cuisine_type: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  banner_url: string | null;
  rut_url: string | null;
  lat: number | null;
  lng: number | null;
  avg_prep_time_minutes: number | null;
  accepts_delivery: boolean | null;
  accepts_pickup: boolean | null;
  has_experience: boolean;
  references: string | null;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    avatar_url: string | null;
  } | null;
}

function checkAdmin(result: Awaited<ReturnType<typeof requireAuth>>): boolean {
  return !result.error && !!result.session && ADMIN_ROLES.includes(result.session.profile.role);
}

function splitName(fullName: string | null | undefined) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] || '',
    last_name: parts.slice(1).join(' '),
  };
}

function normalizeCourierApplication(row: any): CourierApplication {
  const names = splitName(row.full_name);
  const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
  return {
    ...row,
    first_name: names.first_name || profile?.first_name || '',
    last_name: names.last_name || profile?.last_name || '',
    email: profile?.email || '',
    phone: row.phone || profile?.phone || null,
    full_name: row.full_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(' '),
    document_id: row.document_id || '',
    vehicle_brand: row.vehicle_brand || null,
    vehicle_model: row.vehicle_model || null,
    vehicle_color: row.vehicle_color || null,
    license_number: row.document_id || null,
    document_photo_url: row.document_photo_url || null,
    license_url: row.license_url || null,
    soat_url: row.soat_url || null,
    techno_review_url: row.techno_review_url || null,
    vehicle_photo_url: row.vehicle_photo_url || null,
    profile_photo_url: row.profile_photo_url || null,
    payment_method: row.payment_method || null,
    payment_account_number: row.payment_account_number || null,
    emergency_contact: row.emergency_contact || null,
    emergency_phone: row.emergency_phone || null,
    experience_years: null,
    has_vehicle: !!row.vehicle_type,
    references: null,
    admin_note: row.admin_notes || null,
    profile: profile || null,
  };
}

function normalizeBusinessApplication(row: any): BusinessApplication {
  const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile;
  return {
    ...row,
    category: row.category || null,
    owner_email: row.email || profile?.email || '',
    owner_phone: row.phone || null,
    cuisine_type: row.category || null,
    phone: row.phone || null,
    whatsapp: row.whatsapp || null,
    email: row.email || null,
    website: null,
    logo_url: row.logo_url || null,
    banner_url: row.banner_url || null,
    rut_url: row.rut_url || null,
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    avg_prep_time_minutes: row.avg_prep_time_minutes ?? null,
    accepts_delivery: row.accepts_delivery ?? null,
    accepts_pickup: row.accepts_pickup ?? null,
    has_experience: false,
    references: null,
    admin_note: row.admin_notes || null,
    profile: profile || null,
  };
}

export async function getCourierApplications(search?: string, filter?: string): Promise<CourierApplication[]> {
  const result = await requireAuth();
  if (!checkAdmin(result) || !result.session) return [];

  const supabase = getServiceClient();

  let query = supabase
    .from('courier_applications')
    .select('*, profile:profiles!user_id(first_name, last_name, email, phone, avatar_url)')
    .order('created_at', { ascending: false });

  if (filter && filter !== 'all') query = query.eq('status', filter);

  const { data, error } = await query;
  if (error) {
    console.error('[admin-applications] getCourierApplications error:', error);
    return [];
  }

  let list = (data || []).map(normalizeCourierApplication);

  if (search) {
    const s = search.toLowerCase();
    list = list.filter((a) =>
      a.full_name?.toLowerCase().includes(s) ||
      a.email?.toLowerCase().includes(s) ||
      a.phone?.toLowerCase().includes(s) ||
      a.vehicle_type?.toLowerCase().includes(s) ||
      a.vehicle_plate?.toLowerCase().includes(s) ||
      a.document_id?.toLowerCase().includes(s)
    );
  }

  return list;
}

export async function getBusinessApplications(search?: string, filter?: string): Promise<BusinessApplication[]> {
  const result = await requireAuth();
  if (!checkAdmin(result) || !result.session) return [];

  const supabase = getServiceClient();

  let query = supabase
    .from('business_applications')
    .select('*, profile:profiles!user_id(first_name, last_name, email, avatar_url)')
    .order('created_at', { ascending: false });

  if (filter && filter !== 'all') query = query.eq('status', filter);

  const { data, error } = await query;
  if (error) {
    console.error('[admin-applications] getBusinessApplications error:', error);
    return [];
  }

  let list = (data || []).map(normalizeBusinessApplication);

  if (search) {
    const s = search.toLowerCase();
    list = list.filter((a) =>
      a.business_name?.toLowerCase().includes(s) ||
      a.owner_name?.toLowerCase().includes(s) ||
      a.owner_email?.toLowerCase().includes(s) ||
      a.category?.toLowerCase().includes(s) ||
      a.phone?.toLowerCase().includes(s)
    );
  }

  return list;
}

export async function approveCourierApplication(applicationId: string, adminNote?: string) {
  const result = await requireAuth();
  if (!checkAdmin(result) || !result.session) return { error: 'No autorizado' };

  const supabase = getServiceClient();

  const { data: app, error: fetchError } = await supabase
    .from('courier_applications')
    .select('*')
    .eq('id', applicationId)
    .single();

  if (fetchError || !app) return { error: 'Solicitud no encontrada' };
  if (app.status !== 'pending') return { error: 'La solicitud ya fue procesada' };

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from('courier_applications')
    .update({
      status: 'approved',
      admin_notes: adminNote || null,
      reviewed_by: result.session.user.id,
      reviewed_at: now,
      updated_at: now,
    })
    .eq('id', applicationId);

  if (updateError) return { error: 'Error al actualizar solicitud: ' + updateError.message };

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      role: 'courier',
      avatar_url: app.profile_photo_url || undefined,
      updated_at: now,
      metadata: {
        courier_application_id: applicationId,
        approved_as_courier_at: now,
      },
    })
    .eq('id', app.user_id);

  if (profileError) {
    await supabase.from('courier_applications').update({ status: 'pending', admin_notes: null, reviewed_by: null, reviewed_at: null }).eq('id', applicationId);
    return { error: 'Error al actualizar perfil: ' + profileError.message };
  }

  const driverData = {
    id: app.user_id,
    license_number: app.document_id || `DOC-${app.user_id.slice(0, 8)}`,
    vehicle_type: app.vehicle_type || 'motorcycle',
    vehicle_plate: app.vehicle_plate || null,
    vehicle_model: app.vehicle_model || null,
    status: 'offline',
    is_available: false,
    is_verified: true,
    is_active: true,
    total_deliveries: 0,
    completed_deliveries: 0,
    rating: 0,
    total_ratings: 0,
    avg_rating: 0,
    bank_account: {
      bank_name: app.payment_method || null,
      account_number: app.payment_account_number || null,
      account_holder: app.full_name || null,
    },
    metadata: {
      application_id: applicationId,
      full_name: app.full_name,
      document_id: app.document_id,
      vehicle_brand: app.vehicle_brand,
      vehicle_color: app.vehicle_color,
      payment_method: app.payment_method,
      emergency_contact: app.emergency_contact,
      emergency_phone: app.emergency_phone,
      documents: {
        document_photo_url: app.document_photo_url || null,
        license_url: app.license_url || null,
        soat_url: app.soat_url || null,
        techno_review_url: app.techno_review_url || null,
        vehicle_photo_url: app.vehicle_photo_url || null,
        profile_photo_url: app.profile_photo_url || null,
      },
    },
    updated_at: now,
  };

  const { error: driverError } = await supabase
    .from('drivers')
    .upsert(driverData, { onConflict: 'id' });

  if (driverError) {
    await supabase.from('profiles').update({ role: 'customer' }).eq('id', app.user_id);
    await supabase.from('courier_applications').update({ status: 'pending', admin_notes: null, reviewed_by: null, reviewed_at: null }).eq('id', applicationId);
    return { error: 'Error al crear registro de repartidor: ' + driverError.message };
  }

  await supabase.from('notifications').insert({
    recipient_id: app.user_id,
    sender_id: result.session.user.id,
    notification_type: 'system_alert',
    title: 'Solicitud aprobada',
    message: 'Tu solicitud para ser repartidor ha sido aprobada. Ya puedes iniciar sesión y comenzar a recibir pedidos.',
    action_url: '/repartidor',
    is_read: false,
    channels: ['in_app'],
  });

  await serverAudit.logAction(
    result.session.user.id, result.session.user.email, result.session.profile.role,
    'approve_courier_application', 'courier_applications', applicationId,
    { userId: app.user_id, note: adminNote },
  );

  return { success: true };
}

export async function rejectCourierApplication(applicationId: string, reason: string) {
  const result = await requireAuth();
  if (!checkAdmin(result) || !result.session) return { error: 'No autorizado' };

  const supabase = getServiceClient();

  const { data: app, error: fetchError } = await supabase
    .from('courier_applications')
    .select('*')
    .eq('id', applicationId)
    .single();

  if (fetchError || !app) return { error: 'Solicitud no encontrada' };
  if (app.status !== 'pending') return { error: 'La solicitud ya fue procesada' };

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from('courier_applications')
    .update({
      status: 'rejected',
      admin_notes: reason,
      reviewed_by: result.session.user.id,
      reviewed_at: now,
      updated_at: now,
    })
    .eq('id', applicationId);

  if (updateError) return { error: 'Error al rechazar solicitud: ' + updateError.message };

  await supabase.from('notifications').insert({
    recipient_id: app.user_id,
    sender_id: result.session.user.id,
    notification_type: 'system_alert',
    title: 'Solicitud rechazada',
    message: 'Tu solicitud para ser repartidor ha sido rechazada. Motivo: ' + reason,
    is_read: false,
    channels: ['in_app'],
  });

  await serverAudit.logAction(
    result.session.user.id, result.session.user.email, result.session.profile.role,
    'reject_courier_application', 'courier_applications', applicationId,
    { userId: app.user_id, reason },
  );

  return { success: true };
}

function buildSlug(name: string) {
  const base = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `${base || 'negocio'}-${Date.now().toString(36)}`;
}

export async function approveBusinessApplication(applicationId: string, adminNote?: string) {
  const result = await requireAuth();
  if (!checkAdmin(result) || !result.session) return { error: 'No autorizado' };

  const supabase = getServiceClient();

  const { data: app, error: fetchError } = await supabase
    .from('business_applications')
    .select('*')
    .eq('id', applicationId)
    .single();

  if (fetchError || !app) return { error: 'Solicitud no encontrada' };
  if (app.status !== 'pending') return { error: 'La solicitud ya fue procesada' };

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from('business_applications')
    .update({
      status: 'approved',
      admin_notes: adminNote || null,
      reviewed_by: result.session.user.id,
      reviewed_at: now,
      updated_at: now,
    })
    .eq('id', applicationId);

  if (updateError) return { error: 'Error al actualizar solicitud: ' + updateError.message };

  const slug = buildSlug(app.business_name);

  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .insert({
      owner_id: app.user_id,
      name: app.business_name,
      slug,
      description: app.description || null,
      logo_url: app.logo_url || null,
      banner_url: app.banner_url || null,
      cuisine_type: app.category || null,
      business_type: app.business_type || 'restaurant',
      phone: app.phone || null,
      email: app.email || null,
      is_verified: true,
      is_active: true,
      metadata: {
        application_id: applicationId,
        owner_name: app.owner_name,
        owner_document: app.owner_document,
        whatsapp: app.whatsapp || null,
        rut_url: app.rut_url || null,
        avg_prep_time_minutes: app.avg_prep_time_minutes,
        accepts_delivery: app.accepts_delivery,
        accepts_pickup: app.accepts_pickup,
      },
    })
    .select()
    .single();

  if (bizError || !business) {
    await supabase.from('business_applications').update({ status: 'pending', admin_notes: null, reviewed_by: null, reviewed_at: null }).eq('id', applicationId);
    return { error: 'Error al crear negocio: ' + (bizError?.message || '') };
  }

  const { error: addrError } = await supabase.from('business_addresses').insert({
    business_id: business.id,
    street_address: app.address,
    city: app.city || 'Santa Marta',
    country: 'Colombia',
    latitude: app.lat || null,
    longitude: app.lng || null,
    phone: app.phone || null,
    is_primary: true,
    delivery_available: app.accepts_delivery ?? true,
  });

  if (addrError) {
    await supabase.from('businesses').delete().eq('id', business.id);
    await supabase.from('business_applications').update({ status: 'pending', admin_notes: null, reviewed_by: null, reviewed_at: null }).eq('id', applicationId);
    return { error: 'Error al crear dirección: ' + addrError.message };
  }

  for (let d = 0; d < 7; d++) {
    await supabase.from('business_hours').insert({
      business_id: business.id,
      day_of_week: d,
      opens_at: '08:00',
      closes_at: '22:00',
      is_closed: false,
    });
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      role: 'merchant',
      updated_at: now,
      metadata: {
        business_application_id: applicationId,
        business_id: business.id,
        approved_as_business_at: now,
      },
    })
    .eq('id', app.user_id);

  if (profileError) {
    await supabase.from('businesses').delete().eq('id', business.id);
    await supabase.from('business_applications').update({ status: 'pending', admin_notes: null, reviewed_by: null, reviewed_at: null }).eq('id', applicationId);
    return { error: 'Error al actualizar perfil: ' + profileError.message };
  }

  await supabase.from('notifications').insert({
    recipient_id: app.user_id,
    sender_id: result.session.user.id,
    notification_type: 'system_alert',
    title: 'Solicitud aprobada',
    message: 'Tu solicitud para registrar "' + app.business_name + '" ha sido aprobada. Ya puedes gestionar tu negocio.',
    action_url: '/negocio',
    is_read: false,
    channels: ['in_app'],
  });

  await serverAudit.logAction(
    result.session.user.id, result.session.user.email, result.session.profile.role,
    'approve_business_application', 'business_applications', applicationId,
    { userId: app.user_id, businessId: business.id, note: adminNote },
  );

  return { success: true, businessId: business.id };
}

export async function rejectBusinessApplication(applicationId: string, reason: string) {
  const result = await requireAuth();
  if (!checkAdmin(result) || !result.session) return { error: 'No autorizado' };

  const supabase = getServiceClient();

  const { data: app, error: fetchError } = await supabase
    .from('business_applications')
    .select('*')
    .eq('id', applicationId)
    .single();

  if (fetchError || !app) return { error: 'Solicitud no encontrada' };
  if (app.status !== 'pending') return { error: 'La solicitud ya fue procesada' };

  const now = new Date().toISOString();

  const { error: updateError } = await supabase
    .from('business_applications')
    .update({
      status: 'rejected',
      admin_notes: reason,
      reviewed_by: result.session.user.id,
      reviewed_at: now,
      updated_at: now,
    })
    .eq('id', applicationId);

  if (updateError) return { error: 'Error al rechazar solicitud: ' + updateError.message };

  await supabase.from('notifications').insert({
    recipient_id: app.user_id,
    sender_id: result.session.user.id,
    notification_type: 'system_alert',
    title: 'Solicitud rechazada',
    message: 'Tu solicitud para registrar "' + app.business_name + '" ha sido rechazada. Motivo: ' + reason,
    is_read: false,
    channels: ['in_app'],
  });

  await serverAudit.logAction(
    result.session.user.id, result.session.user.email, result.session.profile.role,
    'reject_business_application', 'business_applications', applicationId,
    { userId: app.user_id, reason },
  );

  return { success: true };
}
