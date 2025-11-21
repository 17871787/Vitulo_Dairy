-- SQL to link existing purchases to the Test Dairy Farm for dashboard testing

DO $$
DECLARE
  target_farm_id UUID;
BEGIN
  -- 1. Find the Test Dairy Farm ID
  SELECT id INTO target_farm_id FROM farms WHERE manager_email = 'dairy@test.com';

  IF target_farm_id IS NULL THEN
    RAISE EXCEPTION 'Test Dairy Farm not found. Run create-test-dairy-user.sql first.';
  END IF;

  -- 2. Link recent purchases to this farm
  -- This grabs the 20 most recent purchases and assigns them to the test farm
  UPDATE calf_purchases
  SET dairy_farm_id = target_farm_id
  WHERE id IN (
    SELECT id FROM calf_purchases
    WHERE dairy_farm_id IS NULL
    ORDER BY created_at DESC
    LIMIT 20
  );
  
  RAISE NOTICE 'Linked 20 recent purchases to farm %', target_farm_id;
END $$;
