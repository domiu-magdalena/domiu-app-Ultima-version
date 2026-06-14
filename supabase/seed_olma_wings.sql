-- Seed Olma Wings and SmokeHouse products
-- Negocio ID: 58ed85d5-94a7-4433-afab-3b9bf7de8d6f
-- Run this ONCE after the negocio exists in the DB

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM negocios WHERE id = '58ed85d5-94a7-4433-afab-3b9bf7de8d6f') THEN

    -- Wing Packs (6 sizes with base prices)
    INSERT INTO productos (negocio_id, nombre, descripcion, precio, categoria_producto, disponible, imagen) VALUES
    ('58ed85d5-94a7-4433-afab-3b9bf7de8d6f', '6 und',        'Pack de 6 alitas',               24000, 'Pack Alitas', true, ''),
    ('58ed85d5-94a7-4433-afab-3b9bf7de8d6f', '12 und',       'Pack de 12 alitas',             46000, 'Pack Alitas', true, ''),
    ('58ed85d5-94a7-4433-afab-3b9bf7de8d6f', '18 und',       'Pack de 18 alitas',             68000, 'Pack Alitas', true, ''),
    ('58ed85d5-94a7-4433-afab-3b9bf7de8d6f', '24 und',       'Pack de 24 alitas',             90000, 'Pack Alitas', true, ''),
    ('58ed85d5-94a7-4433-afab-3b9bf7de8d6f', '30 und',       'Pack de 30 alitas',            112000, 'Pack Alitas', true, ''),
    ('58ed85d5-94a7-4433-afab-3b9bf7de8d6f', '36 und',       'Pack de 36 alitas',            134000, 'Pack Alitas', true, '');

    -- Sauces (9 sauces, used as included/picker options)
    INSERT INTO productos (negocio_id, nombre, descripcion, precio, categoria_producto, disponible, imagen) VALUES
    ('58ed85d5-94a7-4433-afab-3b9bf7de8d6f', 'BBQ Picante',    'Salsa BBQ picante',       0, 'Salsa', true, ''),
    ('58ed85d5-94a7-4433-afab-3b9bf7de8d6f', 'Gochujang',      'Salsa coreana Gochujang', 0, 'Salsa', true, ''),
    ('58ed85d5-94a7-4433-afab-3b9bf7de8d6f', 'Corozo',         'Salsa de corozo',         0, 'Salsa', true, ''),
    ('58ed85d5-94a7-4433-afab-3b9bf7de8d6f', 'Ajo',            'Salsa de ajo',            0, 'Salsa', true, ''),
    ('58ed85d5-94a7-4433-afab-3b9bf7de8d6f', 'Tamarindo',      'Salsa de tamarindo',      0, 'Salsa', true, ''),
    ('58ed85d5-94a7-4433-afab-3b9bf7de8d6f', 'Mango Picante',  'Salsa mango picante',     0, 'Salsa', true, ''),
    ('58ed85d5-94a7-4433-afab-3b9bf7de8d6f', 'Maracuyá',       'Salsa de maracuyá',       0, 'Salsa', true, ''),
    ('58ed85d5-94a7-4433-afab-3b9bf7de8d6f', 'Miel Mostaza',   'Salsa miel mostaza',      0, 'Salsa', true, ''),
    ('58ed85d5-94a7-4433-afab-3b9bf7de8d6f', 'BBQ Ahumada',    'Salsa BBQ ahumada',       0, 'Salsa', true, '');

    -- Gaseosas
    INSERT INTO productos (negocio_id, nombre, descripcion, precio, categoria_producto, disponible, imagen) VALUES
    ('58ed85d5-94a7-4433-afab-3b9bf7de8d6f', 'Coca Cola',   'Gaseosa Coca Cola personal',  5000, 'Gaseosa', true, ''),
    ('58ed85d5-94a7-4433-afab-3b9bf7de8d6f', 'Sprite',      'Gaseosa Sprite personal',     5000, 'Gaseosa', true, ''),
    ('58ed85d5-94a7-4433-afab-3b9bf7de8d6f', 'Colombiana',  'Gaseosa Colombiana personal', 5000, 'Gaseosa', true, ''),
    ('58ed85d5-94a7-4433-afab-3b9bf7de8d6f', 'Agua',        'Agua embotellada',            3000, 'Gaseosa', true, ''),
    ('58ed85d5-94a7-4433-afab-3b9bf7de8d6f', 'Hatsu',       'Bebida saborizada Hatsu',     7000, 'Gaseosa', true, '');

    -- Cervezas
    INSERT INTO productos (negocio_id, nombre, descripcion, precio, categoria_producto, disponible, imagen) VALUES
    ('58ed85d5-94a7-4433-afab-3b9bf7de8d6f', 'Heineken',  'Cerveza Heineken',  6000, 'Cerveza', true, ''),
    ('58ed85d5-94a7-4433-afab-3b9bf7de8d6f', 'Corona',    'Cerveza Corona',    6000, 'Cerveza', true, ''),
    ('58ed85d5-94a7-4433-afab-3b9bf7de8d6f', 'Poker',     'Cerveza Poker',     6000, 'Cerveza', true, ''),
    ('58ed85d5-94a7-4433-afab-3b9bf7de8d6f', 'Costeña',   'Cerveza Costeña',   6000, 'Cerveza', true, '');

    -- Adiciones
    INSERT INTO productos (negocio_id, nombre, descripcion, precio, categoria_producto, disponible, imagen) VALUES
    ('58ed85d5-94a7-4433-afab-3b9bf7de8d6f', 'Salsa extra',           'Salsa adicional',           2300, 'Adición', true, ''),
    ('58ed85d5-94a7-4433-afab-3b9bf7de8d6f', 'Alita extra',           'Alita de pollo extra',      4500, 'Adición', true, ''),
    ('58ed85d5-94a7-4433-afab-3b9bf7de8d6f', 'Porción extra de papas', 'Porción adicional de papas', 4000, 'Adición', true, '');

  END IF;
END $$;
