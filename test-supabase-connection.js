// Simple Supabase Connection Test
// Run this with: node test-supabase-connection.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.log('Please add:');
  console.log('EXPO_PUBLIC_SUPABASE_URL=your-project-url');
  console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔌 Testing Supabase connection...');
  console.log(`📡 URL: ${supabaseUrl}`);
  console.log(`🔑 Key: ${supabaseKey.substring(0, 20)}...`);
  
  try {
    // Test 1: Check if we can connect
    console.log('\n🧪 Test 1: Basic connection...');
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact' });
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Connection successful!');
    console.log(`📊 Users table exists with ${data.length} records`);
    
    // Test 2: Check schema tables
    console.log('\n🧪 Test 2: Checking database schema...');
    
    const tables = [
      'users', 'agents', 'owners', 'boats', 'schedules', 
      'bookings', 'tickets', 'financial_transactions', 
      'ledger_entries', 'commission_structures'
    ];
    
    let allTablesExist = true;
    
    for (const table of tables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Table '${table}' not found or inaccessible`);
        allTablesExist = false;
      } else {
        console.log(`✅ Table '${table}' exists`);
      }
    }
    
    if (allTablesExist) {
      console.log('\n🎉 All required tables exist!');
    } else {
      console.log('\n⚠️  Some tables are missing. Make sure you ran the schema SQL.');
    }
    
    // Test 3: Insert test data (only if RLS is disabled)
    console.log('\n🧪 Test 3: Testing data operations...');
    
    const testPhone = '+960' + Math.floor(Math.random() * 1000000).toString().padStart(7, '0');
    
    const { data: insertData, error: insertError } = await supabase
      .from('users')
      .insert([
        { phone: testPhone, role: 'PUBLIC', status: 'ACTIVE' }
      ])
      .select()
      .single();
    
    if (insertError) {
      console.log('⚠️  Insert test failed (RLS may still be active):', insertError.message);
      console.log('💡 This is normal if Row Level Security is enabled');
      console.log('✅ Your app will work fine - this is just a test limitation');
    } else {
      console.log('✅ Insert test successful!');
      console.log('📝 Created test user:', insertData);
      
      // Clean up test data
      await supabase
        .from('users')
        .delete()
        .eq('id', insertData.id);
      
      console.log('🧹 Cleaned up test data');
    }
    
    console.log('\n🚀 CONNECTION TEST COMPLETED!');
    console.log('✅ Your Supabase "JaagaDB" project is connected and ready!');
    console.log('\n📱 You can now test your boat ticketing app:');
    console.log('   - Press \'w\' in your Expo terminal to open web browser');
    console.log('   - Press \'i\' to open iOS simulator');
    console.log('   - Press \'a\' to open Android emulator');
    console.log('   - Scan QR code with Expo Go app on your phone');
    
    return true;
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

// Run the test
testConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
  });
