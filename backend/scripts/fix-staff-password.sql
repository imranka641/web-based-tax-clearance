-- First, let's see what passwords we have
SELECT id, email, password_hash FROM users;

-- Update the staff user with a properly hashed password for 'password123'
UPDATE users 
SET password_hash = '$2a$10$8K1p/a0dRTlR0d.kY2sZWu2D8L2F0c9H8qYQY2bB5v5J5nY5v5J5W' 
WHERE email = 'admin@tax.gov.et' AND role = 'staff';

-- Verify the update
SELECT id, email, role, password_hash FROM users WHERE role = 'staff';