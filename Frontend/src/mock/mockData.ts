export interface Report {
  id: string;
  location: string;
  coordinates: { lat: number; lng: number };
  urgency: 1 | 2 | 3 | 4 | 5;
  peopleCount: number;
  needs: string[];
  status: 'pending' | 'assigned' | 'resolved';
  source: 'app' | 'sms' | 'voice' | 'sos';
  assignedVolunteer?: string;
  createdAt: Date;
}

export interface Volunteer {
  id: string;
  name: string;
  area: string;
  skills: string[];
  isAvailable: boolean;
  location: { lat: number; lng: number };
}

export interface Stats {
  active: number;
  resolved: number;
  volunteersDeployed: number;
  avgResponseTime: string;
}

export const MOCK_REPORTS: Report[] = [
  {
    id: "r1",
    location: "Kurla West near station, water level rising, 8 people stuck on ground floor",
    coordinates: { lat: 19.0726, lng: 72.8795 },
    urgency: 5,
    peopleCount: 8,
    needs: ["rescue", "water"],
    status: 'pending',
    source: 'app',
    createdAt: new Date(Date.now() - 1000 * 60 * 5)
  },
  {
    id: "r2",
    location: "Dharavi main road ke paas, building collapsed partially, multiple injuries",
    coordinates: { lat: 19.0422, lng: 72.8553 },
    urgency: 5,
    peopleCount: 12,
    needs: ["medical", "rescue", "shelter"],
    status: 'pending',
    source: 'sms',
    createdAt: new Date(Date.now() - 1000 * 60 * 12)
  },
  {
    id: "r3",
    location: "Bandra Reclamation area, 5 people on a small boat that is drifting",
    coordinates: { lat: 19.0596, lng: 72.8295 },
    urgency: 5,
    peopleCount: 5,
    needs: ["boat", "rescue"],
    status: 'pending',
    source: 'voice',
    createdAt: new Date(Date.now() - 1000 * 60 * 18)
  },
  {
    id: "r4",
    location: "Andheri East, MIDC area, short circuit fire starting due to flooding",
    coordinates: { lat: 19.1197, lng: 72.8468 },
    urgency: 4,
    peopleCount: 6,
    needs: ["rescue", "water"],
    status: 'pending',
    source: 'sos',
    createdAt: new Date(Date.now() - 1000 * 60 * 25)
  },
  {
    id: "r5",
    location: "Malad Link Road, family of 3 with infant needs food and milk",
    coordinates: { lat: 19.1874, lng: 72.8479 },
    urgency: 4,
    peopleCount: 3,
    needs: ["food", "water"],
    status: 'assigned',
    source: 'app',
    assignedVolunteer: "Sunita Sharma",
    createdAt: new Date(Date.now() - 1000 * 60 * 30)
  },
  {
    id: "r6",
    location: "Borivali East, National Park gate ke baahar log phanse hain",
    coordinates: { lat: 19.2307, lng: 72.8567 },
    urgency: 3,
    peopleCount: 10,
    needs: ["food", "water"],
    status: 'assigned',
    source: 'sms',
    assignedVolunteer: "Ramesh Patil",
    createdAt: new Date(Date.now() - 1000 * 60 * 35)
  },
  {
    id: "r7",
    location: "Sion Circle ke paas heavy waterlogging, elder person needs transport",
    coordinates: { lat: 19.0397, lng: 72.8644 },
    urgency: 3,
    peopleCount: 15,
    needs: ["boat", "medical"],
    status: 'assigned',
    source: 'voice',
    assignedVolunteer: "Abdul Khan",
    createdAt: new Date(Date.now() - 1000 * 60 * 45)
  },
  {
    id: "r8",
    location: "Dadar Chowpatty, 4 people stranded due to high tide",
    coordinates: { lat: 19.0186, lng: 72.8440 },
    urgency: 3,
    peopleCount: 4,
    needs: ["rescue", "medical"],
    status: 'assigned',
    source: 'sos',
    assignedVolunteer: "Priya Nair",
    createdAt: new Date(Date.now() - 1000 * 60 * 50)
  },
  {
    id: "r9",
    location: "Ghatkopar East, Pant Nagar, minor flooding, need cleanup help",
    coordinates: { lat: 19.0863, lng: 72.9073 },
    urgency: 2,
    peopleCount: 2,
    needs: ["shelter"],
    status: 'resolved',
    source: 'app',
    createdAt: new Date(Date.now() - 1000 * 60 * 55)
  },
  {
    id: "r10",
    location: "Vikhroli Highway, flat tyre in flooded zone, need water",
    coordinates: { lat: 19.0989, lng: 72.9252 },
    urgency: 1,
    peopleCount: 1,
    needs: ["water"],
    status: 'resolved',
    source: 'sms',
    createdAt: new Date(Date.now() - 1000 * 60 * 60)
  }
];

export const MOCK_VOLUNTEERS: Volunteer[] = [
  {
    id: "v1",
    name: "Ramesh Patil",
    area: "Kurla",
    skills: ["rescue", "vehicle", "food"],
    isAvailable: true,
    location: { lat: 19.0730, lng: 72.8800 }
  },
  {
    id: "v2",
    name: "Sunita Sharma",
    area: "Andheri",
    skills: ["medical", "food"],
    isAvailable: true,
    location: { lat: 19.1200, lng: 72.8475 }
  },
  {
    id: "v3",
    name: "Abdul Khan",
    area: "Bandra",
    skills: ["boat", "rescue", "vehicle"],
    isAvailable: true,
    location: { lat: 19.0600, lng: 72.8300 }
  },
  {
    id: "v4",
    name: "Priya Nair",
    area: "Dharavi",
    skills: ["medical", "rescue"],
    isAvailable: false,
    location: { lat: 19.0425, lng: 72.8560 }
  },
  {
    id: "v5",
    name: "Vikram Desai",
    area: "Borivali",
    skills: ["vehicle", "food"],
    isAvailable: false,
    location: { lat: 19.2310, lng: 72.8575 }
  },
  {
    id: "v6",
    name: "Meena Joshi",
    area: "Ghatkopar",
    skills: ["food", "medical"],
    isAvailable: false,
    location: { lat: 19.0870, lng: 72.9080 }
  }
];

export const MOCK_STATS: Stats = {
  active: 6,
  resolved: 2,
  volunteersDeployed: 3,
  avgResponseTime: "8.3 min"
};
