-- Create target database for POC (source_db is created via MYSQL_DATABASE).
CREATE DATABASE IF NOT EXISTS target_db;
GRANT ALL ON target_db.* TO 'liquibase'@'%';
FLUSH PRIVILEGES;
