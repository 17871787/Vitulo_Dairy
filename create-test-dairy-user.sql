-- Create test dairy farm
INSERT INTO farms (id, name, manager_name, manager_email, manager_phone, address, status, farm_type)
VALUES (
  gen_random_uuid(),
  'Test Dairy Farm',
  'Test Dairy Manager',
  'dairy@test.com',
  '01234567890',
  'Test Address, Cumbria',
  'ACTIVE',
  'DAIRY_SUPPLIER'
)
ON CONFLICT (manager_email) DO NOTHING
RETURNING id;

-- Note: Save the farm ID from above

-- Create test dairy user (password: test123)
-- Password hash for 'test123' using bcrypt
INSERT INTO users (id, email, name, password_hash, role, farm_id)
VALUES (
  gen_random_uuid(),
  'dairy@test.com',
  'Test Dairy Farmer',
  '$2a$10$K7L1OJ0TfPi8dZ6hXH3d2OQkPqN4Nic9XmB6QoNXkqXkLxR3bqWEa',
  'DAIRY_SUPPLIER',
  (SELECT id FROM farms WHERE manager_email = 'dairy@test.com')
)
ON CONFLICT (email) DO UPDATE
SET
  name = EXCLUDED.name,
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  farm_id = EXCLUDED.farm_id;

-- Verify the user was created
SELECT u.email, u.name, u.role, f.name as farm_name
FROM users u
LEFT JOIN farms f ON u.farm_id = f.id
WHERE u.email = 'dairy@test.com';
