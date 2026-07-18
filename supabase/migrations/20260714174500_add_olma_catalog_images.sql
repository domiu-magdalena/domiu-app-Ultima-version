do $migration$
declare
  v_business_id uuid;
begin
  select id into v_business_id
  from public.businesses
  where slug = 'olma-wings-and-smokehouse'
    and deleted_at is null
  limit 1;

  if v_business_id is null then
    raise notice 'Olma Wings no existe todavía; se omite la carga de imágenes.';
    return;
  end if;

  update public.products
  set image_url = case
    when name like 'Orden de % alitas' then 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=900&h=700&fit=crop'
    when name = 'Sándwich de pollo' then 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&h=700&fit=crop'
    when name = 'Sándwich pulled pork' then 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=900&h=700&fit=crop'
    when name = 'Sándwich brisket' then 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=900&h=700&fit=crop'
    when name = 'Orden de 4 tenders' then 'https://images.unsplash.com/photo-1562967914-608f82629710?w=900&h=700&fit=crop'
    when name = 'Alita adicional' then 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=900&h=700&fit=crop'
    when name = 'Papas 150 g' then 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=900&h=700&fit=crop'
    when name = 'Salsa extra' then 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?w=900&h=700&fit=crop'
    when name = 'Agua' then 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=900&h=700&fit=crop'
    when name like 'Agua saborizada%' then 'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=900&h=700&fit=crop'
    when name like 'Coca-Cola%' then 'https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=900&h=700&fit=crop'
    when name like 'Sprite%' then 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=900&h=700&fit=crop'
    when name like 'Postobón manzana%' or name like 'Colombiana%' then 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=900&h=700&fit=crop'
    when name = 'Hatsu' then 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=900&h=700&fit=crop'
    when name in ('Corona','Costeña','Heineken','Poker') then 'https://images.unsplash.com/photo-1516458464372-eea4ab222b31?w=900&h=700&fit=crop'
    else coalesce(image_url, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&h=700&fit=crop')
  end,
  updated_at = now()
  where business_id = v_business_id
    and deleted_at is null;

  update public.categories
  set image_url = case name
    when 'Alitas ahumadas' then 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=900&h=500&fit=crop'
    when 'Sándwiches' then 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=900&h=500&fit=crop'
    when 'Tenders' then 'https://images.unsplash.com/photo-1562967914-608f82629710?w=900&h=500&fit=crop'
    when 'Adicionales' then 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=900&h=500&fit=crop'
    when 'Bebidas' then 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=900&h=500&fit=crop'
    when 'Cervezas' then 'https://images.unsplash.com/photo-1516458464372-eea4ab222b31?w=900&h=500&fit=crop'
    else image_url
  end,
  updated_at = now()
  where business_id = v_business_id;
end
$migration$;
