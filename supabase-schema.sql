-- ==============================================================================
-- Supabase Schema & Realtime Setup for Battery Health Monitor Cross-Device Sharing
-- Run this script in the Supabase SQL Editor (supabase.com -> Project -> SQL Editor)
-- ==============================================================================

-- 1. Create table for dashboard rooms
CREATE TABLE IF NOT EXISTS public.dashboard_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    host_user_id UUID,
    host_session_id TEXT,
    latest_reading JSONB,
    last_heartbeat TIMESTAMPTZ DEFAULT now(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for instant lookup by room code
CREATE INDEX IF NOT EXISTS idx_dashboard_rooms_code ON public.dashboard_rooms(code);

-- 2. Create table for rate-limited historical telemetry snapshots
CREATE TABLE IF NOT EXISTS public.telemetry_history (
    id BIGSERIAL PRIMARY KEY,
    room_code TEXT NOT NULL REFERENCES public.dashboard_rooms(code) ON DELETE CASCADE,
    voltage NUMERIC(6, 3),
    temperature NUMERIC(5, 2),
    raw_string TEXT,
    sensor_fault BOOLEAN DEFAULT false,
    sensor_fault_reason TEXT,
    source TEXT DEFAULT 'hardware',
    measured_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_history_room_time ON public.telemetry_history(room_code, measured_at DESC);

-- 3. Enable Row-Level Security (RLS)
ALTER TABLE public.dashboard_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_history ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies:
-- Any authenticated (including anonymous auth) or public user with the room code can view room data
CREATE POLICY "Allow reading room by room code"
    ON public.dashboard_rooms
    FOR SELECT
    USING (true);

-- Allow creating or updating a room record
CREATE POLICY "Allow upserting room"
    ON public.dashboard_rooms
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Telemetry history policies
CREATE POLICY "Allow reading history"
    ON public.telemetry_history
    FOR SELECT
    USING (true);

CREATE POLICY "Allow inserting history"
    ON public.telemetry_history
    FOR INSERT
    WITH CHECK (true);

-- 5. Enable Supabase Realtime publication on these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.dashboard_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.telemetry_history;
