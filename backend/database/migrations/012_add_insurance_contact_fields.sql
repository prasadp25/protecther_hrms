-- Migration: Add contact fields to company_settings for insurance
-- Date: 2026-04-30

ALTER TABLE company_settings
ADD COLUMN contact_person VARCHAR(100) NULL AFTER hospital_list_url,
ADD COLUMN contact_phone VARCHAR(20) NULL AFTER contact_person,
ADD COLUMN support_email VARCHAR(100) NULL AFTER contact_phone;
