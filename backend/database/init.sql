-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Create index on commonly searched fields
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- Insert sample data
INSERT INTO users (username, email, password_hash, first_name, last_name)
VALUES
    ('john_doe', 'john.doe@example.com', 'hashed_password_1', 'John', 'Doe'),
    ('jane_smith', 'jane.smith@example.com', 'hashed_password_2', 'Jane', 'Smith'),
    ('bob_johnson', 'bob.johnson@example.com', 'hashed_password_3', 'Bob', 'Johnson');
