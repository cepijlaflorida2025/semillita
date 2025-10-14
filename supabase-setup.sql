-- ========================================
-- SQL Script para configurar Supabase
-- Bucket: pas-san-miguel
-- ========================================
-- Este script debe ejecutarse paso a paso en el editor SQL de Supabase
-- Dashboard > SQL Editor > New Query

-- ========================================
-- PASO 1: Crear el bucket de almacenamiento
-- ========================================
-- IMPORTANTE: Ejecutar esto PRIMERO desde la UI de Supabase
-- Dashboard > Storage > Create a new bucket
-- Nombre: pas-san-miguel
-- Public bucket: Yes (para acceso público) o No (para privado)
--
-- O ejecutar este SQL (si tienes permisos):
INSERT INTO storage.buckets (id, name, public)
VALUES ('pas-san-miguel', 'pas-san-miguel', true)
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- PASO 2: Crear tabla de historial de perfiles
-- ========================================
CREATE TABLE IF NOT EXISTS profile_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  photo_url TEXT NOT NULL,
  plant_id VARCHAR(255),
  type VARCHAR(50) NOT NULL CHECK (type IN ('plant', 'journal_entry', 'seed', 'avatar')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- PASO 3: Crear índices para mejorar el rendimiento
-- ========================================
-- IMPORTANTE: Los índices se crean DESPUÉS de la tabla con CREATE INDEX

-- Índice en user_id para búsquedas rápidas por usuario
CREATE INDEX IF NOT EXISTS idx_profile_history_user_id
ON profile_history(user_id);

-- Índice en created_at para ordenamiento descendente
CREATE INDEX IF NOT EXISTS idx_profile_history_created_at
ON profile_history(created_at DESC);

-- Índice en type para filtrar por tipo de contenido
CREATE INDEX IF NOT EXISTS idx_profile_history_type
ON profile_history(type);

-- Índice compuesto para consultas frecuentes por usuario y tipo
CREATE INDEX IF NOT EXISTS idx_profile_history_user_type
ON profile_history(user_id, type);

-- ========================================
-- PASO 4: Habilitar Row Level Security (RLS)
-- ========================================
ALTER TABLE profile_history ENABLE ROW LEVEL SECURITY;

-- ========================================
-- PASO 5: Crear políticas de seguridad para profile_history
-- ========================================

-- Eliminar políticas existentes si existen (para evitar duplicados)
DROP POLICY IF EXISTS "Users can view own profile history" ON profile_history;
DROP POLICY IF EXISTS "Users can insert own profile history" ON profile_history;
DROP POLICY IF EXISTS "Users can delete own profile history" ON profile_history;

-- Política: Los usuarios solo pueden ver su propio historial
CREATE POLICY "Users can view own profile history"
  ON profile_history
  FOR SELECT
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Política: Los usuarios solo pueden insertar su propio historial
CREATE POLICY "Users can insert own profile history"
  ON profile_history
  FOR INSERT
  WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Política: Los usuarios pueden eliminar su propio historial
CREATE POLICY "Users can delete own profile history"
  ON profile_history
  FOR DELETE
  USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ========================================
-- PASO 6: Configurar políticas para el bucket 'pas-san-miguel'
-- ========================================

-- Eliminar políticas existentes del bucket (para evitar duplicados)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- Política: Acceso público de lectura (si el bucket es público)
CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'pas-san-miguel' );

-- Política: Usuarios autenticados pueden subir archivos
CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pas-san-miguel'
    AND auth.role() = 'authenticated'
  );

-- Política: Usuarios pueden actualizar sus propios archivos
CREATE POLICY "Users can update own files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'pas-san-miguel'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Política: Usuarios pueden eliminar sus propios archivos
CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pas-san-miguel'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ========================================
-- PASO 7: Crear función para limpiar historial antiguo
-- ========================================
CREATE OR REPLACE FUNCTION cleanup_old_profile_history()
RETURNS void AS $$
BEGIN
  -- Eliminar registros de historial mayores a 2 años
  DELETE FROM profile_history
  WHERE created_at < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- PASO 8: Crear vista para estadísticas de historial
-- ========================================
CREATE OR REPLACE VIEW profile_history_stats AS
SELECT
  user_id,
  type,
  COUNT(*) as total_uploads,
  MAX(created_at) as last_upload,
  MIN(created_at) as first_upload
FROM profile_history
GROUP BY user_id, type;

-- ========================================
-- PASO 9: Crear función trigger para actualizar metadata (opcional)
-- ========================================
CREATE OR REPLACE FUNCTION update_profile_history_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Agregar timestamp de última modificación
  NEW.metadata = jsonb_set(
    COALESCE(NEW.metadata, '{}'::jsonb),
    '{last_modified}',
    to_jsonb(NOW())
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger que actualiza metadata automáticamente
DROP TRIGGER IF EXISTS trigger_update_profile_history_metadata ON profile_history;
CREATE TRIGGER trigger_update_profile_history_metadata
  BEFORE INSERT OR UPDATE ON profile_history
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_history_metadata();

-- ========================================
-- VERIFICACIÓN Y CONSULTAS ÚTILES
-- ========================================

-- Verificar que la tabla fue creada correctamente
-- SELECT * FROM information_schema.tables WHERE table_name = 'profile_history';

-- Verificar índices creados
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'profile_history';

-- Verificar políticas de RLS
-- SELECT * FROM pg_policies WHERE tablename = 'profile_history';

-- Verificar que el bucket existe
-- SELECT * FROM storage.buckets WHERE id = 'pas-san-miguel';

-- Consultar historial de un usuario específico
-- SELECT * FROM profile_history WHERE user_id = 'USER_ID' ORDER BY created_at DESC;

-- Obtener estadísticas de un usuario
-- SELECT * FROM profile_history_stats WHERE user_id = 'USER_ID';

-- Contar archivos en el bucket
-- SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'pas-san-miguel';

-- ========================================
-- NOTAS IMPORTANTES
-- ========================================
-- 1. Ejecutar este script completo en el SQL Editor de Supabase
-- 2. Si algunos comandos fallan por políticas duplicadas, es normal - continúa
-- 3. Verificar que el bucket 'pas-san-miguel' existe antes de ejecutar
-- 4. Las políticas RLS protegen los datos a nivel de usuario
-- 5. Los índices mejoran el rendimiento de las consultas
-- 6. La vista profile_history_stats proporciona estadísticas útiles
