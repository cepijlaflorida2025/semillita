# Database Schema - Semillita

Este archivo contiene todas las consultas SQL necesarias para crear las tablas de la base de datos en Supabase.

## Orden de Ejecución

**IMPORTANTE:** Las tablas deben crearse en este orden específico para respetar las dependencias de claves foráneas.

---

## 1. Tabla: users

```sql
CREATE TABLE public.users (
  id character varying NOT NULL DEFAULT gen_random_uuid(),
  alias character varying NOT NULL,
  avatar character varying,
  color_theme character varying DEFAULT 'green'::character varying,
  points integer DEFAULT 0,
  days_since_planting integer DEFAULT 0,
  age integer NOT NULL DEFAULT 10,
  context character varying NOT NULL DEFAULT 'home'::character varying,
  role character varying NOT NULL DEFAULT 'child'::character varying,
  parental_consent boolean DEFAULT false,
  parent_email character varying,
  parental_consent_date timestamp without time zone,
  consent_verified boolean DEFAULT false,
  is_workshop_mode boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
```

---

## 2. Tabla: achievements

```sql
CREATE TABLE public.achievements (
  id character varying NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description text,
  icon_name character varying,
  points_required integer,
  condition text,
  is_active boolean DEFAULT true,
  CONSTRAINT achievements_pkey PRIMARY KEY (id)
);
```

---

## 3. Tabla: emotions

```sql
CREATE TABLE public.emotions (
  id character varying NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  emoji character varying NOT NULL,
  color character varying NOT NULL,
  description text,
  CONSTRAINT emotions_pkey PRIMARY KEY (id)
);
```

---

## 4. Tabla: plants

```sql
CREATE TABLE public.plants (
  id character varying NOT NULL DEFAULT gen_random_uuid(),
  user_id character varying NOT NULL,
  name character varying,
  type character varying,
  status character varying DEFAULT 'growing'::character varying,
  planted_at timestamp without time zone DEFAULT now(),
  first_photo_url text,
  latest_photo_url text,
  milestones json,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT plants_pkey PRIMARY KEY (id),
  CONSTRAINT plants_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id)
);
```

---

## 5. Tabla: journal_entries

```sql
CREATE TABLE public.journal_entries (
  id character varying NOT NULL DEFAULT gen_random_uuid(),
  user_id character varying NOT NULL,
  plant_id character varying,
  emotion_id character varying,
  photo_url text,
  audio_url text,
  text_entry text,
  points_earned integer DEFAULT 10,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT journal_entries_pkey PRIMARY KEY (id),
  CONSTRAINT journal_entries_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT journal_entries_plant_id_plants_id_fk FOREIGN KEY (plant_id) REFERENCES public.plants(id),
  CONSTRAINT journal_entries_emotion_id_emotions_id_fk FOREIGN KEY (emotion_id) REFERENCES public.emotions(id)
);
```

---

## 6. Tabla: notifications

```sql
CREATE TABLE public.notifications (
  id character varying NOT NULL DEFAULT gen_random_uuid(),
  user_id character varying NOT NULL,
  title character varying,
  message text,
  type character varying DEFAULT 'reminder'::character varying,
  is_read boolean DEFAULT false,
  sent_at timestamp without time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id)
);
```

---

## 7. Tabla: profile_history

```sql
CREATE TABLE public.profile_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id character varying NOT NULL,
  photo_url text NOT NULL,
  plant_id character varying,
  type character varying NOT NULL CHECK (type::text = ANY (ARRAY['plant'::character varying, 'journal_entry'::character varying, 'seed'::character varying, 'avatar'::character varying]::text[])),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profile_history_pkey PRIMARY KEY (id)
);
```

---

## 8. Tabla: rewards

```sql
CREATE TABLE public.rewards (
  id character varying NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  description text,
  emoji character varying,
  points_cost integer NOT NULL,
  category character varying,
  is_active boolean DEFAULT true,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT rewards_pkey PRIMARY KEY (id)
);
```

---

## 9. Tabla: seeds

```sql
CREATE TABLE public.seeds (
  id character varying NOT NULL DEFAULT gen_random_uuid(),
  user_id character varying NOT NULL,
  type character varying NOT NULL,
  origin character varying,
  photo_url text,
  notes text,
  share_code character varying UNIQUE,
  is_shared boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT seeds_pkey PRIMARY KEY (id),
  CONSTRAINT seeds_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id)
);
```

---

## 10. Tabla: user_achievements

```sql
CREATE TABLE public.user_achievements (
  id character varying NOT NULL DEFAULT gen_random_uuid(),
  user_id character varying NOT NULL,
  achievement_id character varying NOT NULL,
  earned_at timestamp without time zone DEFAULT now(),
  CONSTRAINT user_achievements_pkey PRIMARY KEY (id),
  CONSTRAINT user_achievements_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_achievements_achievement_id_achievements_id_fk FOREIGN KEY (achievement_id) REFERENCES public.achievements(id)
);
```

---

## 11. Tabla: user_rewards

```sql
CREATE TABLE public.user_rewards (
  id character varying NOT NULL DEFAULT gen_random_uuid(),
  user_id character varying NOT NULL,
  reward_id character varying NOT NULL,
  purchased_at timestamp without time zone DEFAULT now(),
  CONSTRAINT user_rewards_pkey PRIMARY KEY (id),
  CONSTRAINT user_rewards_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_rewards_reward_id_rewards_id_fk FOREIGN KEY (reward_id) REFERENCES public.rewards(id)
);
```

---

## Instrucciones de Uso en Supabase

1. Accede al **SQL Editor** en tu proyecto de Supabase
2. Copia y pega cada consulta SQL en el orden indicado (1 a 11)
3. Ejecuta cada consulta una por una
4. Verifica que no haya errores antes de continuar con la siguiente tabla

### Alternativa: Ejecutar todas a la vez

Puedes copiar todas las consultas juntas y ejecutarlas en una sola operación, ya que están ordenadas respetando las dependencias.

---

## Verificación

Después de ejecutar todas las consultas, verifica que las 11 tablas se hayan creado correctamente en la sección **Table Editor** de Supabase.

### Consulta de verificación:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Deberías ver las siguientes tablas:
- achievements
- emotions
- journal_entries
- notifications
- plants
- profile_history
- rewards
- seeds
- user_achievements
- user_rewards
- users
