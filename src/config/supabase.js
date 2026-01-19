const { createClient } = require('@supabase/supabase-js');

// Load environment variables directly
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

// Use provided values or fallback
const supabaseService = createClient(
    supabaseUrl || "https://glsmqjadvkjbyyrkeevu.supabase.co",
    supabaseServiceKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21xamFkdmtqYnl5cmtlZXZ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjgzNzk5MCwiZXhwIjoyMDgyNDEzOTkwfQ.pcxeqlQiMeV-5F5kWDoNsGOhvWzOiGW54NROEtVsUk8",
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

module.exports = supabaseService;