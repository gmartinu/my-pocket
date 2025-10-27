const https = require('https');
const fs = require('fs');

const SUPABASE_URL = 'https://eglccgcymlbelwiobodo.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnbGNjZ2N5bWxiZWx3aW9ib2RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU4NDUwMywiZXhwIjoyMDc3MTYwNTAzfQ.sEyjAp153Fw0Fj9zPIaRrWyFYCUXyUcX_VK6GgwI0Vc';

const url = `${SUPABASE_URL}/rest/v1/`;

const options = {
  headers: {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
  }
};

https.get(url, options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Schema fetched, generating types...');
    console.log('Note: For full type generation, please use: npx supabase login');
    console.log('Then run: npx supabase gen types typescript --project-id eglccgcymlbelwiobodo');
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
