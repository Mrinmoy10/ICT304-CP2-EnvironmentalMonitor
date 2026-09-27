-- ============================================================
-- Cloud-Based Environmental Data Monitoring System
-- MySQL 8 schema — implements the eight entities of
-- ICT304 Assessment 1, Table 7 (third normal form).
--
-- Integrity rules from Assessment 1 section 2.3 are enforced by
-- the database itself (foreign keys and CHECK constraints), not
-- only by application code.
-- ============================================================

CREATE TABLE IF NOT EXISTS roles (
  role_id        TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_name      VARCHAR(30)  NOT NULL,
  permission_set VARCHAR(255) NOT NULL,
  PRIMARY KEY (role_id),
  UNIQUE KEY uq_roles_name (role_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  user_id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_id       TINYINT UNSIGNED NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(190) NOT NULL,
  password_hash CHAR(60)     NOT NULL,          -- bcrypt output is always 60 characters
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at DATETIME     NULL,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email),            -- the sign-in credential is unique (A1 2.3)
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (role_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS locations (
  location_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NULL,                -- the End User the location is assigned to
  name        VARCHAR(60)  NOT NULL,
  type        VARCHAR(40)  NOT NULL,
  PRIMARY KEY (location_id),
  UNIQUE KEY uq_locations_name (name),
  -- Accounts are disabled, never deleted (A1 2.3), so deletion is restricted.
  CONSTRAINT fk_locations_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS data_sources (
  source_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  source_type ENUM('IoT Sensor', 'Public API', 'Simulated') NOT NULL,
  endpoint    VARCHAR(255) NOT NULL,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  PRIMARY KEY (source_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sensor_readings (
  reading_id  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  location_id INT UNSIGNED NOT NULL,
  source_id   INT UNSIGNED NOT NULL,
  temperature DECIMAL(5,2) NOT NULL,
  humidity    DECIMAL(5,2) NOT NULL,
  air_quality DECIMAL(6,2) NOT NULL,
  recorded_at DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (reading_id),
  -- One location in a recent time window is the dominant query (five-second
  -- poll and trends chart), so this compound index serves both (A1 5.4).
  KEY idx_readings_location_time (location_id, recorded_at),
  -- A reading without its location is meaningless, so it is removed with it.
  CONSTRAINT fk_readings_location FOREIGN KEY (location_id) REFERENCES locations (location_id) ON DELETE CASCADE,
  CONSTRAINT fk_readings_source   FOREIGN KEY (source_id)   REFERENCES data_sources (source_id),
  -- Out-of-range data cannot be inserted at all (A1 5.4).
  CONSTRAINT chk_temperature CHECK (temperature BETWEEN -40 AND 85),
  CONSTRAINT chk_humidity    CHECK (humidity BETWEEN 0 AND 100),
  CONSTRAINT chk_air_quality CHECK (air_quality BETWEEN 0 AND 500)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS threshold_config (
  config_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  location_id INT UNSIGNED NOT NULL,
  metric      ENUM('temperature', 'humidity', 'air_quality') NOT NULL,
  warn_min    DECIMAL(6,2) NOT NULL,
  warn_max    DECIMAL(6,2) NOT NULL,
  crit_min    DECIMAL(6,2) NOT NULL,
  crit_max    DECIMAL(6,2) NOT NULL,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (config_id),
  UNIQUE KEY uq_threshold_location_metric (location_id, metric),
  CONSTRAINT fk_threshold_location FOREIGN KEY (location_id) REFERENCES locations (location_id) ON DELETE CASCADE,
  -- A badly ordered band would silently stop alerts, so the database refuses it.
  CONSTRAINT chk_band_order CHECK (crit_min <= warn_min AND warn_min <= warn_max AND warn_max <= crit_max)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS alerts (
  alert_id   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reading_id BIGINT UNSIGNED NOT NULL,          -- every alert traces back to its evidence (A1 2.3)
  config_id  INT UNSIGNED    NOT NULL,
  severity   ENUM('warning', 'critical') NOT NULL,
  message    VARCHAR(255)    NOT NULL,
  created_at DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (alert_id),
  KEY idx_alerts_created (created_at),
  CONSTRAINT fk_alerts_reading FOREIGN KEY (reading_id) REFERENCES sensor_readings (reading_id) ON DELETE CASCADE,
  CONSTRAINT fk_alerts_config  FOREIGN KEY (config_id)  REFERENCES threshold_config (config_id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS alert_acknowledgements (
  ack_id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  alert_id        BIGINT UNSIGNED NOT NULL,
  user_id         INT UNSIGNED    NOT NULL,
  acknowledged_at DATETIME(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  note            VARCHAR(255)    NULL,
  PRIMARY KEY (ack_id),
  KEY idx_ack_alert (alert_id),
  CONSTRAINT fk_ack_alert FOREIGN KEY (alert_id) REFERENCES alerts (alert_id) ON DELETE CASCADE,
  CONSTRAINT fk_ack_user  FOREIGN KEY (user_id)  REFERENCES users (user_id) ON DELETE RESTRICT
) ENGINE=InnoDB;
