-- Users table (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  vibe_preferences JSONB DEFAULT '{
    "greenery": 0.5,
    "quietness": 0.5,
    "culture": 0.5,
    "scenery": 0.5
  }'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vibe dimensions table
CREATE TABLE public.vibe_dimensions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  emoji TEXT,
  color TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default vibe dimensions
INSERT INTO public.vibe_dimensions (name, emoji, color, description) VALUES
  ('greenery', '🌳', '#a8e6a3', 'Parks, trees, and nature'),
  ('quietness', '🔇', '#b3e5fc', 'Low noise levels and peaceful areas'),
  ('culture', '🎨', '#ffcdd2', 'Museums, galleries, and landmarks'),
  ('scenery', '🏞️', '#fff9c4', 'Beautiful views and architecture');

-- Points of Interest (POIs)
CREATE TABLE public.pois (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  address TEXT,
  category TEXT,
  vibe_scores JSONB DEFAULT '{}'::JSONB,
  embedding vector(1536), -- For RAG-powered stories
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial index
CREATE INDEX idx_pois_location ON public.pois USING GIST(location);
CREATE INDEX idx_pois_embedding ON public.pois USING ivfflat(embedding vector_cosine_ops);

-- Routes table
CREATE TABLE public.routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  start_point GEOGRAPHY(POINT, 4326) NOT NULL,
  end_point GEOGRAPHY(POINT, 4326) NOT NULL,
  waypoints JSONB DEFAULT '[]'::JSONB,
  path GEOGRAPHY(LINESTRING, 4326),
  vibe_weights JSONB NOT NULL,
  total_distance FLOAT,
  estimated_duration INTEGER, -- in seconds
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial indices
CREATE INDEX idx_routes_start_point ON public.routes USING GIST(start_point);
CREATE INDEX idx_routes_end_point ON public.routes USING GIST(end_point);
CREATE INDEX idx_routes_path ON public.routes USING GIST(path);

-- User location sharing (for real-time features)
CREATE TABLE public.location_shares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  share_code TEXT UNIQUE DEFAULT substr(md5(random()::text), 1, 8),
  current_location GEOGRAPHY(POINT, 4326),
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial index
CREATE INDEX idx_location_shares_current_location ON public.location_shares USING GIST(current_location);

-- Route segments with vibe scores
CREATE TABLE public.route_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID REFERENCES public.routes(id) ON DELETE CASCADE,
  segment_index INTEGER NOT NULL,
  path GEOGRAPHY(LINESTRING, 4326) NOT NULL,
  vibe_scores JSONB NOT NULL,
  distance FLOAT,
  duration INTEGER, -- in seconds
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial index
CREATE INDEX idx_route_segments_path ON public.route_segments USING GIST(path);

-- User route history
CREATE TABLE public.route_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  feedback TEXT
);

-- RLS Policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pois ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_history ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view all profiles" ON public.user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- POIs policies (public read)
CREATE POLICY "POIs are viewable by everyone" ON public.pois
  FOR SELECT USING (true);

-- Routes policies
CREATE POLICY "Users can view own routes" ON public.routes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own routes" ON public.routes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own routes" ON public.routes
  FOR DELETE USING (auth.uid() = user_id);

-- Location shares policies
CREATE POLICY "Users can view own location shares" ON public.location_shares
  FOR SELECT USING (auth.uid() = user_id OR is_active = true);

CREATE POLICY "Users can create own location shares" ON public.location_shares
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own location shares" ON public.location_shares
  FOR UPDATE USING (auth.uid() = user_id);

-- Functions for real-time
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();