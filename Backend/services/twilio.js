const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER;

async function sendSMS(toNumber, message) {
  try {
    if (!toNumber || !message) {
      console.error('sendSMS: invalid inputs');
      return { success: false, error: 'Invalid inputs' };
    }

    const result = await client.messages.create({
      body: message,
      from: FROM_NUMBER,
      to: toNumber
    });

    console.log('SMS sent to:', toNumber, '| SID:', result.sid);

    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('SMS error:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { sendSMS };
