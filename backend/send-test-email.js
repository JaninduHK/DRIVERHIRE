import 'dotenv/config';
import { sendVerificationEmail } from './services/emailService.js';

const recipient = process.argv[2] || process.env.TEST_EMAIL;

if (!recipient) {
  console.error('Usage: node send-test-email.js you@example.com');
  process.exit(1);
}

sendVerificationEmail({
  to: recipient,
  name: 'Test User',
  verificationUrl: process.env.APP_BASE_URL || 'https://carwithdriver.lk',
})
  .then(() => {
    console.log(`Test email triggered to ${recipient}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test email failed:', error?.message || error);
    process.exit(1);
  });
