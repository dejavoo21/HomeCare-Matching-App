import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'homecare_matching',
  user: 'postgres',
  password: 'postgres',
});

async function seedDemoData() {
  try {
    console.log('🌱 Seeding demo data...\n');

    // Generate UUIDs
    const req1Id = uuidv4();
    const req2Id = uuidv4();
    const req3Id = uuidv4();
    const prof1Id = uuidv4();
    const prof2Id = uuidv4();
    const prof3Id = uuidv4();
    const clientId = '6e07d70b-ad90-4759-a2c2-0a85de116800';

    // Insert demo care requests
    const requestsQuery = `
      INSERT INTO care_requests 
        (id, client_id, service_type, description, address_text, preferred_start, preferred_end, urgency, status, created_at, updated_at)
      VALUES 
        ($1, $2, 'Physical Therapy', 'Post-surgery physical therapy session', '456 Oak Ave, LA', NOW() + INTERVAL '2 days', NOW() + INTERVAL '3 days', 'high', 'queued', NOW(), NOW()),
        ($3, $2, 'Wound Care', 'Daily wound dressing change', '789 Elm St, SF', NOW() + INTERVAL '1 day', NOW() + INTERVAL '2 days', 'critical', 'offered', NOW(), NOW()),
        ($4, $2, 'Medication Management', 'Insulin injection and blood sugar monitoring', '321 Pine Rd, NYC', NOW() + INTERVAL '4 hours', NOW() + INTERVAL '1 day', 'medium', 'offered', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `;

    const res1 = await pool.query(requestsQuery, [req1Id, clientId, req2Id, req3Id]);
    console.log(`✅ Inserted ${res1.rowCount} care requests`);

    // Insert demo professionals/users
    const usersQuery = `
      INSERT INTO users 
        (id, name, email, password_hash, role, phone, created_at, updated_at)
      VALUES 
        ($1, 'Dr. Michael Smith', 'dr.smith@homecare.local', '$2b$10$dummy', 'doctor', '555-0101', NOW(), NOW()),
        ($2, 'Nurse Jessica Johnson', 'nurse.johnson@homecare.local', '$2b$10$dummy', 'nurse', '555-0102', NOW(), NOW()),
        ($3, 'Nurse Amy Lee', 'therapist.lee@homecare.local', '$2b$10$dummy', 'nurse', '555-0103', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `;

    const res2 = await pool.query(usersQuery, [prof1Id, prof2Id, prof3Id]);
    console.log(`✅ Inserted ${res2.rowCount} professionals`);

    // Insert demo realtime events
    const eventsQuery = `
      INSERT INTO realtime_events 
        (id, type, payload, created_at)
      VALUES 
        ($1, 'REQUEST_CREATED', $2::jsonb, NOW() - INTERVAL '5 minutes'),
        ($3, 'OFFER_CREATED', $4::jsonb, NOW() - INTERVAL '3 minutes'),
        ($5, 'REQUEST_CREATED', $6::jsonb, NOW() - INTERVAL '1 minute')
      ON CONFLICT (id) DO NOTHING;
    `;

    const res3 = await pool.query(eventsQuery, [
      uuidv4(),
      JSON.stringify({ requestId: req1Id, title: 'Physical Therapy' }),
      uuidv4(),
      JSON.stringify({ requestId: req2Id, professionalId: prof1Id }),
      uuidv4(),
      JSON.stringify({ requestId: req3Id, title: 'Medication Management' }),
    ]);
    console.log(`✅ Inserted ${res3.rowCount} events`);

    console.log('\n✨ Demo data seeded successfully!\n');
    console.log('Dashboard will now show:');
    console.log('  • 3 care requests (1 queued, 2 offered)');
    console.log('  • 3 professionals (doctor, nurse, therapist)');
    console.log('  • Recent activity in the feed');
    console.log('  • Search will find all demo records\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding data:', err);
    process.exit(1);
  }
}

seedDemoData();
