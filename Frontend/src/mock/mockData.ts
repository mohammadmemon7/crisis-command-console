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
  assignedTo?: string; // Links to Volunteer ID or Name
  rawMessage?: string;
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
    status: 'assigned',
    assignedTo: 'v1',
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
    status: 'assigned',
    assignedTo: 'v4',
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
    status: 'assigned',
    assignedTo: 'v3',
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
    assignedTo: 'v2',
    source: 'app',
    assignedVolunteer: "Sunita Sharma",
    createdAt: new Date(Date.now() - 1000 * 60 * 30)
  },
  {
    id: "r11",
    location: "Malad West, link road flooding, 2 families stuck on first floor",
    coordinates: { lat: 19.1880, lng: 72.8485 },
    urgency: 4,
    peopleCount: 7,
    needs: ["rescue", "food"],
    status: 'assigned',
    assignedTo: 'v5',
    source: 'sms',
    createdAt: new Date(Date.now() - 1000 * 60 * 5)
  },
  {
    id: "r12",
    location: "Chembur Naka, tree fallen on car, 1 person injured",
    coordinates: { lat: 19.0520, lng: 72.8990 },
    urgency: 3,
    peopleCount: 1,
    needs: ["medical", "rescue"],
    status: 'assigned',
    assignedTo: 'v6',
    source: 'sms',
    createdAt: new Date(Date.now() - 1000 * 60 * 10)
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
  }
];

export const MOCK_VOLUNTEERS: Volunteer[] = [
  {
    id: "v1",
    name: "Ramesh Patil",
    area: "Kurla",
    skills: ["rescue", "vehicle", "food"],
    isAvailable: false,
    location: { lat: 19.0730, lng: 72.8800 }
  },
  {
    id: "v2",
    name: "Sunita Sharma",
    area: "Andheri",
    skills: ["medical", "food"],
    isAvailable: false,
    location: { lat: 19.1200, lng: 72.8475 }
  },
  {
    id: "v3",
    name: "Abdul Khan",
    area: "Bandra",
    skills: ["boat", "rescue", "vehicle"],
    isAvailable: false,
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
  active: 7,
  resolved: 1,
  volunteersDeployed: 6,
  avgResponseTime: "8.3 min"
};
