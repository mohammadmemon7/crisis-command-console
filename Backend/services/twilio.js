const twilio = require('twilio');

const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER;

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || !String(sid).startsWith('AC')) {
    return null;
  }
  return twilio(sid, token);
}

async function sendSMS(toNumber, message) {
  try {
    if (!toNumber || !message) {
      console.error('sendSMS: invalid inputs');
      return { success: false, error: 'Invalid inputs' };
    }

    const client = getClient();
    if (!client) {
      console.warn('sendSMS: Twilio not configured — skipping send');
      return { success: false, error: 'Twilio not configured' };
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
