-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Create index on commonly searched fields
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- Insert sample data
INSERT INTO users (username, email, password_hash)
VALUES
    ('john_doe', 'john.doe@example.com', 'hashed_password_1'),
    ('jane_smith', 'jane.smith@example.com', 'hashed_password_2'),
    ('bob_johnson', 'bob.johnson@example.com', 'hashed_password_3');
