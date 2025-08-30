ALTER TABLE ro_cpq.users ADD COLUMN 2fa_secret VARCHAR(255); 
ALTER TABLE ro_cpq.users ADD COLUMN two_fa_enabled BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS ro_cpq.user_activity_logs (                       
id INT AUTO_INCREMENT PRIMARY KEY,                                       
user_id INT NOT NULL,                                                    
timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,                            
ip_address VARCHAR(45),                                                  
device_info TEXT,                                                        
location VARCHAR(255),                                                   
page_accessed VARCHAR(255),                                              
event_type VARCHAR(50),                                                  
session_id VARCHAR(255),                                                 
FOREIGN KEY (user_id) REFERENCES ro_cpq.users(user_id)                   
);     


insert into ro_cpq.role_access(`role`,`icon_label`) values ('Admin','Analytics');


ALTER TABLE `users` 
ADD COLUMN `two_fa_secret` VARCHAR(255) NULL AFTER `last_login`,
ADD COLUMN `two_fa_enabled` BOOLEAN NOT NULL DEFAULT FALSE AFTER `two_fa_secret`,
ADD COLUMN `can_regenerate_2fa` BOOLEAN NOT NULL DEFAULT FALSE AFTER `two_fa_enabled`;