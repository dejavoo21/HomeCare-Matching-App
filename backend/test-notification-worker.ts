// Quick test of notification worker
import { pool } from './src/db';
import { emailService } from './src/services/email.service';

async function testWorker() {
  console.log('Testing notification worker...\n');

  try {
    // 1. Check SMTP config
    console.log('1. Checking SMTP configuration...');
    console.log(`   SMTP_HOST: ${process.env.SMTP_HOST || 'NOT SET'}`);
    console.log(`   SMTP_PORT: ${process.env.SMTP_PORT || 'NOT SET'}`);
    console.log(`   SMTP_USER: ${process.env.SMTP_USER || 'NOT SET'}`);
    console.log(`   SMTP_PASS: ${process.env.SMTP_PASS ? '***SET***' : 'NOT SET'}\n`);

    // 2. Check pending notifications
    console.log('2. Checking pending notifications...');
    const pendingResult = await pool.query(
      `SELECT id, channel, to_address, template, payload_json, created_at FROM notification_outbox WHERE status = 'pending' ORDER BY created_at DESC LIMIT 5`
    );
    
    console.log(`   Found ${pendingResult.rows.length} pending notifications\n`);
    pendingResult.rows.forEach((n, i) => {
      console.log(`   ${i+1}. To: ${n.to_address}, Template: ${n.template}, Created: ${new Date(n.created_at).toISOString()}`);
    });
    console.log('');
    
    if (pendingResult.rows.length === 0) {
      console.log('   No pending notifications to process');
      await pool.end();
      return;
    }

    // 3. Try to process first one manually
    const notification = pendingResult.rows[0];
    console.log(`3. Testing first notification: ${notification.id}`);
    console.log(`   Channel: ${notification.channel}`);
    console.log(`   Template: ${notification.template}`);
    console.log(`   To: ${notification.to_address}\n`);

    // 4. Try the email service
    console.log('4. Testing email service...');
    try {
      console.log(`   Calling emailService.send()...`);
      await emailService.send({
        to: notification.to_address,
        subject: 'TEST EMAIL',
        html: '<p>This is a test</p>',
      });
      console.log('   ✅ emailService.send() succeeded!\n');
    } catch (emailErr: any) {
      console.log('   ❌ emailService.send() failed!');
      console.log('   Error:', emailErr.message || emailErr);
      console.log('   Stack:', emailErr.stack, '\n');
    }

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await pool.end();
  }
}

testWorker();
