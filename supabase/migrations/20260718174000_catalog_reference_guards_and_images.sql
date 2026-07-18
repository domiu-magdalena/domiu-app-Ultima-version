-- DomiU Magdalena
-- Protecciones comunes para catálogos investigados y asignación estable de imágenes digitales.
-- Los productos de comercios no aliados pueden consultarse, pero no comprarse hasta ser validados.

update public.products p
set image_url='/api/catalog-image?type=' ||
  case
    when lower(coalesce(c.slug,'')) similar to '%(alita|tender)%' then 'wings'
    when lower(coalesce(c.slug,'')) similar to '%(pizza)%' then 'pizza'
    when lower(coalesce(c.slug,'')) similar to '%(pasta|lasana|spaghetti|ravioli)%' then 'pasta'
    when lower(coalesce(c.slug,'')) similar to '%(pan|pasteler|postre|croissant|cafe)%' then 'bakery'
    when lower(coalesce(c.slug,'')) similar to '%(farm|dolor|auxilio|higiene|bebe|proteccion)%' then 'pharmacy'
    when lower(coalesce(c.slug,'')) similar to '%(cerveza|licor|vino|mezclador)%' then 'liquor'
    when lower(coalesce(c.slug,'')) similar to '%(bebida)%' then 'beverage'
    when lower(coalesce(c.slug,'')) similar to '%(hamburg|sandwich)%' then 'burger'
    when lower(coalesce(c.slug,'')) similar to '%(despensa|lacteo|fruta|verdura|aseo|cuidado)%' then 'grocery'
    else 'default'
  end || '&name=' || replace(replace(p.name,' ','%20'),'&','%26'),
  metadata=coalesce(p.metadata,'{}'::jsonb)||jsonb_build_object(
    'image_status','reference',
    'image_source','DomiU generated digital illustration',
    'image_disclaimer','Imagen digital de referencia; no es fotografía oficial del producto',
    'requires_owner_validation',true
  ),
  updated_at=now()
from public.categories c
where p.category_id=c.id
  and p.deleted_at is null
  and (
    p.image_url is null
    or p.image_url like '/api/catalog-image%'
    or coalesce(p.metadata->>'image_status','') in ('pending_official','reference')
  );

-- Olma conserva el catálogo suministrado por el comercio y queda habilitado solo mientras
-- exista una jornada operativa abierta.
update public.businesses
set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
  'catalog_ready',true,
  'images_status','generated_reference',
  'images_disclaimer','Las imágenes digitales son referencias visuales y requieren aprobación del comercio',
  'prices_status','owner_supplied_pending_final_confirmation'
),
updated_at=now()
where slug='olma-wings-and-smokehouse';

-- Fichas investigadas: catálogo visible, pedidos bloqueados, inventario no sincronizado.
update public.businesses
set is_accepting_orders=false,
    operations_status='closed',
    metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
      'catalog_ready',true,
      'catalog_status','preview',
      'prices_status','reference_pending_owner_confirmation',
      'stock_status','not_synced',
      'images_status','generated_reference',
      'catalog_disclaimer','Productos, precios, imágenes e inventario de referencia; requieren validación del establecimiento',
      'accepting_orders',false,
      'operational_open',false
    ),
    updated_at=now()
where deleted_at is null
  and slug<>'olma-wings-and-smokehouse'
  and coalesce(metadata->>'catalog_status','preview')<>'live';

-- Reglas adicionales para farmacias: no habilitar prescripción sin validación profesional.
update public.products p
set metadata=coalesce(p.metadata,'{}'::jsonb)||jsonb_build_object(
  'requires_pharmacist_validation',true,
  'prescription_product',false
),updated_at=now()
from public.businesses b
where p.business_id=b.id
  and b.business_type='pharmacy'
  and p.deleted_at is null;

update public.businesses
set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
  'pharmacist_validation_required',true,
  'catalog_disclaimer','Catálogo sin medicamentos de prescripción; precios y disponibilidad requieren validación de la droguería'
),updated_at=now()
where business_type='pharmacy' and deleted_at is null;

-- Reglas para licoreras: venta restringida a mayores de edad e identificación en entrega.
update public.products p
set metadata=coalesce(p.metadata,'{}'::jsonb)||jsonb_build_object(
  'age_restricted',true,
  'minimum_age',18,
  'identity_check_required',true
),updated_at=now()
from public.businesses b
where p.business_id=b.id
  and b.business_type='liquor_store'
  and p.deleted_at is null;

update public.businesses
set metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object(
  'age_restricted',true,
  'minimum_age',18,
  'identity_check_required',true,
  'catalog_disclaimer','Venta exclusiva a mayores de edad; productos, marcas, precios y disponibilidad requieren validación del establecimiento'
),updated_at=now()
where business_type='liquor_store' and deleted_at is null;
