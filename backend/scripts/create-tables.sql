-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    tin VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    business_name VARCHAR(255),
    role VARCHAR(20) CHECK (role IN ('taxpayer', 'staff')) DEFAULT 'taxpayer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create taxpayer_records table (mock compliance data)
CREATE TABLE IF NOT EXISTS taxpayer_records (
    id SERIAL PRIMARY KEY,
    tin VARCHAR(50) UNIQUE NOT NULL REFERENCES users(tin),
    has_filed_returns BOOLEAN DEFAULT false,
    has_paid_taxes BOOLEAN DEFAULT false,
    outstanding_balance DECIMAL(15,2) DEFAULT 0.00,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create tcc_applications table
CREATE TABLE IF NOT EXISTS tcc_applications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    status VARCHAR(20) CHECK (status IN ('Submitted', 'Under Review', 'Approved', 'Rejected')) DEFAULT 'Submitted',
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id),
    reviewed_at TIMESTAMP,
    rejection_reason TEXT
);

-- Create issued_certificates table
CREATE TABLE IF NOT EXISTS issued_certificates (
    id SERIAL PRIMARY KEY,
    application_id INTEGER REFERENCES tcc_applications(id),
    tcc_number VARCHAR(100) UNIQUE NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    pdf_file_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_tin ON users(tin);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_tcc_applications_status ON tcc_applications(status);
CREATE INDEX IF NOT EXISTS idx_tcc_applications_user_id ON tcc_applications(user_id);