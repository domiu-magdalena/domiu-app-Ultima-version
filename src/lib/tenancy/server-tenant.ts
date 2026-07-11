import 'server-only';

import { getServiceClient } from '@/lib/db/supabase';

export interface ServerTenantContext {
  tenantId: string;
  tenantSlug: string;
  membershipRole: string | null;
  source: 'business' | 'membership' | 'default';
}

interface ResolveTenantOptions {
  userId: string;
  businessId?: string;
}

/**
 * Resolves tenant context from trusted server-side data.
 * The tenant is never accepted directly from browser input.
 */
export async function resolveServerTenantContext(
  options: ResolveTenantOptions,
): Promise<ServerTenantContext> {
  const supabase = getServiceClient();

  if (options.businessId) {
    const { data: business, error } = await supabase
      .from('businesses')
      .select('tenant_id')
      .eq('id', options.businessId)
      .maybeSingle();

    if (error) throw new Error(`No se pudo resolver el tenant del negocio: ${error.message}`);
    if (!business?.tenant_id) throw new Error('El negocio no está asociado a un tenant');

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, slug, status')
      .eq('id', business.tenant_id)
      .maybeSingle();

    if (!tenant || !['active', 'paused'].includes(tenant.status)) {
      throw new Error('El tenant del negocio no está disponible');
    }

    const { data: membership } = await supabase
      .from('tenant_memberships')
      .select('role, status')
      .eq('tenant_id', tenant.id)
      .eq('user_id', options.userId)
      .maybeSingle();

    return {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      membershipRole: membership?.status === 'active' ? membership.role : null,
      source: 'business',
    };
  }

  const { data: membership } = await supabase
    .from('tenant_memberships')
    .select('tenant_id, role, status, tenants!inner(id, slug, status)')
    .eq('user_id', options.userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  const joinedTenant = Array.isArray(membership?.tenants)
    ? membership?.tenants[0]
    : membership?.tenants;

  if (membership?.tenant_id && joinedTenant && ['active', 'paused'].includes(joinedTenant.status)) {
    return {
      tenantId: membership.tenant_id,
      tenantSlug: joinedTenant.slug,
      membershipRole: membership.role,
      source: 'membership',
    };
  }

  const { data: defaultTenantId, error: defaultError } = await supabase.rpc('default_tenant_id');
  if (defaultError || !defaultTenantId) {
    throw new Error('No existe un tenant predeterminado disponible');
  }

  const { data: defaultTenant } = await supabase
    .from('tenants')
    .select('id, slug, status')
    .eq('id', defaultTenantId)
    .single();

  if (!defaultTenant || !['active', 'paused'].includes(defaultTenant.status)) {
    throw new Error('El tenant predeterminado no está disponible');
  }

  return {
    tenantId: defaultTenant.id,
    tenantSlug: defaultTenant.slug,
    membershipRole: null,
    source: 'default',
  };
}
