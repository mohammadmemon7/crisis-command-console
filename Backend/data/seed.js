const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Report = require('../models/Report');
const Volunteer = require('../models/Volunteer');

const volunteers = [
    {
        name: 'Rajesh Patil',
        phone: process.env.TWILIO_PHONE_NUMBER,
        skills: ['rescue', 'boat'],
        location: { lat: 19.119, lng: 72.846 },
        area: 'Andheri West',
        isAvailable: true
    },
    {
        name: 'Priya Sharma',
        phone: process.env.TWILIO_PHONE_NUMBER,
        skills: ['medical', 'rescue'],
        location: { lat: 19.044, lng: 72.862 },
        area: 'Dharavi',
        isAvailable: true
    },
    {
        name: 'Mohammed Khan',
        phone: process.env.TWILIO_PHONE_NUMBER,
        skills: ['boat', 'rescue'],
        location: { lat: 19.037, lng: 72.855 },
        area: 'Kurla',
        isAvailable: true
    },
    {
        name: 'Sunita Desai',
        phone: process.env.TWILIO_PHONE_NUMBER,
        skills: ['food', 'shelter'],
        location: { lat: 19.176, lng: 72.946 },
        area: 'Thane',
        isAvailable: true
    },
    {
        name: 'Amit Verma',
        phone: process.env.TWILIO_PHONE_NUMBER,
        skills: ['vehicle', 'rescue'],
        location: { lat: 19.059, lng: 72.836 },
        area: 'Bandra',
        isAvailable: true
    },
    {
        name: 'Kavita Nair',
        phone: process.env.TWILIO_PHONE_NUMBER,
        skills: ['medical', 'food'],
        location: { lat: 18.964, lng: 72.825 },
        area: 'Colaba',
        isAvailable: true
    },
    {
        name: 'Suresh Yadav',
        phone: process.env.TWILIO_PHONE_NUMBER,
        skills: ['boat', 'vehicle'],
        location: { lat: 19.086, lng: 72.898 },
        area: 'Powai',
        isAvailable: true
    },
    {
        name: 'Meena Joshi',
        phone: process.env.TWILIO_PHONE_NUMBER,
        skills: ['shelter', 'food'],
        location: { lat: 19.218, lng: 72.978 },
        area: 'Kalyan',
        isAvailable: true
    },
    {
        name: 'Rahul Sawant',
        phone: process.env.TWILIO_PHONE_NUMBER,
        skills: ['rescue', 'medical'],
        location: { lat: 19.133, lng: 72.919 },
        area: 'Vikhroli',
        isAvailable: true
    },
    {
        name: 'Deepa Kulkarni',
        phone: process.env.TWILIO_PHONE_NUMBER,
        skills: ['medical', 'shelter'],
        location: { lat: 19.026, lng: 72.858 },
        area: 'Sion',
        isAvailable: true
    },
    {
        name: 'Vinod Tawde',
        phone: process.env.TWILIO_PHONE_NUMBER,
        skills: ['boat', 'rescue', 'vehicle'],
        location: { lat: 19.156, lng: 72.857 },
        area: 'Goregaon',
        isAvailable: true
    },
    {
        name: 'Anjali Singh',
        phone: process.env.TWILIO_PHONE_NUMBER,
        skills: ['food', 'water', 'shelter'],
        location: { lat: 19.076, lng: 72.877 },
        area: 'Dadar',
        isAvailable: true
    }
];

