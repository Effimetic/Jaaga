import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { boatId, imageData, fileName, contentType = 'image/jpeg' } = await req.json()
    
    if (!boatId || !imageData || !fileName) {
      throw new Error('Missing required parameters: boatId, imageData, or fileName')
    }
    
    // Create Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Convert base64 to Uint8Array for upload
    const imageBytes = Uint8Array.from(atob(imageData), c => c.charCodeAt(0))

    // Upload to storage (bypasses RLS with service role key)
    const { data, error } = await supabaseAdmin.storage
      .from('boat-photos')
      .upload(fileName, imageBytes, {
        contentType: contentType,
        upsert: false,
      })

    if (error) {
      console.error('Storage upload error:', error)
      throw error
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('boat-photos')
      .getPublicUrl(fileName)

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: urlData.publicUrl, 
        path: fileName,
        message: 'Photo uploaded successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Upload failed',
        details: error.toString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
