-- ========================================
-- Migration: Simplificar roles a solo 2 opciones
-- Fecha: 2025-10-02
-- ========================================
-- Este script actualiza el sistema de roles para tener solo:
-- - "child" (niño/niña)
-- - "professional" (profesional/cuidador)
--
-- También simplifica el sistema de consentimiento para que sea
-- solo una confirmación de términos leídos/aceptados.
-- ========================================

-- PASO 1: Actualizar usuarios existentes con rol "caregiver" a "professional"
UPDATE users
SET role = 'professional'
WHERE role = 'caregiver';

-- PASO 2: Actualizar el campo consentVerified a true para todos los usuarios
-- En modo prototipo, todos tienen acceso liberado
UPDATE users
SET consent_verified = true;

-- PASO 3: Verificar los cambios
-- SELECT role, COUNT(*) as count FROM users GROUP BY role;
-- SELECT consent_verified, COUNT(*) as count FROM users GROUP BY consent_verified;

-- ========================================
-- NOTAS IMPORTANTES
-- ========================================
-- 1. Este script es seguro de ejecutar múltiples veces (idempotente)
-- 2. No elimina datos, solo actualiza valores existentes
-- 3. Después de ejecutar, solo deberían existir roles "child" y "professional"
-- 4. Todos los usuarios tendrán consent_verified = true (modo prototipo)
-- 5. En producción, se mantendrá la tabla de registro de consentimientos
--    para tener un historial de quién aceptó los términos y cuándo
