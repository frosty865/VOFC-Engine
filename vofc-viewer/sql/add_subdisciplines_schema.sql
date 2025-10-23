-- Add Sub-disciplines Schema
-- This script adds support for sub-disciplines to the existing database structure

-- 1. Create sub_disciplines table
CREATE TABLE IF NOT EXISTS sub_disciplines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discipline_id UUID NOT NULL REFERENCES disciplines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(discipline_id, name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sub_disciplines_discipline_id ON sub_disciplines(discipline_id);
CREATE INDEX IF NOT EXISTS idx_sub_disciplines_name ON sub_disciplines(name);
CREATE INDEX IF NOT EXISTS idx_sub_disciplines_active ON sub_disciplines(is_active);

-- Row Level Security
ALTER TABLE sub_disciplines ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access" ON sub_disciplines FOR SELECT USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role full access" ON sub_disciplines FOR ALL USING (auth.role() = 'service_role');

-- 2. Add sub_discipline_id columns to existing tables
ALTER TABLE vulnerabilities ADD COLUMN IF NOT EXISTS sub_discipline_id UUID REFERENCES sub_disciplines(id);
ALTER TABLE options_for_consideration ADD COLUMN IF NOT EXISTS sub_discipline_id UUID REFERENCES sub_disciplines(id);
ALTER TABLE submission_vulnerabilities ADD COLUMN IF NOT EXISTS sub_discipline_id UUID REFERENCES sub_disciplines(id);
ALTER TABLE submission_options_for_consideration ADD COLUMN IF NOT EXISTS sub_discipline_id UUID REFERENCES sub_disciplines(id);

-- 3. Create indexes for the new foreign keys
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_sub_discipline_id ON vulnerabilities(sub_discipline_id);
CREATE INDEX IF NOT EXISTS idx_ofcs_sub_discipline_id ON options_for_consideration(sub_discipline_id);
CREATE INDEX IF NOT EXISTS idx_submission_vulnerabilities_sub_discipline_id ON submission_vulnerabilities(sub_discipline_id);
CREATE INDEX IF NOT EXISTS idx_submission_ofcs_sub_discipline_id ON submission_options_for_consideration(sub_discipline_id);

-- 4. Insert Physical Security sub-disciplines
INSERT INTO sub_disciplines (discipline_id, name, description) VALUES
(
    (SELECT id FROM disciplines WHERE name = 'Physical Security'),
    'Barriers and Fencing',
    'Physical barriers, fencing, gates, and perimeter protection systems'
),
(
    (SELECT id FROM disciplines WHERE name = 'Physical Security'),
    'Electronic Security Systems',
    'Electronic access control, alarm systems, and security technology'
),
(
    (SELECT id FROM disciplines WHERE name = 'Physical Security'),
    'Video Security Systems',
    'CCTV, surveillance cameras, and video monitoring systems'
),
(
    (SELECT id FROM disciplines WHERE name = 'Physical Security'),
    'Access Control Systems',
    'Card readers, biometric systems, and access management'
),
(
    (SELECT id FROM disciplines WHERE name = 'Physical Security'),
    'Intrusion Detection Systems',
    'Motion sensors, glass break detectors, and intrusion alarms'
),
(
    (SELECT id FROM disciplines WHERE name = 'Physical Security'),
    'Perimeter Security',
    'Outer boundary protection, barriers, and perimeter monitoring'
),
(
    (SELECT id FROM disciplines WHERE name = 'Physical Security'),
    'Security Lighting',
    'Security lighting systems, emergency lighting, and illumination'
),
(
    (SELECT id FROM disciplines WHERE name = 'Physical Security'),
    'Physical Barriers',
    'Bollards, barriers, gates, and physical obstruction systems'
),
(
    (SELECT id FROM disciplines WHERE name = 'Physical Security'),
    'Security Hardware',
    'Locks, hardware, security devices, and physical security equipment'
)
ON CONFLICT (discipline_id, name) DO NOTHING;

-- 5. Create function to get discipline and sub-discipline names
CREATE OR REPLACE FUNCTION get_discipline_info(discipline_uuid UUID, sub_discipline_uuid UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    result JSON;
    discipline_name TEXT;
    sub_discipline_name TEXT;
BEGIN
    -- Get discipline name
    SELECT name INTO discipline_name 
    FROM disciplines 
    WHERE id = discipline_uuid;
    
    -- Get sub-discipline name if provided
    IF sub_discipline_uuid IS NOT NULL THEN
        SELECT name INTO sub_discipline_name 
        FROM sub_disciplines 
        WHERE id = sub_discipline_uuid;
    END IF;
    
    result := json_build_object(
        'discipline', discipline_name,
        'sub_discipline', sub_discipline_name,
        'full_name', CASE 
            WHEN sub_discipline_name IS NOT NULL THEN discipline_name || ' - ' || sub_discipline_name
            ELSE discipline_name
        END
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 6. Create view for discipline hierarchy
CREATE OR REPLACE VIEW discipline_hierarchy AS
SELECT 
    d.id as discipline_id,
    d.name as discipline_name,
    d.description as discipline_description,
    d.category as discipline_category,
    sd.id as sub_discipline_id,
    sd.name as sub_discipline_name,
    sd.description as sub_discipline_description,
    CASE 
        WHEN sd.name IS NOT NULL THEN d.name || ' - ' || sd.name
        ELSE d.name
    END as full_name
FROM disciplines d
LEFT JOIN sub_disciplines sd ON d.id = sd.discipline_id AND sd.is_active = true
WHERE d.is_active = true
ORDER BY d.name, sd.name;

-- 7. Create trigger for updated_at timestamps
CREATE TRIGGER update_sub_disciplines_updated_at
    BEFORE UPDATE ON sub_disciplines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Create function to migrate existing Physical Security records to sub-disciplines
CREATE OR REPLACE FUNCTION migrate_physical_security_to_subdisciplines()
RETURNS JSON AS $$
DECLARE
    result JSON;
    physical_security_id UUID;
    record_count INTEGER := 0;
BEGIN
    -- Get Physical Security discipline ID
    SELECT id INTO physical_security_id 
    FROM disciplines 
    WHERE name = 'Physical Security';
    
    IF physical_security_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Physical Security discipline not found'
        );
    END IF;
    
    -- Update vulnerabilities with Physical Security discipline
    UPDATE vulnerabilities 
    SET sub_discipline_id = (
        SELECT id FROM sub_disciplines 
        WHERE discipline_id = physical_security_id 
        AND name = 'Physical Barriers'
        LIMIT 1
    )
    WHERE discipline = 'Physical Security' 
    AND sub_discipline_id IS NULL;
    
    GET DIAGNOSTICS record_count = ROW_COUNT;
    
    -- Update options_for_consideration with Physical Security discipline
    UPDATE options_for_consideration 
    SET sub_discipline_id = (
        SELECT id FROM sub_disciplines 
        WHERE discipline_id = physical_security_id 
        AND name = 'Physical Barriers'
        LIMIT 1
    )
    WHERE discipline = 'Physical Security' 
    AND sub_discipline_id IS NULL;
    
    result := json_build_object(
        'success', true,
        'message', 'Physical Security records migrated to sub-disciplines',
        'vulnerabilities_updated', record_count,
        'physical_security_id', physical_security_id
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 9. Create function to get all disciplines with their sub-disciplines
CREATE OR REPLACE FUNCTION get_disciplines_with_subdisciplines()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', discipline_id,
            'name', discipline_name,
            'description', discipline_description,
            'category', discipline_category,
            'sub_disciplines', CASE 
                WHEN sub_discipline_id IS NOT NULL THEN json_agg(
                    json_build_object(
                        'id', sub_discipline_id,
                        'name', sub_discipline_name,
                        'description', sub_discipline_description
                    )
                ) FILTER (WHERE sub_discipline_id IS NOT NULL)
                ELSE json_build_array()
            END
        )
    ) INTO result
    FROM discipline_hierarchy
    GROUP BY discipline_id, discipline_name, discipline_description, discipline_category
    ORDER BY discipline_name;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

