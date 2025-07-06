-- Add indexes for performance
CREATE INDEX idx_device_history_device_id ON device_history(device_id);
CREATE INDEX idx_device_history_recorded_at ON device_history(recorded_at DESC);

-- Function to calculate JSONB diff between two records
-- TODO: Enhance to perform deep diff on nested JSONB objects
-- Currently only does top-level comparison
CREATE OR REPLACE FUNCTION jsonb_diff(old_data jsonb, new_data jsonb)
RETURNS jsonb AS $$
DECLARE
    result jsonb = '{}';
    key text;
    old_value jsonb;
    new_value jsonb;
BEGIN
    -- Loop through all keys in the new data
    FOR key IN SELECT jsonb_object_keys(old_data) UNION SELECT jsonb_object_keys(new_data)
    LOOP
        old_value := old_data->key;
        new_value := new_data->key;
        
        -- Only include if values are different
        IF old_value IS DISTINCT FROM new_value THEN
            -- Build the change object with old and new values
            result := result || jsonb_build_object(
                key, jsonb_build_object(
                    'old', COALESCE(old_value, 'null'::jsonb),
                    'new', COALESCE(new_value, 'null'::jsonb)
                )
            );
        END IF;
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function to record device changes
CREATE OR REPLACE FUNCTION record_device_changes()
RETURNS TRIGGER AS $$
DECLARE
    changes jsonb;
    changed_by_id uuid;
    columns_to_ignore text[] := ARRAY['updatedAt']; -- Ignore updatedAt to reduce noise
    old_jsonb jsonb;
    new_jsonb jsonb;
    key text;
BEGIN
    -- Try to get the current user ID from session variable (if set by app)
    -- TODO: Implement setting 'app.current_user_id' in application middleware
    -- after authentication to track which user made changes
    changed_by_id := current_setting('app.current_user_id', true)::uuid;
    
    -- Handle different operations
    IF TG_OP = 'INSERT' THEN
        -- For INSERT, record the entire new record
        changes := to_jsonb(NEW);
        
        INSERT INTO device_history (device_id, operation, changed_by, changes)
        VALUES (NEW.id, TG_OP, changed_by_id, changes);
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Convert records to JSONB
        old_jsonb := to_jsonb(OLD);
        new_jsonb := to_jsonb(NEW);
        
        -- Remove ignored columns
        FOREACH key IN ARRAY columns_to_ignore
        LOOP
            old_jsonb := old_jsonb - key;
            new_jsonb := new_jsonb - key;
        END LOOP;
        
        -- Calculate diff
        changes := jsonb_diff(old_jsonb, new_jsonb);
        
        -- Only record if there are actual changes
        IF changes != '{}'::jsonb THEN
            INSERT INTO device_history (device_id, operation, changed_by, changes)
            VALUES (OLD.id, TG_OP, changed_by_id, changes);
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- For DELETE, record the entire old record
        changes := to_jsonb(OLD);
        
        INSERT INTO device_history (device_id, operation, changed_by, changes)
        VALUES (OLD.id, TG_OP, changed_by_id, changes);
    END IF;
    
    -- Return appropriate value
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER device_update_trigger
AFTER INSERT OR UPDATE OR DELETE ON devices
FOR EACH ROW
EXECUTE FUNCTION record_device_changes();