-- Insert mock users (password will be hashed later)
INSERT INTO users (full_name, tin, email, password_hash, phone, business_name, role) VALUES
('John Smith', 'TIN001', 'john.smith@email.com', 'temp_hash_1', '+251911111111', 'Smith Trading PLC', 'taxpayer'),
('Maria Garcia', 'TIN002', 'maria.garcia@email.com', 'temp_hash_2', '+251922222222', 'Garcia Imports', 'taxpayer'),
('Admin User', 'STAFF001', 'admin@tax.gov.et', 'temp_hash_3', '+251933333333', 'Ministry of Revenue', 'staff');

-- Insert mock taxpayer compliance records
INSERT INTO taxpayer_records (tin, has_filed_returns, has_paid_taxes, outstanding_balance) VALUES
('TIN001', true, true, 0.00),    -- Compliant taxpayer
('TIN002', true, false, 15000.00); -- Non-compliant (unpaid taxes)

-- Insert some TCC applications
INSERT INTO tcc_applications (user_id, status, submitted_at) VALUES
(1, 'Approved', '2024-01-10 09:00:00'),
(2, 'Submitted', '2024-01-15 10:00:00');