const reports = [
    {
        rawMessage: 'Flood in Andheri subway, 8 people trapped',
        location: 'Andheri',
        coordinates: { lat: 19.119, lng: 72.846 },
        urgency: 5,
        peopleCount: 8,
        needs: ['rescue', 'boat'],
        status: 'pending',
        source: 'app'
    },
    {
        rawMessage: 'Dharavi slum flooding, families on rooftops',
        location: 'Dharavi',
        coordinates: { lat: 19.044, lng: 72.862 },
        urgency: 5,
        peopleCount: 20,
        needs: ['rescue', 'boat', 'food'],
        status: 'pending',
        source: 'sms'
    },
    {
        rawMessage: 'Old man collapsed near Kurla station, need ambulance',
        location: 'Kurla',
        coordinates: { lat: 19.037, lng: 72.855 },
        urgency: 4,
        peopleCount: 1,
        needs: ['medical'],
        status: 'pending',
        source: 'app'
    },
    {
        rawMessage: 'Building wall collapsed in Bandra, 3 people injured',
        location: 'Bandra',
        coordinates: { lat: 19.059, lng: 72.836 },
        urgency: 5,
        peopleCount: 3,
        needs: ['medical', 'rescue'],
        status: 'pending',
        source: 'app'
    },
    {
        rawMessage: 'Powai lake overflowing, road blocked, vehicles stuck',
        location: 'Powai',
        coordinates: { lat: 19.086, lng: 72.898 },
        urgency: 3,
        peopleCount: 15,
        needs: ['vehicle', 'rescue'],
        status: 'pending',
        source: 'sms'
    },
    {
        rawMessage: 'No food for 2 days in Govandi relief camp',
        location: 'Govandi',
        coordinates: { lat: 19.052, lng: 72.918 },
        urgency: 3,
        peopleCount: 50,
        needs: ['food', 'water'],
        status: 'pending',
        source: 'app'
    },
    {
        rawMessage: 'Sion hospital flooding, patients need evacuation',
        location: 'Sion',
        coordinates: { lat: 19.026, lng: 72.858 },
        urgency: 5,
        peopleCount: 30,
        needs: ['rescue', 'medical', 'vehicle'],
        status: 'pending',
        source: 'app'
    },
    {
        rawMessage: 'Bachao Vikhroli mein paani aa gaya ghar mein',
        location: 'Vikhroli',
        coordinates: { lat: 19.133, lng: 72.919 },
        urgency: 4,
        peopleCount: 4,
        needs: ['rescue', 'shelter'],
        status: 'pending',
        source: 'sms'
    },
    {
        rawMessage: 'Malad link road flooded, ambulance cannot pass',
        location: 'Malad',
        coordinates: { lat: 19.187, lng: 72.848 },
        urgency: 4,
        peopleCount: 2,
        needs: ['medical', 'vehicle'],
        status: 'pending',
        source: 'app'
    },
    {
        rawMessage: 'Goregaon nallah overflow, 6 jhuggi washed away',
        location: 'Goregaon',
        coordinates: { lat: 19.156, lng: 72.857 },
        urgency: 5,
        peopleCount: 6,
        needs: ['rescue', 'shelter'],
        status: 'pending',
        source: 'sms'
    },
    {
        rawMessage: 'Colaba old building, ceiling collapsed, need help',
        location: 'Colaba',
        coordinates: { lat: 18.964, lng: 72.825 },
        urgency: 4,
        peopleCount: 2,
        needs: ['rescue', 'medical'],
        status: 'pending',
        source: 'app'
    },
    {
        rawMessage: 'Thane creek flooding, fishermen boats stuck',
        location: 'Thane',
        coordinates: { lat: 19.176, lng: 72.946 },
        urgency: 3,
        peopleCount: 8,
        needs: ['boat', 'rescue'],
        status: 'pending',
        source: 'app'
    },
    {
        rawMessage: 'Dadar market waterlogging, elderly stuck in shops',
        location: 'Dadar',
        coordinates: { lat: 19.076, lng: 72.877 },
        urgency: 2,
        peopleCount: 10,
        needs: ['rescue', 'vehicle'],
        status: 'pending',
        source: 'sms'
    },
    {
        rawMessage: 'Kalyan flood relief camp needs medicines urgently',
        location: 'Kalyan',
        coordinates: { lat: 19.218, lng: 72.978 },
        urgency: 4,
        peopleCount: 100,
        needs: ['medical', 'food'],
        status: 'pending',
        source: 'app'
    },
    {
        rawMessage: 'Chembur gas leak near residential area, evacuate',
        location: 'Chembur',
        coordinates: { lat: 19.052, lng: 72.899 },
        urgency: 5,
        peopleCount: 200,
        needs: ['rescue', 'medical'],
        status: 'pending',
        source: 'app'
    }
];

async function seedDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB connected');

        await Report.deleteMany({});
        await Volunteer.deleteMany({});
        console.log('Existing data cleared');

        await Volunteer.insertMany(volunteers);
        console.log('12 volunteers inserted');

        await Report.insertMany(reports);
        console.log('15 reports inserted');

        console.log('=== SEED COMPLETE ===');
        console.log('Volunteers: 12');
        console.log('Reports: 15');
        console.log('Run: node data/seed.js');

        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('Seed failed:', err);
        process.exit(1);
    }
}

seedDB();
