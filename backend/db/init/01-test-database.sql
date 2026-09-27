-- Runs once, when the MySQL container first creates its data volume.
-- A separate database keeps automated tests away from the demo data.
CREATE DATABASE IF NOT EXISTS envmonitor_test;
GRANT ALL PRIVILEGES ON envmonitor_test.* TO 'envapp'@'%';
FLUSH PRIVILEGES;
