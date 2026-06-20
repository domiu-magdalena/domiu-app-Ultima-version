-- Migration: 20250620_coverage_polygons_geofencing
-- Description: Coverage zone polygons and geofence events for Módulo 7

-- Add polygon column to zones table if not exists
ALTER TABLE zones ADD COLUMN IF NOT EXISTS polygon_json JSONB DEFAULT NULL;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS radius_km DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS base_delivery_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE zones ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER DEFAULT 30;

-- ============================================================
-- GEOFENCE EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS geofence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'arrived_at_business',
    'picked_up_order',
    'departed_business',
    'arrived_at_customer',
    'delivered_order',
    'departed_customer',
    'entered_zone',
    'exited_zone'
  )),
  latitude DECIMAL(10,7) NOT NULL,
  longitude DECIMAL(10,7) NOT NULL,
  accuracy DECIMAL(10,2) DEFAULT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_geofence_events_order ON geofence_events(order_id);
CREATE INDEX IF NOT EXISTS idx_geofence_events_driver ON geofence_events(driver_id);
CREATE INDEX IF NOT EXISTS idx_geofence_events_type ON geofence_events(event_type);
CREATE INDEX IF NOT EXISTS idx_geofence_events_created ON geofence_events(created_at);

-- ============================================================
-- COVERAGE POLYGONS
-- ============================================================
CREATE TABLE IF NOT EXISTS coverage_polygons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  polygon_json JSONB NOT NULL,
  color VARCHAR(20) DEFAULT '#6366F1',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coverage_polygons_zone ON coverage_polygons(zone_id);
CREATE INDEX IF NOT EXISTS idx_coverage_polygons_active ON coverage_polygons(is_active);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE geofence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE coverage_polygons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Drivers insert geofence events" ON geofence_events;
DROP POLICY IF EXISTS "Users read geofence events" ON geofence_events;
DROP POLICY IF EXISTS "Admins manage coverage polygons" ON coverage_polygons;
DROP POLICY IF EXISTS "Anyone read coverage polygons" ON coverage_polygons;

CREATE POLICY "Drivers insert geofence events" ON geofence_events
  FOR INSERT WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Users read geofence events" ON geofence_events
  FOR SELECT USING (
    auth.uid() = driver_id OR
    auth.uid() IN (SELECT customer_id FROM orders WHERE id = order_id) OR
    auth.uid() IN (SELECT owner_id FROM businesses WHERE id IN (SELECT business_id FROM orders WHERE id = order_id)) OR
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

CREATE POLICY "Admins manage coverage polygons" ON coverage_polygons
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "Anyone read coverage polygons" ON coverage_polygons
  FOR SELECT USING (is_active = true);

-- ============================================================
-- FUNCTION: Auto-detect geofence events
-- ============================================================
CREATE OR REPLACE FUNCTION detect_geofence_event()
RETURNS TRIGGER AS $$
DECLARE
  v_order_status VARCHAR;
  v_business_lat DECIMAL;
  v_business_lng DECIMAL;
  v_customer_lat DECIMAL;
  v_customer_lng DECIMAL;
  v_dist_to_business DECIMAL;
  v_dist_to_customer DECIMAL;
BEGIN
  -- Get order status
  SELECT status INTO v_order_status FROM orders WHERE id = NEW.order_id;

  -- Get business location
  SELECT ba.latitude, ba.longitude INTO v_business_lat, v_business_lng
  FROM orders o
  JOIN businesses b ON b.id = o.business_id
  JOIN business_addresses ba ON ba.business_id = b.id AND ba.is_primary = true
  WHERE o.id = NEW.order_id
  LIMIT 1;

  -- Get customer location
  SELECT a.latitude, a.longitude INTO v_customer_lat, v_customer_lng
  FROM orders o
  JOIN addresses a ON a.id = o.delivery_address_id
  WHERE o.id = NEW.order_id
  LIMIT 1;

  -- Calculate distances (simplified - using abs diff for speed)
  v_dist_to_business := ABS(NEW.latitude - COALESCE(v_business_lat, 0)) + ABS(NEW.longitude - COALESCE(v_business_lng, 0));
  v_dist_to_customer := ABS(NEW.latitude - COALESCE(v_customer_lat, 0)) + ABS(NEW.longitude - COALESCE(v_customer_lng, 0));

  -- Auto-detect "arrived at business" (within ~50m)
  IF v_dist_to_business < 0.001 AND v_order_status IN ('confirmed', 'preparing', 'ready') THEN
    INSERT INTO geofence_events (order_id, driver_id, event_type, latitude, longitude, accuracy)
    VALUES (NEW.order_id, NEW.driver_id, 'arrived_at_business', NEW.latitude, NEW.longitude, NEW.accuracy)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Auto-detect "arrived at customer" (within ~50m)  
  IF v_dist_to_customer < 0.001 AND v_order_status IN ('assigned', 'picked_up', 'in_transit') THEN
    INSERT INTO geofence_events (order_id, driver_id, event_type, latitude, longitude, accuracy)
    VALUES (NEW.order_id, NEW.driver_id, 'arrived_at_customer', NEW.latitude, NEW.longitude, NEW.accuracy)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_detect_geofence ON driver_locations;
CREATE TRIGGER auto_detect_geofence
  AFTER INSERT ON driver_locations
  FOR EACH ROW
  EXECUTE FUNCTION detect_geofence_event();
