-- Script para agregar CASCADE DELETE a todas las foreign keys relacionadas con users
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar constraint existente de plants y recrear con ON DELETE CASCADE
ALTER TABLE plants
DROP CONSTRAINT IF EXISTS plants_user_id_users_id_fk;

ALTER TABLE plants
ADD CONSTRAINT plants_user_id_users_id_fk
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;

-- 2. Eliminar constraint existente de journal_entries y recrear con ON DELETE CASCADE
ALTER TABLE journal_entries
DROP CONSTRAINT IF EXISTS journal_entries_user_id_users_id_fk;

ALTER TABLE journal_entries
ADD CONSTRAINT journal_entries_user_id_users_id_fk
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;

-- También para plant_id en journal_entries
ALTER TABLE journal_entries
DROP CONSTRAINT IF EXISTS journal_entries_plant_id_plants_id_fk;

ALTER TABLE journal_entries
ADD CONSTRAINT journal_entries_plant_id_plants_id_fk
FOREIGN KEY (plant_id)
REFERENCES plants(id)
ON DELETE CASCADE;

-- 3. Seeds
ALTER TABLE seeds
DROP CONSTRAINT IF EXISTS seeds_user_id_users_id_fk;

ALTER TABLE seeds
ADD CONSTRAINT seeds_user_id_users_id_fk
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;

-- 4. User Achievements
ALTER TABLE user_achievements
DROP CONSTRAINT IF EXISTS user_achievements_user_id_users_id_fk;

ALTER TABLE user_achievements
ADD CONSTRAINT user_achievements_user_id_users_id_fk
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;

-- 5. Notifications
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_user_id_users_id_fk;

ALTER TABLE notifications
ADD CONSTRAINT notifications_user_id_users_id_fk
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;

-- 6. User Rewards
ALTER TABLE user_rewards
DROP CONSTRAINT IF EXISTS user_rewards_user_id_users_id_fk;

ALTER TABLE user_rewards
ADD CONSTRAINT user_rewards_user_id_users_id_fk
FOREIGN KEY (user_id)
REFERENCES users(id)
ON DELETE CASCADE;

-- Verificar que todos los constraints se hayan actualizado correctamente
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
    AND rc.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'users'
ORDER BY tc.table_name;
