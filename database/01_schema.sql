CREATE DATABASE IF NOT EXISTS accesseats;
USE accesseats;
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS DELIVERY_MANIFEST, PAYMENT, ORDER_ITEM, ORDERS, RIDER, PRODUCT, CATEGORY, ADDRESS, UI_PREFERENCE, USERS;
SET FOREIGN_KEY_CHECKS = 1;
-- 1. USERS Table
CREATE TABLE USERS (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Customer', 'Rider', 'Admin') NOT NULL DEFAULT 'Customer',
    delivery_assistance_note TEXT DEFAULT NULL
);

-- 2. UI_PREFERENCE Table (1:1 with USERS)
CREATE TABLE UI_PREFERENCE (
    pref_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    font_size VARCHAR(10) DEFAULT 'medium',
    high_contrast BOOLEAN DEFAULT FALSE,
    screen_reader BOOLEAN DEFAULT FALSE,
    voice_mode BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE
);

-- 3. ADDRESS Table (1:M from USERS)
CREATE TABLE ADDRESS (
    address_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    street VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    pincode VARCHAR(20) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE
);

-- 4. CATEGORY Table
CREATE TABLE CATEGORY (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

-- 5. PRODUCT Table (1:M from CATEGORY)
CREATE TABLE PRODUCT (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    stock INT NOT NULL CHECK (stock >= 0),
    FOREIGN KEY (category_id) REFERENCES CATEGORY(category_id)
);

-- 6. RIDER Table (1:1 with USERS for role='Rider')
CREATE TABLE RIDER (
    rider_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    vehicle_no VARCHAR(50) NOT NULL,
    availability BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE
);

-- 7. ORDERS Table
CREATE TABLE ORDERS (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    address_id INT NOT NULL,
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Pending', 'Processing', 'Completed', 'Cancelled') DEFAULT 'Pending',
    total_amount DECIMAL(10, 2) DEFAULT 0.00 CHECK (total_amount >= 0),
    FOREIGN KEY (user_id) REFERENCES USERS(user_id),
    FOREIGN KEY (address_id) REFERENCES ADDRESS(address_id)
);

-- 8. ORDER_ITEM Table (M:N between ORDERS and PRODUCT)
CREATE TABLE ORDER_ITEM (
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price > 0),
    PRIMARY KEY (order_id, product_id),
    FOREIGN KEY (order_id) REFERENCES ORDERS(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES PRODUCT(product_id)
);

-- 9. PAYMENT Table (1:M from ORDERS)
CREATE TABLE PAYMENT (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    method VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
    status ENUM('Pending', 'Success', 'Failed') NOT NULL DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES ORDERS(order_id) ON DELETE CASCADE
);

-- 10. DELIVERY_MANIFEST Table (1:1 with ORDERS)
CREATE TABLE DELIVERY_MANIFEST (
    manifest_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL UNIQUE,
    rider_id INT DEFAULT NULL,
    instructions TEXT NOT NULL,
    status ENUM('Pending', 'Assigned', 'Picked up', 'Delivered') DEFAULT 'Pending',
    delivered_at DATETIME DEFAULT NULL,
    FOREIGN KEY (order_id) REFERENCES ORDERS(order_id) ON DELETE CASCADE,
    FOREIGN KEY (rider_id) REFERENCES RIDER(rider_id) ON DELETE SET NULL
);