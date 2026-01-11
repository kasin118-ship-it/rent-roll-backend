-- ============================================
-- KINGBRIDGE TOWER - RENT ROLL SYSTEM
-- Database Migration Script
-- MariaDB 10.6+
-- ============================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";

-- ============================================
-- 1. COMPANIES & USERS
-- ============================================

CREATE TABLE IF NOT EXISTS `companies` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `name` VARCHAR(255) NOT NULL,
    `tax_id` VARCHAR(20) NOT NULL,
    `address_no` VARCHAR(50) NULL,
    `street` VARCHAR(100) NULL,
    `sub_district` VARCHAR(100) NULL,
    `district` VARCHAR(100) NULL,
    `province` VARCHAR(100) NULL,
    `postal_code` VARCHAR(10) NULL,
    `country` VARCHAR(50) DEFAULT 'Thailand',
    `phone` VARCHAR(20) NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uniq_company_tax_id` (`tax_id`, `deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `roles` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL UNIQUE,
    `description` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default roles
INSERT INTO `roles` (`name`, `description`) VALUES
    ('super_admin', 'Super Administrator'),
    ('admin', 'Company Administrator'),
    ('staff', 'Staff Member'),
    ('viewer', 'Read-Only User')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

CREATE TABLE IF NOT EXISTS `users` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `company_id` CHAR(36) NOT NULL,
    `role_id` INT NOT NULL,
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `full_name` VARCHAR(100) NULL,
    `is_active` BOOLEAN DEFAULT TRUE,
    `last_login` TIMESTAMP NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_users_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE KEY `uniq_user_email` (`email`, `deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. BUILDINGS & ASSETS
-- ============================================

CREATE TABLE IF NOT EXISTS `buildings` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `company_id` CHAR(36) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `address` TEXT NULL,
    `total_floors` INT DEFAULT 1,
    `rentable_area` DECIMAL(12, 2) DEFAULT 0.00,
    `construction_area` DECIMAL(12, 2) DEFAULT 0.00,
    `status` ENUM('active', 'inactive') DEFAULT 'active',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_buildings_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE KEY `uniq_building_code` (`company_id`, `code`, `deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `floors` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `building_id` CHAR(36) NOT NULL,
    `floor_number` VARCHAR(10) NOT NULL,
    `name` VARCHAR(255) NULL,
    `rentable_area` DECIMAL(10, 2) DEFAULT 0.00,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_floors_building` FOREIGN KEY (`building_id`) REFERENCES `buildings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `units` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `building_id` CHAR(36) NOT NULL,
    `floor_id` CHAR(36) NOT NULL,
    `unit_no` VARCHAR(50) NOT NULL,
    `area_sqm` DECIMAL(10, 2) DEFAULT 0.00,
    `status` ENUM('vacant', 'occupied', 'maintenance') DEFAULT 'vacant',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_units_building` FOREIGN KEY (`building_id`) REFERENCES `buildings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_units_floor` FOREIGN KEY (`floor_id`) REFERENCES `floors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE KEY `uniq_unit_no` (`building_id`, `unit_no`, `deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. CUSTOMERS
-- ============================================

CREATE TABLE IF NOT EXISTS `customers` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `company_id` CHAR(36) NOT NULL,
    `type` ENUM('individual', 'corporate') NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `tax_id` VARCHAR(20) NULL,
    `address_no` VARCHAR(50) NULL,
    `street` VARCHAR(100) NULL,
    `sub_district` VARCHAR(100) NULL,
    `district` VARCHAR(100) NULL,
    `province` VARCHAR(100) NULL,
    `postal_code` VARCHAR(10) NULL,
    `phone` VARCHAR(20) NULL,
    `email` VARCHAR(100) NULL,
    `contact_person` VARCHAR(100) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_customers_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE KEY `uniq_customer_tax_id` (`company_id`, `tax_id`, `deleted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. CONTRACTS
-- ============================================

CREATE TABLE IF NOT EXISTS `rent_contracts` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `company_id` CHAR(36) NOT NULL,
    `customer_id` CHAR(36) NOT NULL,
    `contract_no` VARCHAR(50) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `deposit_amount` DECIMAL(12, 2) DEFAULT 0.00,
    `status` ENUM('draft', 'active', 'expired', 'terminated', 'cancelled') DEFAULT 'draft',
    `previous_contract_id` CHAR(36) NULL,
    `renewal_count` INT DEFAULT 0,
    `notes` TEXT NULL,
    `version` INT DEFAULT 1,
    `created_by` CHAR(36) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_contracts_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_contracts_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_contracts_previous` FOREIGN KEY (`previous_contract_id`) REFERENCES `rent_contracts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_contracts_creator` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `chk_contract_dates` CHECK (`end_date` > `start_date`),
    UNIQUE KEY `uniq_contract_no` (`company_id`, `contract_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `contract_units` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `contract_id` CHAR(36) NOT NULL,
    `unit_id` CHAR(36) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_cu_contract` FOREIGN KEY (`contract_id`) REFERENCES `rent_contracts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_cu_unit` FOREIGN KEY (`unit_id`) REFERENCES `units`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE KEY `uniq_contract_unit` (`contract_id`, `unit_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rent_periods` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `contract_id` CHAR(36) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `rent_amount` DECIMAL(12, 2) NOT NULL,
    `period_order` INT DEFAULT 1,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_rp_contract` FOREIGN KEY (`contract_id`) REFERENCES `rent_contracts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `chk_rent_period_dates` CHECK (`end_date` > `start_date`),
    CONSTRAINT `chk_rent_amount` CHECK (`rent_amount` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `contract_documents` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `contract_id` CHAR(36) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_path` VARCHAR(500) NOT NULL,
    `file_size` INT NOT NULL,
    `file_type` VARCHAR(50) NULL,
    `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_cd_contract` FOREIGN KEY (`contract_id`) REFERENCES `rent_contracts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. SYSTEM TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS `audit_logs` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `user_id` VARCHAR(36) NULL,
    `company_id` CHAR(36) NULL,
    `action` VARCHAR(20) NOT NULL,
    `endpoint` VARCHAR(500) NOT NULL,
    `request_body` JSON NULL,
    `response_data` JSON NULL,
    `status_code` INT NULL,
    `error_message` TEXT NULL,
    `duration_ms` INT NULL,
    `performed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_audit_user` (`user_id`),
    INDEX `idx_audit_company` (`company_id`),
    INDEX `idx_audit_date` (`performed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `alerts` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `company_id` CHAR(36) NOT NULL,
    `contract_id` CHAR(36) NULL,
    `type` ENUM('expiry_90', 'expiry_60', 'expiry_30', 'expired', 'custom') NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NULL,
    `is_read` BOOLEAN DEFAULT FALSE,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_alerts_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_alerts_contract` FOREIGN KEY (`contract_id`) REFERENCES `rent_contracts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX `idx_alerts_company` (`company_id`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `company_id` CHAR(36) NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    `value` TEXT NULL,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_settings_company` FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY `uniq_setting_key` (`company_id`, `key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `backup_logs` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `company_id` CHAR(36) NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `file_size` BIGINT NULL,
    `status` ENUM('pending', 'running', 'completed', 'failed') DEFAULT 'pending',
    `error_message` TEXT NULL,
    `created_by` CHAR(36) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `completed_at` TIMESTAMP NULL,
    PRIMARY KEY (`id`),
    INDEX `idx_backup_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `refresh_tokens` (
    `id` CHAR(36) NOT NULL DEFAULT (UUID()),
    `user_id` CHAR(36) NOT NULL,
    `token_hash` VARCHAR(255) NOT NULL,
    `expires_at` TIMESTAMP NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_rt_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX `idx_rt_token` (`token_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- SEED DATA (Demo)
-- ============================================

INSERT INTO `companies` (`id`, `name`, `tax_id`, `address_no`, `street`, `sub_district`, `district`, `province`, `postal_code`) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Kingbridge Tower Management', '0105556789012', '123', 'Sukhumvit Road', 'Khlong Toei', 'Khlong Toei', 'Bangkok', '10110');

INSERT INTO `users` (`id`, `company_id`, `role_id`, `username`, `email`, `password_hash`, `full_name`) VALUES
    ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 2, 'admin', 'admin@kingbridge.com', '$argon2id$v=19$m=65536,t=3,p=4$randomsalt$hashedpassword', 'System Admin');
