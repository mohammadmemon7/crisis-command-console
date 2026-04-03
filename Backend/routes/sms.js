const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const Volunteer = require('../models/Volunteer');
const { classifyMessage } = require('../services/claude');
const { geocodeLocation } = require('../services/geocoder');
const { findAndAssignVolunteer } = require('../services/matcher');
const { sendSMS } = require('../services/twilio');
const { getIO } = require('../socket');

let io;

function setIo(socketIo) {
  io = socketIo;
}

function emit(event, payload) {
  const socket = io || getIO();
  if (socket) socket.emit(event, payload);
}

async function findVolunteerByPhone(fromNumber) {
  const raw = String(fromNumber || '').trim();
  if (!raw) return null;
  let v = await Volunteer.findOne({ phone: raw });
  if (v) return v;
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 10) return null;
  const last10 = digits.slice(-10);
  const candidates = await Volunteer.find({ phone: { $exists: true, $ne: '' } });
  for (const vol of candidates) {
    const vd = String(vol.phone || '').replace(/\D/g, '');
    if (vd.slice(-10) === last10 || vd.endsWith(last10)) return vol;
  }
  return null;
}

function handleIncomingSms(req, res) {
  res.set('Content-Type', 'text/xml');
  res.send('<Response></Response>');

  setImmediate(async () => {
    try {
      const messageText = req.body.Body;
      const fromNumber = req.body.From;
      const fromCity = req.body.FromCity || 'Mumbai';

      if (!messageText) {
        console.warn('[sms] empty Body');
        return;
      }

      const classified = await classifyMessage(messageText);
      console.log('[sms] classified:', JSON.stringify(classified));

      const locationQuery = classified.location || fromCity;
      const coordinates = await geocodeLocation(locationQuery);

      const report = new Report({
        name: 'SMS Reporter',
        rawMessage: messageText,
        location: classified.location || locationQuery,
        coordinates,
        priority: classified.urgency != null ? classified.urgency : 3,
        peopleCount: classified.peopleCount || 1,
        needs: classified.needs && classified.needs.length ? classified.needs : ['rescue'],
        source: 'sms',
        senderPhone: fromNumber,
        status: 'pending'
      });
      await report.save();

      const reportObj = report.toObject();
      emit('newReport', { ...reportObj, source: 'sms' });

      const locLabel = report.location || locationQuery;
      await sendSMS(
        fromNumber,
        `CrisisNet: Report received. Location: ${locLabel}. Urgency: ${report.priority}/5. Help is being dispatched.`
      );

      const matchResult = await findAndAssignVolunteer(report, { smsPending: true });

      if (matchResult && matchResult.volunteer) {
        const v = matchResult.volunteer;
        const volPhone = v.phone;
        const detailMsg =
          `CrisisNet case: ${locLabel}. Urgency ${report.priority}/5. People: ${report.peopleCount}. ` +
          `Needs: ${(report.needs || []).join(', ')}. Dist ~${matchResult.distance} km. ` +
          `Reply 1 = ACCEPT, Reply 2 = DECLINE`;

        if (volPhone) {
          await sendSMS(volPhone, detailMsg);
        }

        emit('reportUpdated', {
          reportId: report._id,
          id: report._id,
          status: 'sms_pending',
          assignedVolunteer: v.name,
          source: 'sms'
        });
      }
    } catch (err) {
      console.error('[sms] async processing error:', err.message);
    }
  });
}

router.post('/sms', handleIncomingSms);
router.post('/api/sms', handleIncomingSms);

function handleSmsReply(req, res) {
  res.set('Content-Type', 'text/xml');
  res.send('<Response></Response>');

  setImmediate(async () => {
    try {
      const fromNumber = req.body.From;
      const replyText = String(req.body.Body || '')
        .trim()
        .toLowerCase();

      const volunteer = await findVolunteerByPhone(fromNumber);
      if (!volunteer) {
        console.warn('[sms-reply] unknown sender:', fromNumber);
        return;
      }

      if (replyText === '1') {
        const report = await Report.findById(volunteer.currentTask);
        if (!report) {
          await sendSMS(fromNumber, 'CrisisNet: No active case found.');
          return;
        }

        report.status = 'assigned';
        report.startedAt = report.startedAt || new Date();
        await report.save();

        volunteer.isAvailable = false;
        volunteer.status = 'busy';
        await volunteer.save();

        emit('reportUpdated', {
          reportId: report._id,
          id: report._id,
          status: 'assigned',
          assignedVolunteer: volunteer.name
        });
        emit('caseAccepted', {
          reportId: report._id,
          volunteerName: volunteer.name,
          eta: '10 minutes'
        });

        await sendSMS(
          fromNumber,
          `CrisisNet: Case accepted. Proceed to ${report.location || 'the location'}. ETA ~10 minutes. Reply DONE when resolved.`
        );
        return;
      }

      if (replyText === '2') {
        const report = await Report.findById(volunteer.currentTask);
        if (!report) {
          volunteer.currentTask = null;
          volunteer.status = 'free';
          volunteer.isAvailable = true;
          await volunteer.save();
          await sendSMS(fromNumber, 'CrisisNet: Case declined.');
          return;
        }

        report.status = 'pending';
        report.assignedTo = null;
        await report.save();

        volunteer.currentTask = null;
        volunteer.status = 'free';
        volunteer.isAvailable = true;
        await volunteer.save();

        const reloaded = await Report.findById(report._id);
        const retry = await findAndAssignVolunteer(reloaded, {
          smsPending: true,
          excludeVolunteerId: volunteer._id
        });

        await sendSMS(fromNumber, 'CrisisNet: Case declined. Reassigning another volunteer.');

        if (retry && retry.volunteer && retry.volunteer.phone) {
          const locLabel = report.location || 'Unknown';
          await sendSMS(
            retry.volunteer.phone,
            `CrisisNet case: ${locLabel}. Urgency ${report.priority}/5. Reply 1 = ACCEPT, Reply 2 = DECLINE`
          );
          emit('reportUpdated', {
            reportId: report._id,
            id: report._id,
            status: 'sms_pending',
            source: 'sms'
          });
        }
        return;
      }

      if (replyText === 'done') {
        const report = await Report.findById(volunteer.currentTask);
        if (!report) {
          await sendSMS(fromNumber, 'CrisisNet: No active case to resolve.');
          return;
        }

        report.status = 'resolved';
        report.resolvedAt = new Date();
        await report.save();

        volunteer.currentTask = null;
        volunteer.status = 'free';
        volunteer.isAvailable = true;
        volunteer.totalResolved = (volunteer.totalResolved || 0) + 1;
        await volunteer.save();

        emit('reportUpdated', {
          reportId: report._id,
          id: report._id,
          status: 'resolved'
        });

        await sendSMS(
          fromNumber,
          'CrisisNet: Thank you — case marked resolved. Stay safe, hero!'
        );
        return;
      }

      await sendSMS(fromNumber, 'CrisisNet: Reply 1 to accept, 2 to decline, or DONE when finished.');
    } catch (err) {
      console.error('[sms-reply] error:', err.message);
    }
  });
}

router.post('/sms-reply', handleSmsReply);
router.post('/api/sms-reply', handleSmsReply);

module.exports = { router, setIo };
