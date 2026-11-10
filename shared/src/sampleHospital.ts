import type {
  Announcement,
  Appointment,
  AuditLog,
  Building,
  Department,
  Destination,
  Doctor,
  DoctorSchedule,
  Floor,
  Hospital,
  HospitalServiceItem,
  MapVersion,
  NavigationEdge,
  NavigationNode,
  QrCheckpoint,
  QueueToken,
  ServiceRequest,
  UserProfile,
} from './types.js';

export const HOSPITAL_ID = '11111111-1111-4111-8111-111111111101';
export const BUILDING_ID = '22222222-2222-4222-8222-222222222201';
export const MAP_VERSION_ID = '33333333-3333-4333-8333-333333333301';

export const FLOOR_IDS = {
  L0: '44444444-4444-4444-8444-444444444400',
  L1: '44444444-4444-4444-8444-444444444401',
  L2: '44444444-4444-4444-8444-444444444402',
  L3: '44444444-4444-4444-8444-444444444403',
} as const;

export const SAMPLE_HOSPITAL: Hospital = {
  id: HOSPITAL_ID,
  name: 'Aurelia Pavilion Medical Center',
  nameTa: 'ஆரேலியா பெவிலியன் மருத்துவ மையம்',
  tagline: 'Find Your Way. Access Care. Save Time.',
  taglineTa: 'உங்கள் வழியைக் கண்டறியுங்கள். மருத்துவ சேவையைப் பெறுங்கள். நேரத்தைச் சேமியுங்கள்.',
  isSampleData: true,
  sampleDisclaimer:
    'Fictional sample hospital layout and clinical dataset created strictly for MEDIPATH navigation and platform demonstration.',
  sampleDisclaimerTa:
    'MEDIPATH வழிகாட்டுதல் மற்றும் செயல்விளக்கத்திற்காக உருவாக்கப்பட்ட மாதிரி மருத்துவமனை அமைப்பு.',
  address: '42 Cathedral Promenade, Civic Medical District, Chennai 600006',
  addressTa: '42 கதீட்ரல் பிராமனேட், சிவில் மருத்துவ மண்டலம், சென்னை 600006',
  city: 'Chennai',
  phone: '+91 44 4019 2200',
  emergencyPhone: '+91 44 4019 2911',
  email: 'concierge@aurelia-sample.medipath.org',
  latitude: 13.0604,
  longitude: 80.2496,
  visitingHours: 'Outpatient 07:00 – 21:00 · Emergency & Trauma 24/7',
  visitingHoursTa: 'புறநோயாளர் 07:00 – 21:00 · அவசர சிகிச்சை 24/7',
  createdAt: '2026-01-01T00:00:00.000Z',
};

export const SAMPLE_BUILDING: Building = {
  id: BUILDING_ID,
  hospitalId: HOSPITAL_ID,
  name: 'Main Architectural Pavilion',
  nameTa: 'முதன்மை மருத்துவக் கட்டிடம்',
  code: 'PAV-A',
  description:
    'Four-level limestone and glass pavilion unified around a central daylight atrium, dual elevator cores, and step-free clinical wings.',
  descriptionTa:
    'நான்கு தளங்களைக் கொண்ட சுண்ணாம்பு மற்றும் கண்ணாடி முகப்பு மருத்துவக் கட்டிடம்; மைய மின்தூக்கிகள் மற்றும் சக்கர நாற்காலி அணுகல் பாதைகளுடன்.',
  totalFloors: 4,
  widthMeters: 48,
  depthMeters: 30,
  createdAt: '2026-01-01T00:00:00.000Z',
};

export const SAMPLE_MAP_VERSION: MapVersion = {
  id: MAP_VERSION_ID,
  hospitalId: HOSPITAL_ID,
  versionNumber: 1,
  label: 'v1.0 — Initial Architectural Blueprint',
  status: 'published',
  publishedBy: 'admin@medipath.demo',
  publishedAt: '2026-01-05T08:00:00.000Z',
  notes: 'Published initial 4-floor architectural spatial graph with accessible elevator links.',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function buildArchitecturalFloorSvg(floorCode: string, zonesMarkup: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 640" role="img" aria-label="${floorCode} architectural floor plan">
  <rect x="40" y="55" width="920" height="535" rx="6" fill="#FAF9F6" stroke="#102C35" stroke-width="3"/>
  <rect x="60" y="75" width="880" height="495" fill="none" stroke="#D5D0C5" stroke-width="1"/>
  <path d="M 180 180 H 860 M 180 460 H 860 M 180 180 V 470 M 500 180 V 550 M 760 180 V 460" stroke="#E8E4DB" stroke-width="26" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <path d="M 180 180 H 860 M 180 460 H 860 M 180 180 V 470 M 500 180 V 550 M 760 180 V 460" stroke="#C8C1B4" stroke-width="1" stroke-dasharray="6 6" fill="none"/>
  <rect x="395" y="245" width="210" height="120" rx="4" fill="#F0EDE6" stroke="#B7A58A" stroke-width="1.5" stroke-dasharray="4 4"/>
  <rect x="478" y="168" width="44" height="44" rx="4" fill="#102C35" fill-opacity="0.12" stroke="#102C35" stroke-width="1.5"/>
  <rect x="738" y="298" width="44" height="44" rx="4" fill="#102C35" fill-opacity="0.12" stroke="#102C35" stroke-width="1.5"/>
  <rect x="158" y="158" width="44" height="44" rx="4" fill="#B7A58A" fill-opacity="0.2" stroke="#858B88" stroke-width="1.5"/>
  <rect x="838" y="438" width="44" height="44" rx="4" fill="#B7A58A" fill-opacity="0.2" stroke="#858B88" stroke-width="1.5"/>
  ${zonesMarkup}
</svg>`;
}

export const SAMPLE_FLOORS: Floor[] = [
  {
    id: FLOOR_IDS.L0,
    buildingId: BUILDING_ID,
    levelNumber: 0,
    code: 'L0',
    name: 'Ground Atrium & Emergency',
    nameTa: 'தரை தளம் — வரவேற்பு மற்றும் அவசர சிகிச்சை',
    subtitle: 'Main Entrance, Reception, Emergency Trauma, Billing, Cafeteria & Help Desk',
    subtitleTa: 'பிரதான நுழைவாயில், வரவேற்பு, அவசர சிகிச்சை, கட்டணம், உணவகம் மற்றும் உதவி மையம்',
    elevationMeters: 0,
    svgWidth: 1000,
    svgHeight: 640,
    isPublished: true,
    svgPlan: buildArchitecturalFloorSvg(
      'L0',
      `<rect x="420" y="520" width="160" height="60" rx="4" fill="#E6ECEB" stroke="#174C50" stroke-width="1.5"/>
       <rect x="430" y="390" width="140" height="80" rx="4" fill="#E6ECEB" stroke="#174C50" stroke-width="1.5"/>
       <rect x="280" y="390" width="120" height="80" rx="4" fill="#EFECE4" stroke="#B7A58A" stroke-width="1.5"/>
       <rect x="60" y="400" width="170" height="160" rx="4" fill="#FBEAE8" stroke="#B83227" stroke-width="2"/>
       <rect x="680" y="390" width="150" height="110" rx="4" fill="#EFECE4" stroke="#858B88" stroke-width="1.5"/>
       <rect x="790" y="80" width="150" height="150" rx="4" fill="#F2EFE7" stroke="#B7A58A" stroke-width="1.5"/>
       <rect x="290" y="80" width="100" height="85" rx="4" fill="#F0F2F2" stroke="#858B88" stroke-width="1.5"/>`,
    ),
  },
  {
    id: FLOOR_IDS.L1,
    buildingId: BUILDING_ID,
    levelNumber: 1,
    code: 'L1',
    name: 'Diagnostics & Pharmacy',
    nameTa: 'முதல் தளம் — பரிசோதனைக் கூடம் மற்றும் மருந்தகம்',
    subtitle: 'Clinical Laboratory, Radiology Imaging (MRI / CT) & Central Pharmacy',
    subtitleTa: 'மருத்துவ பரிசோதனைக் கூடம், கதிரியக்கவியல் (MRI / CT) மற்றும் மருந்தகம்',
    elevationMeters: 4.2,
    svgWidth: 1000,
    svgHeight: 640,
    isPublished: true,
    svgPlan: buildArchitecturalFloorSvg(
      'L1',
      `<rect x="70" y="240" width="190" height="145" rx="4" fill="#E6ECEB" stroke="#174C50" stroke-width="1.5"/>
       <rect x="70" y="405" width="230" height="155" rx="4" fill="#E6ECEB" stroke="#174C50" stroke-width="1.5"/>
       <rect x="680" y="390" width="155" height="145" rx="4" fill="#EFECE4" stroke="#B7A58A" stroke-width="1.5"/>
       <rect x="290" y="80" width="100" height="85" rx="4" fill="#F0F2F2" stroke="#858B88" stroke-width="1.5"/>`,
    ),
  },
  {
    id: FLOOR_IDS.L2,
    buildingId: BUILDING_ID,
    levelNumber: 2,
    code: 'L2',
    name: 'Specialist Outpatient Wings',
    nameTa: 'இரண்டாம் தளம் — சிறப்பு மருத்துவப் பிரிவுகள்',
    subtitle: 'Cardiology, Neurology, Orthopaedics & General Medicine Clinics',
    subtitleTa: 'இதயவியல், நரம்பியல், எலும்பியல் மற்றும் பொது மருத்துவம்',
    elevationMeters: 8.4,
    svgWidth: 1000,
    svgHeight: 640,
    isPublished: true,
    svgPlan: buildArchitecturalFloorSvg(
      'L2',
      `<rect x="70" y="240" width="200" height="150" rx="4" fill="#E6ECEB" stroke="#102C35" stroke-width="1.5"/>
       <rect x="70" y="410" width="220" height="150" rx="4" fill="#E6ECEB" stroke="#102C35" stroke-width="1.5"/>
       <rect x="680" y="85" width="230" height="150" rx="4" fill="#EFECE4" stroke="#174C50" stroke-width="1.5"/>
       <rect x="675" y="390" width="165" height="155" rx="4" fill="#EFECE4" stroke="#B7A58A" stroke-width="1.5"/>
       <rect x="290" y="80" width="100" height="85" rx="4" fill="#F0F2F2" stroke="#858B88" stroke-width="1.5"/>`,
    ),
  },
  {
    id: FLOOR_IDS.L3,
    buildingId: BUILDING_ID,
    levelNumber: 3,
    code: 'L3',
    name: 'Critical Care & Inpatient Wards',
    nameTa: 'மூன்றாம் தளம் — தீவிர சிகிச்சை மற்றும் உள்நோயாளி வார்டுகள்',
    subtitle: 'Intensive Care Unit (ICU) & Private Inpatient Recovery Suites',
    subtitleTa: 'தீவிர சிகிச்சைப் பிரிவு (ICU) மற்றும் உள்நோயாளி அறைகள்',
    elevationMeters: 12.6,
    svgWidth: 1000,
    svgHeight: 640,
    isPublished: true,
    svgPlan: buildArchitecturalFloorSvg(
      'L3',
      `<rect x="70" y="245" width="250" height="290" rx="4" fill="#FBEAE8" stroke="#B83227" stroke-width="1.5"/>
       <rect x="660" y="185" width="260" height="345" rx="4" fill="#E6ECEB" stroke="#174C50" stroke-width="1.5"/>
       <rect x="290" y="80" width="100" height="85" rx="4" fill="#F0F2F2" stroke="#858B88" stroke-width="1.5"/>`,
    ),
  },
];

export const DEPARTMENT_IDS = {
  EMERGENCY: '55555555-5555-4555-8555-555555555501',
  CARDIOLOGY: '55555555-5555-4555-8555-555555555502',
  NEUROLOGY: '55555555-5555-4555-8555-555555555503',
  ORTHOPAEDICS: '55555555-5555-4555-8555-555555555504',
  GENERAL_MEDICINE: '55555555-5555-4555-8555-555555555505',
  LABORATORY: '55555555-5555-4555-8555-555555555506',
  RADIOLOGY: '55555555-5555-4555-8555-555555555507',
  PHARMACY: '55555555-5555-4555-8555-555555555508',
  ICU: '55555555-5555-4555-8555-555555555509',
  INPATIENT: '55555555-5555-4555-8555-555555555510',
} as const;

export const NODE_IDS = {
  L0_ENTRANCE: 'a0000000-0000-4000-8000-000000000101',
  L0_AMBULANCE_RAMP: 'a0000000-0000-4000-8000-000000000102',
  L0_RECEPTION: 'a0000000-0000-4000-8000-000000000103',
  L0_HELP_DESK: 'a0000000-0000-4000-8000-000000000104',
  L0_EMERGENCY: 'a0000000-0000-4000-8000-000000000105',
  L0_JUNCTION_SW: 'a0000000-0000-4000-8000-000000000106',
  L0_JUNCTION_S: 'a0000000-0000-4000-8000-000000000107',
  L0_JUNCTION_SE: 'a0000000-0000-4000-8000-000000000108',
  L0_BILLING: 'a0000000-0000-4000-8000-000000000109',
  L0_ELV_A: 'a0000000-0000-4000-8000-000000000110',
  L0_ELV_B: 'a0000000-0000-4000-8000-000000000111',
  L0_STAIR_W: 'a0000000-0000-4000-8000-000000000112',
  L0_STAIR_E: 'a0000000-0000-4000-8000-000000000113',
  L0_JUNCTION_NW: 'a0000000-0000-4000-8000-000000000114',
  L0_RESTROOMS: 'a0000000-0000-4000-8000-000000000115',
  L0_CAFETERIA: 'a0000000-0000-4000-8000-000000000116',

  L1_ELV_A: 'a0000000-0000-4000-8000-000000000201',
  L1_ELV_B: 'a0000000-0000-4000-8000-000000000202',
  L1_STAIR_W: 'a0000000-0000-4000-8000-000000000203',
  L1_STAIR_E: 'a0000000-0000-4000-8000-000000000204',
  L1_JUNCTION_NW: 'a0000000-0000-4000-8000-000000000205',
  L1_RESTROOMS: 'a0000000-0000-4000-8000-000000000206',
  L1_LAB: 'a0000000-0000-4000-8000-000000000207',
  L1_RADIOLOGY: 'a0000000-0000-4000-8000-000000000208',
  L1_JUNCTION_SW: 'a0000000-0000-4000-8000-000000000209',
  L1_JUNCTION_S: 'a0000000-0000-4000-8000-000000000210',
  L1_PHARMACY: 'a0000000-0000-4000-8000-000000000211',
  L1_JUNCTION_NE: 'a0000000-0000-4000-8000-000000000212',

  L2_ELV_A: 'a0000000-0000-4000-8000-000000000301',
  L2_ELV_B: 'a0000000-0000-4000-8000-000000000302',
  L2_STAIR_W: 'a0000000-0000-4000-8000-000000000303',
  L2_STAIR_E: 'a0000000-0000-4000-8000-000000000304',
  L2_JUNCTION_NW: 'a0000000-0000-4000-8000-000000000305',
  L2_RESTROOMS: 'a0000000-0000-4000-8000-000000000306',
  L2_CARDIOLOGY: 'a0000000-0000-4000-8000-000000000307',
  L2_NEUROLOGY: 'a0000000-0000-4000-8000-000000000308',
  L2_JUNCTION_SW: 'a0000000-0000-4000-8000-000000000309',
  L2_JUNCTION_S: 'a0000000-0000-4000-8000-000000000310',
  L2_ORTHOPAEDICS: 'a0000000-0000-4000-8000-000000000311',
  L2_GENERAL_MED: 'a0000000-0000-4000-8000-000000000312',

  L3_ELV_A: 'a0000000-0000-4000-8000-000000000401',
  L3_ELV_B: 'a0000000-0000-4000-8000-000000000402',
  L3_STAIR_W: 'a0000000-0000-4000-8000-000000000403',
  L3_STAIR_E: 'a0000000-0000-4000-8000-000000000404',
  L3_JUNCTION_NW: 'a0000000-0000-4000-8000-000000000405',
  L3_RESTROOMS: 'a0000000-0000-4000-8000-000000000406',
  L3_ICU: 'a0000000-0000-4000-8000-000000000407',
  L3_WARDS: 'a0000000-0000-4000-8000-000000000408',
  L3_CENTRAL_GALLERY: 'a0000000-0000-4000-8000-000000000409',
  L3_JUNCTION_SW: 'a0000000-0000-4000-8000-000000000410',
  L3_JUNCTION_S: 'a0000000-0000-4000-8000-000000000411',
  L3_JUNCTION_SE: 'a0000000-0000-4000-8000-000000000412',
  L3_JUNCTION_NE: 'a0000000-0000-4000-8000-000000000413',
} as const;

export const SAMPLE_NODES: NavigationNode[] = [
  { id: NODE_IDS.L0_ENTRANCE, floorId: FLOOR_IDS.L0, mapVersionId: MAP_VERSION_ID, code: 'L0-ENT', label: 'Main Entrance Portico', labelTa: 'பிரதான நுழைவாயில்', type: 'entrance', x: 500, y: 550, isAccessible: true, isActive: true },
  { id: NODE_IDS.L0_AMBULANCE_RAMP, floorId: FLOOR_IDS.L0, mapVersionId: MAP_VERSION_ID, code: 'L0-AMB', label: 'Emergency Ramp Gate A', labelTa: 'அவசர சிகிச்சை சாய்வு நுழைவாயில்', type: 'entrance', x: 75, y: 515, isAccessible: true, isActive: true },
  { id: NODE_IDS.L0_JUNCTION_S, floorId: FLOOR_IDS.L0, mapVersionId: MAP_VERSION_ID, code: 'L0-J-S', label: 'South Atrium Concourse', labelTa: 'தெற்கு வளாக சந்திப்பு', type: 'junction', x: 500, y: 460, isAccessible: true, isActive: true },
  { id: NODE_IDS.L0_RECEPTION, floorId: FLOOR_IDS.L0, mapVersionId: MAP_VERSION_ID, code: 'L0-REC', label: 'Central Atrium Reception', labelTa: 'மைய வரவேற்பு மேசை', type: 'department_entrance', x: 500, y: 410, isAccessible: true, isActive: true },
  { id: NODE_IDS.L0_HELP_DESK, floorId: FLOOR_IDS.L0, mapVersionId: MAP_VERSION_ID, code: 'L0-HLP', label: 'Patient Help Desk', labelTa: 'நோயாளர் உதவி மையம்', type: 'room', x: 340, y: 460, isAccessible: true, isActive: true },
  { id: NODE_IDS.L0_JUNCTION_SW, floorId: FLOOR_IDS.L0, mapVersionId: MAP_VERSION_ID, code: 'L0-J-SW', label: 'West Ground Corridor', labelTa: 'மேற்கு தரைத்தள நடைபாதை', type: 'junction', x: 180, y: 460, isAccessible: true, isActive: true },
  { id: NODE_IDS.L0_EMERGENCY, floorId: FLOOR_IDS.L0, mapVersionId: MAP_VERSION_ID, code: 'L0-ER', label: 'Emergency & Trauma Center', labelTa: 'அவசர மற்றும் அதிர்ச்சி சிகிச்சைப் பிரிவு', type: 'department_entrance', x: 145, y: 470, isAccessible: true, isActive: true },
  { id: NODE_IDS.L0_BILLING, floorId: FLOOR_IDS.L0, mapVersionId: MAP_VERSION_ID, code: 'L0-BIL', label: 'Billing & Insurance Desk', labelTa: 'கட்டணம் மற்றும் காப்பீட்டுப் பிரிவு', type: 'room', x: 760, y: 460, isAccessible: true, isActive: true },
  { id: NODE_IDS.L0_ELV_A, floorId: FLOOR_IDS.L0, mapVersionId: MAP_VERSION_ID, code: 'L0-ELV-A', label: 'Central Atrium Elevators (L0)', labelTa: 'மைய மின்தூக்கிகள் (L0)', type: 'elevator', x: 500, y: 190, isAccessible: true, isActive: true },
  { id: NODE_IDS.L0_ELV_B, floorId: FLOOR_IDS.L0, mapVersionId: MAP_VERSION_ID, code: 'L0-ELV-B', label: 'East Clinical Elevators (L0)', labelTa: 'கிழக்கு மின்தூக்கிகள் (L0)', type: 'elevator', x: 760, y: 320, isAccessible: true, isActive: true },
  { id: NODE_IDS.L0_STAIR_W, floorId: FLOOR_IDS.L0, mapVersionId: MAP_VERSION_ID, code: 'L0-STR-W', label: 'West Staircase Lobby (L0)', labelTa: 'மேற்குப் படிக்கட்டு முகப்பு (L0)', type: 'staircase', x: 180, y: 180, isAccessible: true, isActive: true },
  { id: NODE_IDS.L0_STAIR_E, floorId: FLOOR_IDS.L0, mapVersionId: MAP_VERSION_ID, code: 'L0-STR-E', label: 'East Staircase Lobby (L0)', labelTa: 'கிழக்குப் படிக்கட்டு முகப்பு (L0)', type: 'staircase', x: 860, y: 460, isAccessible: true, isActive: true },
  { id: NODE_IDS.L0_JUNCTION_NW, floorId: FLOOR_IDS.L0, mapVersionId: MAP_VERSION_ID, code: 'L0-J-NW', label: 'North Concourse Gallery', labelTa: 'வடக்கு நடைபாதை', type: 'corridor', x: 340, y: 185, isAccessible: true, isActive: true },
  { id: NODE_IDS.L0_RESTROOMS, floorId: FLOOR_IDS.L0, mapVersionId: MAP_VERSION_ID, code: 'L0-WC', label: 'Ground Restrooms', labelTa: 'தரைத்தள கழிப்பறைகள்', type: 'room', x: 340, y: 125, isAccessible: true, isActive: true },
  { id: NODE_IDS.L0_JUNCTION_SE, floorId: FLOOR_IDS.L0, mapVersionId: MAP_VERSION_ID, code: 'L0-J-NE', label: 'East Garden Corridor', labelTa: 'கிழக்கு தோட்ட நடைபாதை', type: 'corridor', x: 760, y: 185, isAccessible: true, isActive: true },
  { id: NODE_IDS.L0_CAFETERIA, floorId: FLOOR_IDS.L0, mapVersionId: MAP_VERSION_ID, code: 'L0-CAFE', label: 'Garden Terrace Cafeteria', labelTa: 'தோட்ட உணவகம்', type: 'room', x: 860, y: 180, isAccessible: true, isActive: true },

  { id: NODE_IDS.L1_ELV_A, floorId: FLOOR_IDS.L1, mapVersionId: MAP_VERSION_ID, code: 'L1-ELV-A', label: 'Central Atrium Elevators (L1)', labelTa: 'மைய மின்தூக்கிகள் (L1)', type: 'elevator', x: 500, y: 190, isAccessible: true, isActive: true },
  { id: NODE_IDS.L1_ELV_B, floorId: FLOOR_IDS.L1, mapVersionId: MAP_VERSION_ID, code: 'L1-ELV-B', label: 'East Clinical Elevators (L1)', labelTa: 'கிழக்கு மின்தூக்கிகள் (L1)', type: 'elevator', x: 760, y: 320, isAccessible: true, isActive: true },
  { id: NODE_IDS.L1_STAIR_W, floorId: FLOOR_IDS.L1, mapVersionId: MAP_VERSION_ID, code: 'L1-STR-W', label: 'West Staircase Lobby (L1)', labelTa: 'மேற்குப் படிக்கட்டு முகப்பு (L1)', type: 'staircase', x: 180, y: 180, isAccessible: true, isActive: true },
  { id: NODE_IDS.L1_STAIR_E, floorId: FLOOR_IDS.L1, mapVersionId: MAP_VERSION_ID, code: 'L1-STR-E', label: 'East Staircase Lobby (L1)', labelTa: 'கிழக்குப் படிக்கட்டு முகப்பு (L1)', type: 'staircase', x: 860, y: 460, isAccessible: true, isActive: true },
  { id: NODE_IDS.L1_JUNCTION_NW, floorId: FLOOR_IDS.L1, mapVersionId: MAP_VERSION_ID, code: 'L1-J-NW', label: 'Diagnostics North Gallery', labelTa: 'முதல் தளம் வடக்கு நடைபாதை', type: 'corridor', x: 340, y: 185, isAccessible: true, isActive: true },
  { id: NODE_IDS.L1_RESTROOMS, floorId: FLOOR_IDS.L1, mapVersionId: MAP_VERSION_ID, code: 'L1-WC', label: 'Level 1 Restrooms', labelTa: 'முதல் தள கழிப்பறைகள்', type: 'room', x: 340, y: 125, isAccessible: true, isActive: true },
  { id: NODE_IDS.L1_LAB, floorId: FLOOR_IDS.L1, mapVersionId: MAP_VERSION_ID, code: 'L1-LAB', label: 'Clinical Laboratory Wing', labelTa: 'மருத்துவ பரிசோதனைக் கூடம்', type: 'department_entrance', x: 180, y: 330, isAccessible: true, isActive: true },
  { id: NODE_IDS.L1_JUNCTION_SW, floorId: FLOOR_IDS.L1, mapVersionId: MAP_VERSION_ID, code: 'L1-J-SW', label: 'Imaging West Junction', labelTa: 'மேற்கு பரிசோதனை சந்திப்பு', type: 'junction', x: 180, y: 460, isAccessible: true, isActive: true },
  { id: NODE_IDS.L1_RADIOLOGY, floorId: FLOOR_IDS.L1, mapVersionId: MAP_VERSION_ID, code: 'L1-RAD', label: 'Radiology & MRI Suite', labelTa: 'கதிரியக்கவியல் மற்றும் MRI பிரிவு', type: 'department_entrance', x: 245, y: 465, isAccessible: true, isActive: true },
  { id: NODE_IDS.L1_JUNCTION_S, floorId: FLOOR_IDS.L1, mapVersionId: MAP_VERSION_ID, code: 'L1-J-S', label: 'Level 1 South Atrium Bridge', labelTa: 'முதல் தள தெற்கு பாலம்', type: 'corridor', x: 500, y: 460, isAccessible: true, isActive: true },
  { id: NODE_IDS.L1_PHARMACY, floorId: FLOOR_IDS.L1, mapVersionId: MAP_VERSION_ID, code: 'L1-PHM', label: 'Central Pharmacy Dispensary', labelTa: 'மத்திய மருந்தகம்', type: 'department_entrance', x: 760, y: 460, isAccessible: true, isActive: true },
  { id: NODE_IDS.L1_JUNCTION_NE, floorId: FLOOR_IDS.L1, mapVersionId: MAP_VERSION_ID, code: 'L1-J-NE', label: 'Level 1 East Hall', labelTa: 'முதல் தள கிழக்கு நடைபாதை', type: 'junction', x: 760, y: 185, isAccessible: true, isActive: true },

  { id: NODE_IDS.L2_ELV_A, floorId: FLOOR_IDS.L2, mapVersionId: MAP_VERSION_ID, code: 'L2-ELV-A', label: 'Central Atrium Elevators (L2)', labelTa: 'மைய மின்தூக்கிகள் (L2)', type: 'elevator', x: 500, y: 190, isAccessible: true, isActive: true },
  { id: NODE_IDS.L2_ELV_B, floorId: FLOOR_IDS.L2, mapVersionId: MAP_VERSION_ID, code: 'L2-ELV-B', label: 'East Clinical Elevators (L2)', labelTa: 'கிழக்கு மின்தூக்கிகள் (L2)', type: 'elevator', x: 760, y: 320, isAccessible: true, isActive: true },
  { id: NODE_IDS.L2_STAIR_W, floorId: FLOOR_IDS.L2, mapVersionId: MAP_VERSION_ID, code: 'L2-STR-W', label: 'West Staircase Lobby (L2)', labelTa: 'மேற்குப் படிக்கட்டு முகப்பு (L2)', type: 'staircase', x: 180, y: 180, isAccessible: true, isActive: true },
  { id: NODE_IDS.L2_STAIR_E, floorId: FLOOR_IDS.L2, mapVersionId: MAP_VERSION_ID, code: 'L2-STR-E', label: 'East Staircase Lobby (L2)', labelTa: 'கிழக்குப் படிக்கட்டு முகப்பு (L2)', type: 'staircase', x: 860, y: 460, isAccessible: true, isActive: true },
  { id: NODE_IDS.L2_JUNCTION_NW, floorId: FLOOR_IDS.L2, mapVersionId: MAP_VERSION_ID, code: 'L2-J-NW', label: 'Specialist North Gallery', labelTa: 'இரண்டாம் தள வடக்கு நடைபாதை', type: 'corridor', x: 340, y: 185, isAccessible: true, isActive: true },
  { id: NODE_IDS.L2_RESTROOMS, floorId: FLOOR_IDS.L2, mapVersionId: MAP_VERSION_ID, code: 'L2-WC', label: 'Level 2 Restrooms', labelTa: 'இரண்டாம் தள கழிப்பறைகள்', type: 'room', x: 340, y: 125, isAccessible: true, isActive: true },
  { id: NODE_IDS.L2_CARDIOLOGY, floorId: FLOOR_IDS.L2, mapVersionId: MAP_VERSION_ID, code: 'L2-CARD', label: 'Cardiology & Vascular Suite', labelTa: 'இதயவியல் சிகிச்சைப் பிரிவு', type: 'department_entrance', x: 180, y: 330, isAccessible: true, isActive: true },
  { id: NODE_IDS.L2_JUNCTION_SW, floorId: FLOOR_IDS.L2, mapVersionId: MAP_VERSION_ID, code: 'L2-J-SW', label: 'Neuro-West Junction', labelTa: 'நரம்பியல் மேற்கு சந்திப்பு', type: 'junction', x: 180, y: 460, isAccessible: true, isActive: true },
  { id: NODE_IDS.L2_NEUROLOGY, floorId: FLOOR_IDS.L2, mapVersionId: MAP_VERSION_ID, code: 'L2-NEUR', label: 'Neurology & Stroke Clinic', labelTa: 'நரம்பியல் மற்றும் பக்கவாதப் பிரிவு', type: 'department_entrance', x: 245, y: 465, isAccessible: true, isActive: true },
  { id: NODE_IDS.L2_JUNCTION_S, floorId: FLOOR_IDS.L2, mapVersionId: MAP_VERSION_ID, code: 'L2-J-S', label: 'Level 2 Atrium Overlook', labelTa: 'இரண்டாம் தள தெற்கு நடைபாதை', type: 'corridor', x: 500, y: 460, isAccessible: true, isActive: true },
  { id: NODE_IDS.L2_ORTHOPAEDICS, floorId: FLOOR_IDS.L2, mapVersionId: MAP_VERSION_ID, code: 'L2-ORTH', label: 'Orthopaedics & Kinetic Rehab', labelTa: 'எலும்பியல் மற்றும் மூட்டு சிகிச்சை', type: 'department_entrance', x: 760, y: 460, isAccessible: true, isActive: true },
  { id: NODE_IDS.L2_GENERAL_MED, floorId: FLOOR_IDS.L2, mapVersionId: MAP_VERSION_ID, code: 'L2-GMED', label: 'General & Preventive Medicine', labelTa: 'பொது மருத்துவப் பிரிவு', type: 'department_entrance', x: 760, y: 185, isAccessible: true, isActive: true },

  { id: NODE_IDS.L3_ELV_A, floorId: FLOOR_IDS.L3, mapVersionId: MAP_VERSION_ID, code: 'L3-ELV-A', label: 'Central Atrium Elevators (L3)', labelTa: 'மைய மின்தூக்கிகள் (L3)', type: 'elevator', x: 500, y: 190, isAccessible: true, isActive: true },
  { id: NODE_IDS.L3_ELV_B, floorId: FLOOR_IDS.L3, mapVersionId: MAP_VERSION_ID, code: 'L3-ELV-B', label: 'East Clinical Elevators (L3)', labelTa: 'கிழக்கு மின்தூக்கிகள் (L3)', type: 'elevator', x: 760, y: 320, isAccessible: true, isActive: true },
  { id: NODE_IDS.L3_STAIR_W, floorId: FLOOR_IDS.L3, mapVersionId: MAP_VERSION_ID, code: 'L3-STR-W', label: 'West Staircase Lobby (L3)', labelTa: 'மேற்குப் படிக்கட்டு முகப்பு (L3)', type: 'staircase', x: 180, y: 180, isAccessible: true, isActive: true },
  { id: NODE_IDS.L3_STAIR_E, floorId: FLOOR_IDS.L3, mapVersionId: MAP_VERSION_ID, code: 'L3-STR-E', label: 'East Staircase Lobby (L3)', labelTa: 'கிழக்குப் படிக்கட்டு முகப்பு (L3)', type: 'staircase', x: 860, y: 460, isAccessible: true, isActive: true },
  { id: NODE_IDS.L3_JUNCTION_NW, floorId: FLOOR_IDS.L3, mapVersionId: MAP_VERSION_ID, code: 'L3-J-NW', label: 'Critical Care North Gallery', labelTa: 'மூன்றாம் தள வடக்கு நடைபாதை', type: 'corridor', x: 340, y: 185, isAccessible: true, isActive: true },
  { id: NODE_IDS.L3_RESTROOMS, floorId: FLOOR_IDS.L3, mapVersionId: MAP_VERSION_ID, code: 'L3-WC', label: 'Level 3 Visitor Restrooms', labelTa: 'மூன்றாம் தள கழிப்பறைகள்', type: 'room', x: 340, y: 125, isAccessible: true, isActive: true },
  { id: NODE_IDS.L3_ICU, floorId: FLOOR_IDS.L3, mapVersionId: MAP_VERSION_ID, code: 'L3-ICU', label: 'Intensive Care Unit (ICU)', labelTa: 'தீவிர சிகிச்சைப் பிரிவு (ICU)', type: 'department_entrance', x: 180, y: 380, isAccessible: true, isActive: true },
  { id: NODE_IDS.L3_CENTRAL_GALLERY, floorId: FLOOR_IDS.L3, mapVersionId: MAP_VERSION_ID, code: 'L3-NUR-HUB', label: 'Level 3 Nurse & Family Lounge', labelTa: 'செவிலியர் மற்றும் குடும்பத்தினர் ஓய்வறை', type: 'corridor', x: 500, y: 380, isAccessible: true, isActive: true },
  { id: NODE_IDS.L3_JUNCTION_SW, floorId: FLOOR_IDS.L3, mapVersionId: MAP_VERSION_ID, code: 'L3-J-SW', label: 'ICU South Vestibule', labelTa: 'ICU தெற்கு பகுதி', type: 'junction', x: 180, y: 460, isAccessible: true, isActive: true },
  { id: NODE_IDS.L3_JUNCTION_S, floorId: FLOOR_IDS.L3, mapVersionId: MAP_VERSION_ID, code: 'L3-J-S', label: 'Level 3 South Skybridge', labelTa: 'மூன்றாம் தள தெற்கு பாலம்', type: 'corridor', x: 500, y: 460, isAccessible: true, isActive: true },
  { id: NODE_IDS.L3_JUNCTION_SE, floorId: FLOOR_IDS.L3, mapVersionId: MAP_VERSION_ID, code: 'L3-J-SE', label: 'Inpatient East Junction', labelTa: 'உள்நோயாளி கிழக்கு சந்திப்பு', type: 'junction', x: 760, y: 460, isAccessible: true, isActive: true },
  { id: NODE_IDS.L3_WARDS, floorId: FLOOR_IDS.L3, mapVersionId: MAP_VERSION_ID, code: 'L3-WARD', label: 'Inpatient Recovery Suites', labelTa: 'உள்நோயாளி சிகிச்சை அறைகள்', type: 'department_entrance', x: 760, y: 380, isAccessible: true, isActive: true },
  { id: NODE_IDS.L3_JUNCTION_NE, floorId: FLOOR_IDS.L3, mapVersionId: MAP_VERSION_ID, code: 'L3-J-NE', label: 'Level 3 East Corridor', labelTa: 'மூன்றாம் தள கிழக்கு நடைபாதை', type: 'corridor', x: 760, y: 185, isAccessible: true, isActive: true },
];

const edgeUuid = (n: number) => `b0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

function edge(
  seq: number,
  fromNodeId: string,
  toNodeId: string,
  edgeType: NavigationEdge['edgeType'],
  distanceMeters: number,
  isAccessible = true,
  isRestricted = false,
): NavigationEdge {
  return {
    id: edgeUuid(seq),
    mapVersionId: MAP_VERSION_ID,
    fromNodeId,
    toNodeId,
    edgeType,
    distanceMeters,
    isAccessible,
    isRestricted,
    bidirectional: true,
  };
}

export const SAMPLE_EDGES: NavigationEdge[] = [
  // L0
  edge(1, NODE_IDS.L0_ENTRANCE, NODE_IDS.L0_JUNCTION_S, 'corridor', 9),
  edge(2, NODE_IDS.L0_JUNCTION_S, NODE_IDS.L0_RECEPTION, 'corridor', 6),
  edge(3, NODE_IDS.L0_RECEPTION, NODE_IDS.L0_ELV_A, 'corridor', 22),
  edge(4, NODE_IDS.L0_JUNCTION_S, NODE_IDS.L0_HELP_DESK, 'corridor', 15),
  edge(5, NODE_IDS.L0_HELP_DESK, NODE_IDS.L0_JUNCTION_SW, 'corridor', 15),
  edge(6, NODE_IDS.L0_JUNCTION_SW, NODE_IDS.L0_EMERGENCY, 'corridor', 5),
  edge(7, NODE_IDS.L0_AMBULANCE_RAMP, NODE_IDS.L0_EMERGENCY, 'ramp', 8, true, false),
  edge(8, NODE_IDS.L0_JUNCTION_S, NODE_IDS.L0_BILLING, 'corridor', 25),
  edge(9, NODE_IDS.L0_BILLING, NODE_IDS.L0_STAIR_E, 'corridor', 10),
  edge(10, NODE_IDS.L0_BILLING, NODE_IDS.L0_ELV_B, 'corridor', 14),
  edge(11, NODE_IDS.L0_ELV_B, NODE_IDS.L0_JUNCTION_SE, 'corridor', 13),
  edge(12, NODE_IDS.L0_JUNCTION_SE, NODE_IDS.L0_CAFETERIA, 'corridor', 10),
  edge(13, NODE_IDS.L0_ELV_A, NODE_IDS.L0_JUNCTION_SE, 'corridor', 25),
  edge(14, NODE_IDS.L0_ELV_A, NODE_IDS.L0_JUNCTION_NW, 'corridor', 15),
  edge(15, NODE_IDS.L0_JUNCTION_NW, NODE_IDS.L0_RESTROOMS, 'corridor', 6),
  edge(16, NODE_IDS.L0_JUNCTION_NW, NODE_IDS.L0_STAIR_W, 'corridor', 15),
  edge(17, NODE_IDS.L0_STAIR_W, NODE_IDS.L0_JUNCTION_SW, 'corridor', 26),

  // L1
  edge(18, NODE_IDS.L1_ELV_A, NODE_IDS.L1_JUNCTION_NW, 'corridor', 15),
  edge(19, NODE_IDS.L1_JUNCTION_NW, NODE_IDS.L1_RESTROOMS, 'corridor', 6),
  edge(20, NODE_IDS.L1_JUNCTION_NW, NODE_IDS.L1_STAIR_W, 'corridor', 15),
  edge(21, NODE_IDS.L1_STAIR_W, NODE_IDS.L1_LAB, 'corridor', 14),
  edge(22, NODE_IDS.L1_LAB, NODE_IDS.L1_JUNCTION_SW, 'corridor', 12),
  edge(23, NODE_IDS.L1_JUNCTION_SW, NODE_IDS.L1_RADIOLOGY, 'corridor', 7),
  edge(24, NODE_IDS.L1_RADIOLOGY, NODE_IDS.L1_JUNCTION_S, 'corridor', 24),
  edge(25, NODE_IDS.L1_JUNCTION_S, NODE_IDS.L1_PHARMACY, 'corridor', 25),
  edge(26, NODE_IDS.L1_PHARMACY, NODE_IDS.L1_STAIR_E, 'corridor', 10),
  edge(27, NODE_IDS.L1_PHARMACY, NODE_IDS.L1_ELV_B, 'corridor', 14),
  edge(28, NODE_IDS.L1_ELV_B, NODE_IDS.L1_JUNCTION_NE, 'corridor', 13),
  edge(29, NODE_IDS.L1_ELV_A, NODE_IDS.L1_JUNCTION_NE, 'corridor', 25),

  // L2
  edge(30, NODE_IDS.L2_ELV_A, NODE_IDS.L2_JUNCTION_NW, 'corridor', 15),
  edge(31, NODE_IDS.L2_JUNCTION_NW, NODE_IDS.L2_RESTROOMS, 'corridor', 6),
  edge(32, NODE_IDS.L2_JUNCTION_NW, NODE_IDS.L2_STAIR_W, 'corridor', 15),
  edge(33, NODE_IDS.L2_STAIR_W, NODE_IDS.L2_CARDIOLOGY, 'corridor', 14),
  edge(34, NODE_IDS.L2_CARDIOLOGY, NODE_IDS.L2_JUNCTION_SW, 'corridor', 12),
  edge(35, NODE_IDS.L2_JUNCTION_SW, NODE_IDS.L2_NEUROLOGY, 'corridor', 7),
  edge(36, NODE_IDS.L2_NEUROLOGY, NODE_IDS.L2_JUNCTION_S, 'corridor', 24),
  edge(37, NODE_IDS.L2_JUNCTION_S, NODE_IDS.L2_ORTHOPAEDICS, 'corridor', 25),
  edge(38, NODE_IDS.L2_ORTHOPAEDICS, NODE_IDS.L2_STAIR_E, 'corridor', 10),
  edge(39, NODE_IDS.L2_ORTHOPAEDICS, NODE_IDS.L2_ELV_B, 'corridor', 14),
  edge(40, NODE_IDS.L2_ELV_B, NODE_IDS.L2_GENERAL_MED, 'corridor', 13),
  edge(41, NODE_IDS.L2_ELV_A, NODE_IDS.L2_GENERAL_MED, 'corridor', 25),

  // L3
  edge(42, NODE_IDS.L3_ELV_A, NODE_IDS.L3_JUNCTION_NW, 'corridor', 15),
  edge(43, NODE_IDS.L3_JUNCTION_NW, NODE_IDS.L3_RESTROOMS, 'corridor', 6),
  edge(44, NODE_IDS.L3_JUNCTION_NW, NODE_IDS.L3_STAIR_W, 'corridor', 15),
  edge(45, NODE_IDS.L3_STAIR_W, NODE_IDS.L3_ICU, 'corridor', 18),
  edge(46, NODE_IDS.L3_ICU, NODE_IDS.L3_JUNCTION_SW, 'corridor', 8),
  edge(47, NODE_IDS.L3_JUNCTION_SW, NODE_IDS.L3_JUNCTION_S, 'corridor', 30),
  edge(48, NODE_IDS.L3_JUNCTION_S, NODE_IDS.L3_CENTRAL_GALLERY, 'corridor', 8),
  edge(49, NODE_IDS.L3_JUNCTION_S, NODE_IDS.L3_JUNCTION_SE, 'corridor', 25),
  edge(50, NODE_IDS.L3_JUNCTION_SE, NODE_IDS.L3_STAIR_E, 'corridor', 10),
  edge(51, NODE_IDS.L3_JUNCTION_SE, NODE_IDS.L3_WARDS, 'corridor', 8),
  edge(52, NODE_IDS.L3_WARDS, NODE_IDS.L3_ELV_B, 'corridor', 6),
  edge(53, NODE_IDS.L3_ELV_B, NODE_IDS.L3_JUNCTION_NE, 'corridor', 13),
  edge(54, NODE_IDS.L3_ELV_A, NODE_IDS.L3_JUNCTION_NE, 'corridor', 25),
  edge(55, NODE_IDS.L3_ICU, NODE_IDS.L3_CENTRAL_GALLERY, 'corridor', 16, true, true), // restricted staff-only sterile bypass

  // Vertical Elevators
  edge(56, NODE_IDS.L0_ELV_A, NODE_IDS.L1_ELV_A, 'elevator', 8, true, false),
  edge(57, NODE_IDS.L1_ELV_A, NODE_IDS.L2_ELV_A, 'elevator', 8, true, false),
  edge(58, NODE_IDS.L2_ELV_A, NODE_IDS.L3_ELV_A, 'elevator', 8, true, false),
  edge(59, NODE_IDS.L0_ELV_B, NODE_IDS.L1_ELV_B, 'elevator', 8, true, false),
  edge(60, NODE_IDS.L1_ELV_B, NODE_IDS.L2_ELV_B, 'elevator', 8, true, false),
  edge(61, NODE_IDS.L2_ELV_B, NODE_IDS.L3_ELV_B, 'elevator', 8, true, false),

  // Vertical Staircases (excluded in Accessible Mode)
  edge(62, NODE_IDS.L0_STAIR_W, NODE_IDS.L1_STAIR_W, 'staircase', 10, false, false),
  edge(63, NODE_IDS.L1_STAIR_W, NODE_IDS.L2_STAIR_W, 'staircase', 10, false, false),
  edge(64, NODE_IDS.L2_STAIR_W, NODE_IDS.L3_STAIR_W, 'staircase', 10, false, false),
  edge(65, NODE_IDS.L0_STAIR_E, NODE_IDS.L1_STAIR_E, 'staircase', 10, false, false),
  edge(66, NODE_IDS.L1_STAIR_E, NODE_IDS.L2_STAIR_E, 'staircase', 10, false, false),
  edge(67, NODE_IDS.L2_STAIR_E, NODE_IDS.L3_STAIR_E, 'staircase', 10, false, false),
];

export const RESTRICTED_EDGE_ID = edgeUuid(55);

export const DESTINATION_IDS = {
  MAIN_ENTRANCE: '66666666-6666-4666-8666-666666666601',
  RECEPTION: '66666666-6666-4666-8666-666666666602',
  HELP_DESK: '66666666-6666-4666-8666-666666666603',
  EMERGENCY: '66666666-6666-4666-8666-666666666604',
  BILLING: '66666666-6666-4666-8666-666666666605',
  CAFETERIA: '66666666-6666-4666-8666-666666666606',
  RESTROOMS_L0: '66666666-6666-4666-8666-666666666607',
  ELEVATORS_L0: '66666666-6666-4666-8666-666666666608',
  STAIRCASE_L0: '66666666-6666-4666-8666-666666666609',
  LABORATORY: '66666666-6666-4666-8666-666666666610',
  RADIOLOGY: '66666666-6666-4666-8666-666666666611',
  PHARMACY: '66666666-6666-4666-8666-666666666612',
  RESTROOMS_L1: '66666666-6666-4666-8666-666666666613',
  CARDIOLOGY: '66666666-6666-4666-8666-666666666614',
  NEUROLOGY: '66666666-6666-4666-8666-666666666615',
  ORTHOPAEDICS: '66666666-6666-4666-8666-666666666616',
  GENERAL_MEDICINE: '66666666-6666-4666-8666-666666666617',
  RESTROOMS_L2: '66666666-6666-4666-8666-666666666618',
  ICU: '66666666-6666-4666-8666-666666666619',
  INPATIENT_WARDS: '66666666-6666-4666-8666-666666666620',
  RESTROOMS_L3: '66666666-6666-4666-8666-666666666621',
} as const;

export const SAMPLE_DEPARTMENTS: Department[] = [
  {
    id: DEPARTMENT_IDS.CARDIOLOGY,
    hospitalId: HOSPITAL_ID,
    floorId: FLOOR_IDS.L2,
    slug: 'cardiology',
    code: 'CARD-02',
    name: 'Cardiology & Vascular Center',
    nameTa: 'இதயவியல் மற்றும் இரத்த நாளப் பிரிவு',
    wing: 'West Pavilion · Level 2',
    wingTa: 'மேற்குப் பகுதி · தளம் 2',
    summary: 'Non-invasive echocardiography, interventional cardiology consultations, and cardiac rehab.',
    summaryTa: 'இதய ஒலி வரைபடம் (Echo), இதய மருத்துவ ஆலோசனை மற்றும் மறுவாழ்வு சேவைகள்.',
    description:
      'Located on the calm second-level west wing, the Cardiology Pavilion brings diagnostics, vascular screening, and outpatient consultation suites together with zero-threshold access from the Central Atrium Elevators.',
    descriptionTa:
      'இரண்டாம் தள மேற்குப் பகுதியில் அமைந்துள்ள இதயவியல் பிரிவு, மைய மின்தூக்கிகள் வழியாக எளிதில் அணுகக்கூடிய நவீன ஆலோசனை அறைகளைக் கொண்டுள்ளது.',
    clinicalLead: 'Dr. Kavitha Ramanathan, MD, DM',
    openHours: 'Mon–Sat · 08:00 – 19:00',
    openHoursTa: 'திங்கள்–சனி · 08:00 – 19:00',
    isEmergency: false,
    accentColor: '#174C50',
    primaryDestinationId: DESTINATION_IDS.CARDIOLOGY,
    amenities: ['ECG Bay', 'Echocardiography', 'Step-free access', 'Quiet waiting lounge'],
  },
  {
    id: DEPARTMENT_IDS.NEUROLOGY,
    hospitalId: HOSPITAL_ID,
    floorId: FLOOR_IDS.L2,
    slug: 'neurology',
    code: 'NEUR-02',
    name: 'Neurology & Stroke Unit',
    nameTa: 'நரம்பியல் மற்றும் பக்கவாதப் பிரிவு',
    wing: 'Southwest Pavilion · Level 2',
    wingTa: 'தென்மேற்குப் பகுதி · தளம் 2',
    summary: 'Comprehensive headache, movement disorder, epilepsy, and rapid stroke recovery clinics.',
    summaryTa: 'நரம்பியல் கோளாறுகள், வலிப்பு மற்றும் பக்கவாத சிகிச்சைக்கான சிறப்பு மருத்துவம்.',
    description:
      'Equipped with electroencephalography suites and neuro-rehabilitation rooms adjacent to Level 1 MRI imaging for seamless patient transfers.',
    descriptionTa:
      'முதல் தள MRI பிரிவுடன் நேரடி மின்தூக்கி இணைப்பு கொண்ட நரம்பியல் மற்றும் பக்கவாத சிகிச்சைப் பிரிவு.',
    clinicalLead: 'Dr. Aravind Subramanian, MD, DM',
    openHours: 'Mon–Sat · 08:30 – 18:30',
    openHoursTa: 'திங்கள்–சனி · 08:30 – 18:30',
    isEmergency: false,
    accentColor: '#102C35',
    primaryDestinationId: DESTINATION_IDS.NEUROLOGY,
    amenities: ['EEG Lab', 'Stroke Clinic', 'Wheelchair wide doors'],
  },
  {
    id: DEPARTMENT_IDS.ORTHOPAEDICS,
    hospitalId: HOSPITAL_ID,
    floorId: FLOOR_IDS.L2,
    slug: 'orthopaedics',
    code: 'ORTH-02',
    name: 'Orthopaedics & Kinetic Rehab',
    nameTa: 'எலும்பியல் மற்றும் மூட்டு மறுவாழ்வு',
    wing: 'Southeast Pavilion · Level 2',
    wingTa: 'தென்கிழக்குப் பகுதி · தளம் 2',
    summary: 'Joint care, sports medicine, fracture follow-up, and gait physiotherapy studio.',
    summaryTa: 'மூட்டு மருத்துவம், விளையாட்டு காயங்கள், எலும்பு முறிவு மற்றும் பிசியோதெரபி.',
    description:
      'Step-free consultation suites linked directly to the East Clinical Elevators for effortless wheelchair and stretcher movement.',
    descriptionTa:
      'கிழக்கு மின்தூக்கிகளுக்கு அருகில் அமைந்துள்ள தடையற்ற எலும்பியல் மற்றும் பிசியோதெரபி மையம்.',
    clinicalLead: 'Dr. Vikramaditya Nair, MS (Ortho)',
    openHours: 'Mon–Sat · 08:00 – 20:00',
    openHoursTa: 'திங்கள்–சனி · 08:00 – 20:00',
    isEmergency: false,
    accentColor: '#B7A58A',
    primaryDestinationId: DESTINATION_IDS.ORTHOPAEDICS,
    amenities: ['Cast Room', 'Physiotherapy Studio', 'East Lift Access'],
  },
  {
    id: DEPARTMENT_IDS.GENERAL_MEDICINE,
    hospitalId: HOSPITAL_ID,
    floorId: FLOOR_IDS.L2,
    slug: 'general-medicine',
    code: 'GMED-02',
    name: 'General & Preventive Medicine',
    nameTa: 'பொது மற்றும் தடுப்பு மருத்துவம்',
    wing: 'Northeast Pavilion · Level 2',
    wingTa: 'வடகிழக்குப் பகுதி · தளம் 2',
    summary: 'Primary internal medicine, metabolic care, executive health reviews, and vaccinations.',
    summaryTa: 'முதன்மை உள்மருத்துவம், நீரிழிவு பராமரிப்பு மற்றும் முழு உடல் பரிசோதனை.',
    description:
      'Our primary consultation hub offering coordinated care across diagnostic laboratory, imaging, and specialty referrals.',
    descriptionTa:
      'பரிசோதனைக் கூடம் மற்றும் சிறப்பு மருத்துவர்களுடன் இணைந்த ஒருங்கிணைந்த பொது மருத்துவ சேவை.',
    clinicalLead: 'Dr. Meenakshi Sundaram, MD',
    openHours: 'Mon–Sun · 07:30 – 21:00',
    openHoursTa: 'திங்கள்–ஞாயிறு · 07:30 – 21:00',
    isEmergency: false,
    accentColor: '#174C50',
    primaryDestinationId: DESTINATION_IDS.GENERAL_MEDICINE,
    amenities: ['Health Checkups', 'Vaccination Suite', 'Rapid Queue'],
  },
  {
    id: DEPARTMENT_IDS.EMERGENCY,
    hospitalId: HOSPITAL_ID,
    floorId: FLOOR_IDS.L0,
    slug: 'emergency',
    code: 'EMER-00',
    name: 'Emergency & Acute Trauma',
    nameTa: 'அவசர மற்றும் அதிர்ச்சி சிகிச்சை',
    wing: 'West Ground Gate A · Level 0',
    wingTa: 'மேற்கு நுழைவு A · தரை தளம்',
    summary: '24/7 resuscitation bays, rapid triage, ambulance bay, and immediate imaging lift access.',
    summaryTa: '24/7 அவசர சிகிச்சை, ஆம்புலன்ஸ் நுழைவு மற்றும் உடனடி CT பரிசோதனை இணைப்பு.',
    description:
      'Direct ground-level ambulance ramp access on the West facade with an unencumbered emergency triage corridor and dedicated elevator priority.',
    descriptionTa:
      'மேற்குப் புற ஆம்புலன்ஸ் சாய்வு பாதை வழியாக நேரடி அணுகல் கொண்ட 24 மணி நேர அவசர சிகிச்சைப் பிரிவு.',
    clinicalLead: 'Dr. Arjun Krishnan, MD (EM)',
    openHours: '24 Hours · 7 Days',
    openHoursTa: '24 மணி நேரமும் திறந்திருக்கும்',
    isEmergency: true,
    accentColor: '#B83227',
    primaryDestinationId: DESTINATION_IDS.EMERGENCY,
    amenities: ['24/7 Resuscitation', 'Ambulance Bay', 'Zero-step Ramp'],
  },
  {
    id: DEPARTMENT_IDS.LABORATORY,
    hospitalId: HOSPITAL_ID,
    floorId: FLOOR_IDS.L1,
    slug: 'laboratory',
    code: 'LAB-01',
    name: 'Clinical Pathology & Laboratory',
    nameTa: 'மருத்துவ பரிசோதனைக் கூடம்',
    wing: 'West Diagnostics · Level 1',
    wingTa: 'மேற்குப் பகுதி · தளம் 1',
    summary: 'Phlebotomy, hematology, biochemistry, and microbiology sample collection bays.',
    summaryTa: 'இரத்தப் பரிசோதனை, உயிர்வேதியியல் மற்றும் நுண்ணுயிரியல் ஆய்வுக்கூடம்.',
    description:
      'Quiet private sample-collection cubicles with digital queue synchronization and rapid digital test notification.',
    descriptionTa:
      'தனிப்பட்ட மாதிரி சேகரிப்பு அறைகள் மற்றும் டிஜிட்டல் வரிசை கண்காணிப்பு வசதி கொண்ட ஆய்வுக்கூடம்.',
    clinicalLead: 'Dr. Shanthi Rajagopal, MD (Path)',
    openHours: 'Mon–Sun · 06:30 – 20:00',
    openHoursTa: 'திங்கள்–ஞாயிறு · 06:30 – 20:00',
    isEmergency: false,
    accentColor: '#174C50',
    primaryDestinationId: DESTINATION_IDS.LABORATORY,
    amenities: ['Fasting Lounge', 'Pediatric Phlebotomy', 'Digital Queue'],
  },
  {
    id: DEPARTMENT_IDS.RADIOLOGY,
    hospitalId: HOSPITAL_ID,
    floorId: FLOOR_IDS.L1,
    slug: 'radiology',
    code: 'RAD-01',
    name: 'Radiology & Diagnostic Imaging',
    nameTa: 'கதிரியக்கவியல் மற்றும் ஸ்கேன் மையம்',
    wing: 'Southwest Diagnostics · Level 1',
    wingTa: 'தென்மேற்குப் பகுதி · தளம் 1',
    summary: '3T MRI, low-dose CT, digital X-ray, and ultrasound imaging suites.',
    summaryTa: '3T MRI, CT ஸ்கேன், டிஜிட்டல் எக்ஸ்-ரே மற்றும் அல்ட்ராசவுண்ட் பரிசோதனைகள்.',
    description:
      'Shielded diagnostic wing featuring wide patient changing suites and calm indirect lighting prior to MRI/CT scans.',
    descriptionTa:
      'MRI மற்றும் CT ஸ்கேன் பரிசோதனைகளுக்கான அமைதியான காத்திருப்பு மற்றும் பாதுகாப்பு வசதிகள்.',
    clinicalLead: 'Dr. Deepak Venkatesh, MD (Rad)',
    openHours: 'Mon–Sun · 07:00 – 22:00',
    openHoursTa: 'திங்கள்–ஞாயிறு · 07:00 – 22:00',
    isEmergency: false,
    accentColor: '#102C35',
    primaryDestinationId: DESTINATION_IDS.RADIOLOGY,
    amenities: ['3T MRI', '128-Slice CT', 'Ultrasound', 'Accessible Changing Rooms'],
  },
  {
    id: DEPARTMENT_IDS.PHARMACY,
    hospitalId: HOSPITAL_ID,
    floorId: FLOOR_IDS.L1,
    slug: 'pharmacy',
    code: 'PHM-01',
    name: 'Central Pharmacy & Counseling',
    nameTa: 'மத்திய மருந்தகம்',
    wing: 'Southeast Pavilion · Level 1',
    wingTa: 'தென்கிழக்குப் பகுதி · தளம் 1',
    summary: 'Outpatient prescription fulfillment, clinical pharmacist counseling, and cold-chain biologics.',
    summaryTa: 'மருந்து விநியோகம் மற்றும் மருந்தாளர் ஆலோசனை மையம்.',
    description:
      'Accessible directly off the East Clinical Elevators so discharged patients and clinic visitors collect medications swiftly.',
    descriptionTa:
      'கிழக்கு மின்தூக்கிக்கு அருகில் அமைந்துள்ள மருந்தகம்; விரைவான மருந்து விநியோக வசதி.',
    clinicalLead: 'R. Lakshmi Narayanan, M.Pharm',
    openHours: '24 Hours · 7 Days',
    openHoursTa: '24 மணி நேரமும் திறந்திருக்கும்',
    isEmergency: false,
    accentColor: '#B7A58A',
    primaryDestinationId: DESTINATION_IDS.PHARMACY,
    amenities: ['24/7 Counter', 'Private Counseling Desk', 'East Lift Access'],
  },
  {
    id: DEPARTMENT_IDS.ICU,
    hospitalId: HOSPITAL_ID,
    floorId: FLOOR_IDS.L3,
    slug: 'icu',
    code: 'ICU-03',
    name: 'Intensive Care Unit (ICU)',
    nameTa: 'தீவிர சிகிச்சைப் பிரிவு (ICU)',
    wing: 'West Critical Wing · Level 3',
    wingTa: 'மேற்குப் பகுதி · தளம் 3',
    summary: 'Multidisciplinary critical care, neuro-cardiac monitoring, and scheduled family briefing room.',
    summaryTa: 'பல்துறை தீவிர சிகிச்சை மற்றும் குடும்பத்தினர் சந்திப்பு அறை.',
    description:
      'Controlled quiet critical care wing. Visitor entry passes through the Level 3 Nurse & Family Lounge with staff check-in.',
    descriptionTa:
      'பாதுகாக்கப்பட்ட தீவிர சிகிச்சைப் பிரிவு; பார்வையாளர்கள் செவிலியர் வரவேற்பு வழியாக அனுமதிக்கப்படுவர்.',
    clinicalLead: 'Dr. Sanjay Balakrishnan, MD, FNB',
    openHours: '24/7 Care · Visitor Slots 11:00 & 17:00',
    openHoursTa: '24/7 சிகிச்சை · பார்வையாளர் நேரம் 11:00 & 17:00',
    isEmergency: false,
    accentColor: '#B83227',
    primaryDestinationId: DESTINATION_IDS.ICU,
    amenities: ['Family Briefing Suite', 'Controlled Access', 'Nurse Concierge'],
  },
  {
    id: DEPARTMENT_IDS.INPATIENT,
    hospitalId: HOSPITAL_ID,
    floorId: FLOOR_IDS.L3,
    slug: 'inpatient-wards',
    code: 'WARD-03',
    name: 'Inpatient Recovery Suites',
    nameTa: 'உள்நோயாளி சிகிச்சை அறைகள்',
    wing: 'East Terrace Wing · Level 3',
    wingTa: 'கிழக்குப் பகுதி · தளம் 3',
    summary: 'Daylight-filled single recovery rooms, step-down surgical wards, and attendant lounges.',
    summaryTa: 'தனியார் சிகிச்சை அறைகள் மற்றும் உதவியாளர் ஓய்வறைகள்.',
    description:
      'Acoustic recovery rooms overlooking the campus garden terrace with direct East Clinical Elevator transport.',
    descriptionTa:
      'இயற்கை வெளிச்சமும் அமைதியும் கொண்ட உள்நோயாளி சிகிச்சை அறைகள்.',
    clinicalLead: 'Matron Grace Selvaraj, MSc Nursing',
    openHours: '24/7 Inpatient Care · Visiting 09:00 – 20:00',
    openHoursTa: '24/7 பராமரிப்பு · பார்வையாளர் நேரம் 09:00 – 20:00',
    isEmergency: false,
    accentColor: '#174C50',
    primaryDestinationId: DESTINATION_IDS.INPATIENT_WARDS,
    amenities: ['Private Suites', 'Attendant Lounge', 'East Lift Core'],
  },
];

export const SAMPLE_DESTINATIONS: Destination[] = [
  { id: DESTINATION_IDS.MAIN_ENTRANCE, hospitalId: HOSPITAL_ID, floorId: FLOOR_IDS.L0, slug: 'main-entrance', name: 'Main Entrance', nameTa: 'பிரதான நுழைவாயில்', roomCode: 'G-01', category: 'entrance', description: 'South architectural canopy drop-off, valet bay, and step-free automatic doors.', descriptionTa: 'தெற்கு பிரதான நுழைவு மற்றும் சக்கர நாற்காலி அணுகல் பாதை.', nodeId: NODE_IDS.L0_ENTRANCE, zone: { x: 420, y: 520, width: 160, height: 60, accentHex: '#174C50' }, isAccessible: true, isEmergency: false, isSearchable: true },
  { id: DESTINATION_IDS.RECEPTION, hospitalId: HOSPITAL_ID, floorId: FLOOR_IDS.L0, slug: 'reception', name: 'Central Reception', nameTa: 'மைய வரவேற்பு', roomCode: 'G-02', category: 'reception', description: 'Patient registration, appointment check-in, and visitor passes.', descriptionTa: 'நோயாளர் பதிவு மற்றும் வருகையாளர் அனுமதி மேசை.', nodeId: NODE_IDS.L0_RECEPTION, zone: { x: 430, y: 390, width: 140, height: 80, accentHex: '#102C35' }, isAccessible: true, isEmergency: false, isSearchable: true },
  { id: DESTINATION_IDS.HELP_DESK, hospitalId: HOSPITAL_ID, floorId: FLOOR_IDS.L0, slug: 'help-desk', name: 'Help Desk & Wheelchair Concierge', nameTa: 'உதவி மையம் & சக்கர நாற்காலி சேவை', roomCode: 'G-03', category: 'help_desk', description: 'Wheelchair dispatch, Tamil/English language assistance, and printed route cards.', descriptionTa: 'சக்கர நாற்காலி உதவி மற்றும் மொழிபெயர்ப்பு சேவை மையம்.', nodeId: NODE_IDS.L0_HELP_DESK, zone: { x: 280, y: 390, width: 120, height: 80, accentHex: '#B7A58A' }, isAccessible: true, isEmergency: false, isSearchable: true },
  { id: DESTINATION_IDS.EMERGENCY, hospitalId: HOSPITAL_ID, floorId: FLOOR_IDS.L0, departmentId: DEPARTMENT_IDS.EMERGENCY, slug: 'emergency', name: 'Emergency & Trauma Center', nameTa: 'அவசர சிகிச்சைப் பிரிவு', roomCode: 'G-ER', category: 'emergency', description: '24/7 acute emergency care, rapid triage, and ambulance ramp bay.', descriptionTa: '24/7 அவசர மருத்துவம் மற்றும் ஆம்புலன்ஸ் நுழைவுப் பிரிவு.', nodeId: NODE_IDS.L0_EMERGENCY, zone: { x: 60, y: 400, width: 170, height: 160, accentHex: '#B83227' }, isAccessible: true, isEmergency: true, isSearchable: true },
  { id: DESTINATION_IDS.BILLING, hospitalId: HOSPITAL_ID, floorId: FLOOR_IDS.L0, slug: 'billing', name: 'Billing & Insurance Lounge', nameTa: 'கட்டணம் மற்றும் காப்பீட்டுப் பிரிவு', roomCode: 'G-05', category: 'billing', description: 'Outpatient billing, cashless insurance pre-authorization, and discharge clearance.', descriptionTa: 'மருத்துவக் கட்டணம் மற்றும் காப்பீட்டு ஒப்புதல் மையம்.', nodeId: NODE_IDS.L0_BILLING, zone: { x: 680, y: 390, width: 150, height: 110, accentHex: '#858B88' }, isAccessible: true, isEmergency: false, isSearchable: true },
  { id: DESTINATION_IDS.CAFETERIA, hospitalId: HOSPITAL_ID, floorId: FLOOR_IDS.L0, slug: 'cafeteria', name: 'Garden Terrace Cafeteria', nameTa: 'தோட்ட உணவகம்', roomCode: 'G-CAFE', category: 'amenity', description: 'Warm meals, herbal teas, and tranquil sunlit garden seating for families.', descriptionTa: 'சத்தான உணவு மற்றும் அமைதியான தோட்ட இருக்கை வசதி.', nodeId: NODE_IDS.L0_CAFETERIA, zone: { x: 790, y: 80, width: 150, height: 150, accentHex: '#B7A58A' }, isAccessible: true, isEmergency: false, isSearchable: true },
  { id: DESTINATION_IDS.RESTROOMS_L0, hospitalId: HOSPITAL_ID, floorId: FLOOR_IDS.L0, slug: 'restrooms-l0', name: 'Restrooms (Ground Level)', nameTa: 'கழிப்பறைகள் (தரை தளம்)', roomCode: 'G-WC', category: 'restroom', description: 'Accessible family and visitor restrooms along the North Concourse.', descriptionTa: 'மாற்றுத்திறனாளி வசதியுடன் கூடிய தரைத்தள கழிப்பறைகள்.', nodeId: NODE_IDS.L0_RESTROOMS, zone: { x: 290, y: 80, width: 100, height: 85, accentHex: '#858B88' }, isAccessible: true, isEmergency: false, isSearchable: true },
  { id: DESTINATION_IDS.ELEVATORS_L0, hospitalId: HOSPITAL_ID, floorId: FLOOR_IDS.L0, slug: 'elevators', name: 'Central Atrium Elevators', nameTa: 'மைய மின்தூக்கிகள்', roomCode: 'ELV-A', category: 'amenity', description: 'High-capacity accessible passenger elevators serving Floors L0 through L3.', descriptionTa: 'அனைத்து தளங்களுக்கும் செல்லும் பெரிய மின்தூக்கிகள்.', nodeId: NODE_IDS.L0_ELV_A, zone: { x: 478, y: 168, width: 44, height: 44, accentHex: '#102C35' }, isAccessible: true, isEmergency: false, isSearchable: true },
  { id: DESTINATION_IDS.STAIRCASE_L0, hospitalId: HOSPITAL_ID, floorId: FLOOR_IDS.L0, slug: 'staircases', name: 'West Architectural Staircase', nameTa: 'மேற்குப் படிக்கட்டுகள்', roomCode: 'STR-W', category: 'amenity', description: 'Daylit stairwell connecting L0–L3 along the West Pavilion (not wheelchair accessible).', descriptionTa: 'தரை தளம் முதல் மூன்றாம் தளம் வரை இணைக்கும் படிக்கட்டுகள்.', nodeId: NODE_IDS.L0_STAIR_W, zone: { x: 158, y: 158, width: 44, height: 44, accentHex: '#B7A58A' }, isAccessible: false, isEmergency: false, isSearchable: true },
  { id: DESTINATION_IDS.LABORATORY, hospitalId: HOSPITAL_ID, floorId: FLOOR_IDS.L1, departmentId: DEPARTMENT_IDS.LABORATORY, slug: 'laboratory', name: 'Clinical Laboratory', nameTa: 'மருத்துவ பரிசோதனைக் கூடம்', roomCode: '102', category: 'diagnostics', description: 'Blood collection, pathology panels, and diagnostic drop-off.', descriptionTa: 'இரத்தப் பரிசோதனை மற்றும் மாதிரி சேகரிப்பு மையம்.', nodeId: NODE_IDS.L1_LAB, zone: { x: 70, y: 240, width: 190, height: 145, accentHex: '#174C50' }, isAccessible: true, isEmergency: false, isSearchable: true },
  { id: DESTINATION_IDS.RADIOLOGY, hospitalId: HOSPITAL_ID, floorId: FLOOR_IDS.L1, departmentId: DEPARTMENT_IDS.RADIOLOGY, slug: 'radiology', name: 'Radiology & MRI', nameTa: 'கதிரியக்கவியல் & MRI', roomCode: '108', category: 'diagnostics', description: '3T MRI, CT scan, digital X-ray, and ultrasound diagnostics.', descriptionTa: 'MRI, CT ஸ்கேன், எக்ஸ்-ரே மற்றும் அல்ட்ராசவுண்ட் பிரிவு.', nodeId: NODE_IDS.L1_RADIOLOGY, zone: { x: 70, y: 405, width: 230, height: 155, accentHex: '#102C35' }, isAccessible: true, isEmergency: false, isSearchable: true },
  { id: DESTINATION_IDS.PHARMACY, hospitalId: HOSPITAL_ID, floorId: FLOOR_IDS.L1, departmentId: DEPARTMENT_IDS.PHARMACY, slug: 'pharmacy', name: 'Central Pharmacy', nameTa: 'மத்திய மருந்தகம்', roomCode: '115', category: 'pharmacy', description: '24/7 prescription counter and clinical medication guidance.', descriptionTa: '24 மணி நேர மருந்து விநியோக மையம்.', nodeId: NODE_IDS.L1_PHARMACY, zone: { x: 680, y: 390, width: 155, height: 145, accentHex: '#B7A58A' }, isAccessible: true, isEmergency: false, isSearchable: true },
  { id: DESTINATION_IDS.RESTROOMS_L1, hospitalId: HOSPITAL_ID, floorId: FLOOR_IDS.L1, slug: 'restrooms-l1', name: 'Restrooms (Level 1)', nameTa: 'கழிப்பறைகள் (தளம் 1)', roomCode: '1-WC', category: 'restroom', description: 'Accessible visitor restrooms near Diagnostics North Gallery.', descriptionTa: 'முதல் தள வடக்கு நடைபாதை கழிப்பறைகள்.', nodeId: NODE_IDS.L1_RESTROOMS, zone: { x: 290, y: 80, width: 100, height: 85, accentHex: '#858B88' }, isAccessible: true, isEmergency: false, isSearchable: true },
  { id: DESTINATION_IDS.CARDIOLOGY, hospitalId: HOSPITAL_ID, floorId: FLOOR_IDS.L2, departmentId: DEPARTMENT_IDS.CARDIOLOGY, slug: 'cardiology', name: 'Cardiology Suites', nameTa: 'இதயவியல் பிரிவு', roomCode: '204', category: 'clinical', description: 'Cardiology consultation suites, ECG, and Echocardiography bays.', descriptionTa: 'இதயவியல் ஆலோசனை மற்றும் எக்கோ பரிசோதனை அறைகள்.', nodeId: NODE_IDS.L2_CARDIOLOGY, zone: { x: 70, y: 240, width: 200, height: 150, accentHex: '#102C35' }, isAccessible: true, isEmergency: false, isSearchable: true },
  { id: DESTINATION_IDS.NEUROLOGY, hospitalId: HOSPITAL_ID, floorId: FLOOR_IDS.L2, departmentId: DEPARTMENT_IDS.NEUROLOGY, slug: 'neurology', name: 'Neurology & Stroke Clinic', nameTa: 'நரம்பியல் பிரிவு', roomCode: '209', category: 'clinical', description: 'Neurology outpatient clinic, EEG lab, and stroke follow-up.', descriptionTa: 'நரம்பியல் ஆலோசனை மற்றும் EEG ஆய்வகம்.', nodeId: NODE_IDS.L2_NEUROLOGY, zone: { x: 70, y: 410, width: 220, height: 150, accentHex: '#174C50' }, isAccessible: true, isEmergency: false, isSearchable: true },
  { id: DESTINATION_IDS.ORTHOPAEDICS, hospitalId: HOSPITAL_ID, floorId: FLOOR_IDS.L2, departmentId: DEPARTMENT_IDS.ORTHOPAEDICS, slug: 'orthopaedics', name: 'Orthopaedics & Rehab', nameTa: 'எலும்பியல் மற்றும் மறுவாழ்வு', roomCode: '214', category: 'clinical', description: 'Joint clinic, cast bay, and physiotherapy movement studio.', descriptionTa: 'எலும்பியல் ஆலோசனை மற்றும் பிசியோதெரபி மையம்.', nodeId: NODE_IDS.L2_ORTHOPAEDICS, zone: { x: 675, y: 390, width: 165, height: 155, accentHex: '#B7A58A' }, isAccessible: true, isEmergency: false, isSearchable: true },
  { id: DESTINATION_IDS.GENERAL_MEDICINE, hospitalId: HOSPITAL_ID, floorId: FLOOR_IDS.L2, departmentId: DEPARTMENT_IDS.GENERAL_MEDICINE, slug: 'general-medicine', name: 'General Medicine Wing', nameTa: 'பொது மருத்துவப் பிரிவு', roomCode: '218', category: 'clinical', description: 'Internal medicine consultation suites and preventive wellness reviews.', descriptionTa: 'பொது மருத்துவம் மற்றும் தடுப்பு சுகாதாரப் பிரிவு.', nodeId: NODE_IDS.L2_GENERAL_MED, zone: { x: 680, y: 85, width: 230, height: 150, accentHex: '#174C50' }, isAccessible: true, isEmergency: false, isSearchable: true },
  { id: DESTINATION_IDS.RESTROOMS_L2, hospitalId: HOSPITAL_ID, floorId: FLOOR_IDS.L2, slug: 'restrooms-l2', name: 'Restrooms (Level 2)', nameTa: 'கழிப்பறைகள் (தளம் 2)', roomCode: '2-WC', category: 'restroom', description: 'Accessible visitor restrooms near Specialist North Gallery.', descriptionTa: 'இரண்டாம் தள கழிப்பறைகள்.', nodeId: NODE_IDS.L2_RESTROOMS, zone: { x: 290, y: 80, width: 100, height: 85, accentHex: '#858B88' }, isAccessible: true, isEmergency: false, isSearchable: true },
  { id: DESTINATION_IDS.ICU, hospitalId: HOSPITAL_ID, floorId: FLOOR_IDS.L3, departmentId: DEPARTMENT_IDS.ICU, slug: 'icu', name: 'Intensive Care Unit (ICU)', nameTa: 'தீவிர சிகிச்சைப் பிரிவு (ICU)', roomCode: '301', category: 'critical_care', description: 'Critical care beds and scheduled family briefing room.', descriptionTa: 'தீவிர சிகிச்சைப் பிரிவு மற்றும் குடும்பத்தினர் காத்திருப்பு அறை.', nodeId: NODE_IDS.L3_ICU, zone: { x: 70, y: 245, width: 250, height: 290, accentHex: '#B83227' }, isAccessible: true, isEmergency: false, isSearchable: true },
  { id: DESTINATION_IDS.INPATIENT_WARDS, hospitalId: HOSPITAL_ID, floorId: FLOOR_IDS.L3, departmentId: DEPARTMENT_IDS.INPATIENT, slug: 'inpatient-wards', name: 'Inpatient Wards & Suites', nameTa: 'உள்நோயாளி வார்டுகள்', roomCode: '310–328', category: 'inpatient', description: 'Private inpatient suites, surgical recovery bays, and attendant lounges.', descriptionTa: 'உள்நோயாளி தனியார் அறைகள் மற்றும் பராமரிப்புப் பிரிவு.', nodeId: NODE_IDS.L3_WARDS, zone: { x: 660, y: 185, width: 260, height: 345, accentHex: '#174C50' }, isAccessible: true, isEmergency: false, isSearchable: true },
  { id: DESTINATION_IDS.RESTROOMS_L3, hospitalId: HOSPITAL_ID, floorId: FLOOR_IDS.L3, slug: 'restrooms-l3', name: 'Restrooms (Level 3)', nameTa: 'கழிப்பறைகள் (தளம் 3)', roomCode: '3-WC', category: 'restroom', description: 'Accessible family & visitor restrooms near Critical Care North Gallery.', descriptionTa: 'மூன்றாம் தள கழிப்பறைகள்.', nodeId: NODE_IDS.L3_RESTROOMS, zone: { x: 290, y: 80, width: 100, height: 85, accentHex: '#858B88' }, isAccessible: true, isEmergency: false, isSearchable: true },
];

export const SAMPLE_QR_CHECKPOINTS: QrCheckpoint[] = [
  { id: 'c0000000-0000-4000-8000-000000000001', hospitalId: HOSPITAL_ID, floorId: FLOOR_IDS.L0, nodeId: NODE_IDS.L0_ENTRANCE, code: 'MP-QR-ENTRANCE', label: 'South Main Entrance Totem', labelTa: 'பிரதான நுழைவாயில் QR முனையம்', locationHint: 'Inside South Canopy Automatic Doors', locationHintTa: 'தெற்கு பிரதான கதவு உட்புறம்', isActive: true, createdAt: '2026-01-05T08:00:00.000Z' },
  { id: 'c0000000-0000-4000-8000-000000000002', hospitalId: HOSPITAL_ID, floorId: FLOOR_IDS.L0, nodeId: NODE_IDS.L0_RECEPTION, code: 'MP-QR-RECEPTION', label: 'Central Reception Kiosk', labelTa: 'மைய வரவேற்பு QR முனையம்', locationHint: 'Main Atrium Registration Desk', locationHintTa: 'மைய வரவேற்பு மேசை அருகில்', isActive: true, createdAt: '2026-01-05T08:00:00.000Z' },
  { id: 'c0000000-0000-4000-8000-000000000003', hospitalId: HOSPITAL_ID, floorId: FLOOR_IDS.L0, nodeId: NODE_IDS.L0_ELV_A, code: 'MP-QR-LIFT-L0', label: 'Central Atrium Elevators L0', labelTa: 'மைய மின்தூக்கி L0 QR முனையம்', locationHint: 'Atrium Core Elevator Lobby', locationHintTa: 'மைய மின்தூக்கி காத்திருப்பு இடம்', isActive: true, createdAt: '2026-01-05T08:00:00.000Z' },
  { id: 'c0000000-0000-4000-8000-000000000004', hospitalId: HOSPITAL_ID, floorId: FLOOR_IDS.L1, nodeId: NODE_IDS.L1_LAB, code: 'MP-QR-L1-LAB', label: 'Level 1 Diagnostics Junction', labelTa: 'முதல் தளம் பரிசோதனைக்கூட QR முனையம்', locationHint: 'Outside Clinical Laboratory Entrance', locationHintTa: 'ஆய்வுக்கூட நுழைவாயில் அருகில்', isActive: true, createdAt: '2026-01-05T08:00:00.000Z' },
  { id: 'c0000000-0000-4000-8000-000000000005', hospitalId: HOSPITAL_ID, floorId: FLOOR_IDS.L2, nodeId: NODE_IDS.L2_CARDIOLOGY, code: 'MP-QR-L2-CARDIO', label: 'Level 2 Cardiology Check-In', labelTa: 'இரண்டாம் தளம் இதயவியல் QR முனையம்', locationHint: 'West Pavilion Suite 204', locationHintTa: 'மேற்குப் பகுதி அறை 204', isActive: true, createdAt: '2026-01-05T08:00:00.000Z' },
];

export const DOCTOR_IDS = {
  KAVITHA: '77777777-7777-4777-8777-777777777701',
  ARAVIND: '77777777-7777-4777-8777-777777777702',
  VIKRAM: '77777777-7777-4777-8777-777777777703',
  MEENAKSHI: '77777777-7777-4777-8777-777777777704',
  ARJUN: '77777777-7777-4777-8777-777777777705',
  SANJAY: '77777777-7777-4777-8777-777777777706',
} as const;

export const SAMPLE_DOCTORS: Doctor[] = [
  { id: DOCTOR_IDS.KAVITHA, hospitalId: HOSPITAL_ID, departmentId: DEPARTMENT_IDS.CARDIOLOGY, destinationId: DESTINATION_IDS.CARDIOLOGY, slug: 'dr-kavitha-ramanathan', fullName: 'Dr. Kavitha Ramanathan', fullNameTa: 'டாக்டர் கவிதா ராமநாதன்', title: 'Senior Consultant & Lead Cardiologist', titleTa: 'மூத்த இதயவியல் ஆலோசகர்', specialty: 'Interventional Cardiology & Heart Failure', specialtyTa: 'இதயவியல் மற்றும் இதய செயலிழப்பு சிகிச்சை', qualifications: 'MBBS, MD (General Medicine), DM (Cardiology)', languages: ['English', 'Tamil'], experienceYears: 16, consultationFee: 900, bio: 'Specializes in preventive coronary assessment, structural echocardiography, and patient-centered cardiac recovery planning.', bioTa: 'இதய ஒலி வரைபடம் மற்றும் இதய நோய் தடுப்பு சிகிச்சையில் 16 ஆண்டுகள் அனுபவம் கொண்டவர்.', isActive: true, portraitInitials: 'KR' },
  { id: DOCTOR_IDS.ARAVIND, hospitalId: HOSPITAL_ID, departmentId: DEPARTMENT_IDS.NEUROLOGY, destinationId: DESTINATION_IDS.NEUROLOGY, slug: 'dr-aravind-subramanian', fullName: 'Dr. Aravind Subramanian', fullNameTa: 'டாக்டர் அரவிந்த் சுப்பிரமணியன்', title: 'Head of Neurosciences & Stroke', titleTa: 'நரம்பியல் துறைத் தலைவர்', specialty: 'Stroke Medicine & Movement Disorders', specialtyTa: 'பக்கவாத சிகிச்சை மற்றும் நரம்பியல்', qualifications: 'MBBS, MD, DM (Neurology)', languages: ['English', 'Tamil'], experienceYears: 14, consultationFee: 950, bio: 'Directs the acute stroke pathway and outpatient migraine and epilepsy rehabilitation clinics.', bioTa: 'பக்கவாத அவசர சிகிச்சை மற்றும் நரம்பியல் மறுவாழ்வுப் பிரிவை வழிநடத்துபவர்.', isActive: true, portraitInitials: 'AS' },
  { id: DOCTOR_IDS.VIKRAM, hospitalId: HOSPITAL_ID, departmentId: DEPARTMENT_IDS.ORTHOPAEDICS, destinationId: DESTINATION_IDS.ORTHOPAEDICS, slug: 'dr-vikramaditya-nair', fullName: 'Dr. Vikramaditya Nair', fullNameTa: 'டாக்டர் விக்ரமாதித்யா நாயர்', title: 'Consultant Orthopaedic & Joint Surgeon', titleTa: 'எலும்பியல் மற்றும் மூட்டு அறுவை சிகிச்சை நிபுணர்', specialty: 'Joint Preservation & Sports Orthopaedics', specialtyTa: 'மூட்டு பாதுகாப்பு மற்றும் விளையாட்டு மருத்துவம்', qualifications: 'MBBS, MS (Orthopaedics), Fellowship in Arthroplasty', languages: ['English', 'Tamil', 'Malayalam'], experienceYears: 12, consultationFee: 850, bio: 'Focuses on minimally invasive ligament reconstruction, gait mechanics, and structured physiotherapy recovery.', bioTa: 'மூட்டு மற்றும் தசைநார் அறுவை சிகிச்சை மற்றும் பிசியோதெரபி மறுவாழ்வில் நிபுணர்.', isActive: true, portraitInitials: 'VN' },
  { id: DOCTOR_IDS.MEENAKSHI, hospitalId: HOSPITAL_ID, departmentId: DEPARTMENT_IDS.GENERAL_MEDICINE, destinationId: DESTINATION_IDS.GENERAL_MEDICINE, slug: 'dr-meenakshi-sundaram', fullName: 'Dr. Meenakshi Sundaram', fullNameTa: 'டாக்டர் மீனாட்சி சுந்தரம்', title: 'Lead Physician — Internal Medicine', titleTa: 'முதன்மை பொது மருத்துவ ஆலோசகர்', specialty: 'Internal & Metabolic Medicine', specialtyTa: 'உள்மருத்துவம் மற்றும் நீரிழிவு பராமரிப்பு', qualifications: 'MBBS, MD (Internal Medicine)', languages: ['English', 'Tamil'], experienceYears: 19, consultationFee: 650, bio: 'Leads holistic primary care, diabetes and hypertension optimization, and multi-specialty diagnostic coordination.', bioTa: 'முதன்மை பொது மருத்துவம், நீரிழிவு மற்றும் இரத்த அழுத்தப் பராமரிப்பில் 19 ஆண்டு அனுபவம்.', isActive: true, portraitInitials: 'MS' },
  { id: DOCTOR_IDS.ARJUN, hospitalId: HOSPITAL_ID, departmentId: DEPARTMENT_IDS.EMERGENCY, destinationId: DESTINATION_IDS.EMERGENCY, slug: 'dr-arjun-krishnan', fullName: 'Dr. Arjun Krishnan', fullNameTa: 'டாக்டர் அர்ஜுன் கிருஷ்ணன்', title: 'Director of Emergency Medicine', titleTa: 'அவசர சிகிச்சைத் துறை இயக்குநர்', specialty: 'Acute Trauma & Rapid Triage', specialtyTa: 'அவசர அதிர்ச்சி சிகிச்சை', qualifications: 'MBBS, MD (Emergency Medicine)', languages: ['English', 'Tamil'], experienceYears: 11, consultationFee: 700, bio: 'Coordinates 24/7 resuscitation protocols and rapid trauma transfer between West Gate A and Level 1 CT imaging.', bioTa: '24/7 அவசர சிகிச்சை மற்றும் விரைவு CT பரிசோதனை ஒருங்கிணைப்பாளர்.', isActive: true, portraitInitials: 'AK' },
  { id: DOCTOR_IDS.SANJAY, hospitalId: HOSPITAL_ID, departmentId: DEPARTMENT_IDS.ICU, destinationId: DESTINATION_IDS.ICU, slug: 'dr-sanjay-balakrishnan', fullName: 'Dr. Sanjay Balakrishnan', fullNameTa: 'டாக்டர் சஞ்சய் பாலகிருஷ்ணன்', title: 'Chief Intensivist', titleTa: 'தீவிர சிகிச்சைப் பிரிவுத் தலைவர்', specialty: 'Critical Care & Respiratory Support', specialtyTa: 'தீவிர சிகிச்சை மற்றும் சுவாசப் பராமரிப்பு', qualifications: 'MBBS, MD, FNB (Critical Care)', languages: ['English', 'Tamil'], experienceYears: 15, consultationFee: 1000, bio: 'Leads multidisciplinary ICU rounds and structured daily family communication conferences.', bioTa: 'தீவிர சிகிச்சைப் பிரிவு கண்காணிப்பு மற்றும் குடும்பத்தினர் ஆலோசனைத் தலைவர்.', isActive: true, portraitInitials: 'SB' },
];

const schedUuid = (n: number) => `d0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

export const SAMPLE_DOCTOR_SCHEDULES: DoctorSchedule[] = [
  { id: schedUuid(1), doctorId: DOCTOR_IDS.KAVITHA, dayOfWeek: 1, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30, roomLabel: 'Suite 204-A', isAvailable: true },
  { id: schedUuid(2), doctorId: DOCTOR_IDS.KAVITHA, dayOfWeek: 3, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30, roomLabel: 'Suite 204-A', isAvailable: true },
  { id: schedUuid(3), doctorId: DOCTOR_IDS.KAVITHA, dayOfWeek: 5, startTime: '14:00', endTime: '18:00', slotDurationMinutes: 30, roomLabel: 'Suite 204-A', isAvailable: true },
  { id: schedUuid(4), doctorId: DOCTOR_IDS.ARAVIND, dayOfWeek: 2, startTime: '09:30', endTime: '13:30', slotDurationMinutes: 30, roomLabel: 'Suite 209-B', isAvailable: true },
  { id: schedUuid(5), doctorId: DOCTOR_IDS.ARAVIND, dayOfWeek: 4, startTime: '10:00', endTime: '14:00', slotDurationMinutes: 30, roomLabel: 'Suite 209-B', isAvailable: true },
  { id: schedUuid(6), doctorId: DOCTOR_IDS.VIKRAM, dayOfWeek: 1, startTime: '10:00', endTime: '14:00', slotDurationMinutes: 30, roomLabel: 'Suite 214-A', isAvailable: true },
  { id: schedUuid(7), doctorId: DOCTOR_IDS.VIKRAM, dayOfWeek: 4, startTime: '15:00', endTime: '19:00', slotDurationMinutes: 30, roomLabel: 'Suite 214-A', isAvailable: true },
  { id: schedUuid(8), doctorId: DOCTOR_IDS.MEENAKSHI, dayOfWeek: 1, startTime: '08:30', endTime: '12:30', slotDurationMinutes: 20, roomLabel: 'Suite 218-C', isAvailable: true },
  { id: schedUuid(9), doctorId: DOCTOR_IDS.MEENAKSHI, dayOfWeek: 2, startTime: '08:30', endTime: '12:30', slotDurationMinutes: 20, roomLabel: 'Suite 218-C', isAvailable: true },
  { id: schedUuid(10), doctorId: DOCTOR_IDS.MEENAKSHI, dayOfWeek: 5, startTime: '08:30', endTime: '12:30', slotDurationMinutes: 20, roomLabel: 'Suite 218-C', isAvailable: true },
  { id: schedUuid(11), doctorId: DOCTOR_IDS.MEENAKSHI, dayOfWeek: 6, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 20, roomLabel: 'Suite 218-C', isAvailable: true },
  { id: schedUuid(12), doctorId: DOCTOR_IDS.ARJUN, dayOfWeek: 0, startTime: '08:00', endTime: '16:00', slotDurationMinutes: 30, roomLabel: 'ER Triage Bay 1', isAvailable: true },
  { id: schedUuid(13), doctorId: DOCTOR_IDS.SANJAY, dayOfWeek: 3, startTime: '11:00', endTime: '13:00', slotDurationMinutes: 30, roomLabel: 'ICU Briefing 301', isAvailable: true },
];

export const SAMPLE_SERVICES: HospitalServiceItem[] = [
  { id: 'e0000000-0000-4000-8000-000000000001', hospitalId: HOSPITAL_ID, departmentId: DEPARTMENT_IDS.LABORATORY, destinationId: DESTINATION_IDS.LABORATORY, slug: 'diagnostic-laboratory-panels', name: 'Diagnostic Laboratory & Phlebotomy', nameTa: 'ஆய்வக இரத்தப் பரிசோதனைகள்', category: 'diagnostic', summary: 'Fasting metabolic panels, hematology, thyroid, and cardiac biomarker testing on Level 1.', summaryTa: 'தளம் 1-இல் விரைவான இரத்தப் பரிசோதனை மற்றும் மாதிரி சேகரிப்பு.', details: 'Patients with pre-booked orders may check in at QR Checkpoint MP-QR-L1-LAB for priority phlebotomy cubicle assignment.', detailsTa: 'முன்பதிவு செய்த நோயாளர்கள் MP-QR-L1-LAB வழியாக முன்னுரிமை டோக்கன் பெறலாம்.', preparationNotes: '8–10 hours fasting required for lipid and fasting glucose panels; plain water permitted.', preparationNotesTa: 'சர்க்கரை மற்றும் கொழுப்பு பரிசோதனைக்கு 8–10 மணி நேர வெறும் வயிறு அவசியம்.', availability: 'Daily · 06:30 – 20:00', availabilityTa: 'தினமும் · 06:30 – 20:00', turnaroundEstimate: '2–4 hours digital report' },
  { id: 'e0000000-0000-4000-8000-000000000002', hospitalId: HOSPITAL_ID, departmentId: DEPARTMENT_IDS.RADIOLOGY, destinationId: DESTINATION_IDS.RADIOLOGY, slug: 'mri-ct-imaging-suite', name: '3T MRI & Low-Dose CT Imaging', nameTa: '3T MRI மற்றும் CT ஸ்கேன் சேவை', category: 'diagnostic', summary: 'High-resolution neuro, cardiac, and orthopaedic imaging with step-free stretcher access.', summaryTa: 'மூளை, இதயம் மற்றும் எலும்பு மூட்டுகளுக்கான துல்லியமான ஸ்கேன் பரிசோதனை.', details: 'Includes quiet preparation bays and dedicated accessible changing suites adjacent to West Imaging Corridor.', detailsTa: 'சக்கர நாற்காலி வசதியுடன் கூடிய தனி உடை மாற்றும் அறைகள் மற்றும் அமைதியான காத்திருப்பு இடம்.', preparationNotes: 'Remove metallic jewelry; inform staff of implants or contrast allergies prior to scan.', preparationNotesTa: 'உலோக ஆபரணங்களை அகற்றவும்; ஒவ்வாமை அல்லது உள்வைப்புகள் இருந்தால் முன்பே தெரிவிக்கவும்.', availability: 'Daily · 07:00 – 22:00 (24/7 Emergency CT)', availabilityTa: 'தினமும் · 07:00 – 22:00', turnaroundEstimate: 'Same-day radiologist review' },
  { id: 'e0000000-0000-4000-8000-000000000003', hospitalId: HOSPITAL_ID, departmentId: DEPARTMENT_IDS.PHARMACY, destinationId: DESTINATION_IDS.PHARMACY, slug: '24-hour-pharmacy-dispensary', name: '24/7 Clinical Pharmacy Dispensary', nameTa: '24 மணி நேர மருந்தகம்', category: 'pharmacy', summary: 'Outpatient prescriptions, dosage counseling in English & Tamil, and discharge medicine packs.', summaryTa: 'மருந்து விநியோகம் மற்றும் தமிழ்/ஆங்கிலத்தில் மருந்து பயன்பாட்டு வழிகாட்டல்.', details: 'Located directly off the East Clinical Elevators on Level 1 to minimize walking after clinic visits.', detailsTa: 'கிழக்கு மின்தூக்கிகளுக்கு அருகில் தளம் 1-இல் அமைந்துள்ளது.', preparationNotes: 'Bring your consultation summary or digital prescription reference.', preparationNotesTa: 'மருத்துவர் பரிந்துரைச் சீட்டு அல்லது டிஜிட்டல் குறிப்பை எடுத்து வரவும்.', availability: 'Open 24 Hours', availabilityTa: '24 மணி நேரமும் திறந்திருக்கும்', turnaroundEstimate: '10–15 min counter fulfillment' },
  { id: 'e0000000-0000-4000-8000-000000000004', hospitalId: HOSPITAL_ID, destinationId: DESTINATION_IDS.HELP_DESK, slug: 'wheelchair-escort-assistance', name: 'Wheelchair & Patient Escort Service', nameTa: 'சக்கர நாற்காலி & வழிகாட்டி உதவி', category: 'support', summary: 'Complimentary porter escort and wheelchair assistance from Main Entrance or Emergency Gate.', summaryTa: 'பிரதான நுழைவாயிலிலிருந்து இலவச சக்கர நாற்காலி மற்றும் பணியாளர் உதவி.', details: 'Request assistance online before arrival or at the Ground Atrium Help Desk for seamless clinic transfers across floors.', detailsTa: 'மருத்துவமனைக்கு வரும் முன்போ அல்லது உதவி மையத்திலோ உடனடியாக முன்பதிவு செய்யலாம்.', preparationNotes: 'Specify your arrival entrance and target department when submitting a request.', preparationNotesTa: 'நீங்கள் வரும் நுழைவாயில் மற்றும் செல்ல வேண்டிய துறையைக் குறிப்பிடவும்.', availability: '24 Hours · Ground Atrium Dispatch', availabilityTa: '24 மணி நேரமும்', turnaroundEstimate: 'Within 5 minutes at Ground Atrium' },
  { id: 'e0000000-0000-4000-8000-000000000005', hospitalId: HOSPITAL_ID, destinationId: DESTINATION_IDS.BILLING, slug: 'billing-insurance-concierge', name: 'Billing & Cashless Insurance Desk', nameTa: 'கட்டணம் & காப்பீட்டு உதவி மையம்', category: 'billing', summary: 'Transparent itemized billing, insurance pre-authorization, and rapid discharge settlement.', summaryTa: 'மருத்துவக் கட்டண விவரங்கள் மற்றும் காப்பீட்டு ஒப்புதல் சேவை.', details: 'Located on the Ground Concourse East Wing with private consultation counters.', detailsTa: 'தரை தளம் கிழக்குப் பகுதியில் தனிப்பட்ட ஆலோசனை மையங்கள் உள்ளன.', preparationNotes: 'Carry valid photo ID and insurer policy card for pre-authorization.', preparationNotesTa: 'அடையாள அட்டை மற்றும் காப்பீட்டு அட்டையை எடுத்து வரவும்.', availability: 'Mon–Sat · 07:30 – 20:30', availabilityTa: 'திங்கள்–சனி · 07:30 – 20:30', turnaroundEstimate: '15 min outpatient clearance' },
  { id: 'e0000000-0000-4000-8000-000000000006', hospitalId: HOSPITAL_ID, destinationId: DESTINATION_IDS.CAFETERIA, slug: 'garden-terrace-cafeteria', name: 'Garden Terrace Dining & Nutrition', nameTa: 'தோட்ட உணவகம் & ஊட்டச்சத்து மையம்', category: 'amenity', summary: 'Fresh balanced meals, diabetic-friendly options, and calm courtyard seating.', summaryTa: 'சத்தான உணவு வகைகள் மற்றும் அமைதியான தோட்ட இருக்கைகள்.', details: 'Accessible along the Level 0 Northeast Garden Gallery.', detailsTa: 'தரை தளம் வடகிழக்கு தோட்டப் பகுதியில் அமைந்துள்ளது.', preparationNotes: 'No appointment required; attendant seating open daily.', preparationNotesTa: 'பார்வையாளர்கள் மற்றும் குடும்பத்தினருக்குத் தினமும் திறந்திருக்கும்.', availability: 'Daily · 06:30 – 21:30', availabilityTa: 'தினமும் · 06:30 – 21:30', turnaroundEstimate: 'Immediate service' },
];

export const SAMPLE_USERS: (UserProfile & { passwordHashDemo?: string })[] = [
  { id: '88888888-8888-4888-8888-888888888801', email: 'admin@medipath.demo', fullName: 'Ananya Deshmukh (Campus Admin)', phone: '+91 44 4019 2201', role: 'admin', preferredLanguage: 'en', accessibilityRequired: false, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: '88888888-8888-4888-8888-888888888802', email: 'staff@medipath.demo', fullName: 'Karthik Rajan (Concierge & Queue Staff)', phone: '+91 44 4019 2202', role: 'hospital_staff', preferredLanguage: 'ta', accessibilityRequired: false, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  { id: '88888888-8888-4888-8888-888888888803', email: 'patient@medipath.demo', fullName: 'Priya Narayanan', phone: '+91 98401 55210', role: 'patient', preferredLanguage: 'en', accessibilityRequired: false, createdAt: '2026-01-02T09:00:00.000Z', updatedAt: '2026-01-02T09:00:00.000Z' },
];

export const SAMPLE_APPOINTMENTS: Appointment[] = [
  { id: '99999999-9999-4999-8999-999999999901', bookingReference: 'MP-2026-1042', patientId: '88888888-8888-4888-8888-888888888803', patientName: 'Priya Narayanan', patientEmail: 'patient@medipath.demo', patientPhone: '+91 98401 55210', doctorId: DOCTOR_IDS.KAVITHA, departmentId: DEPARTMENT_IDS.CARDIOLOGY, destinationId: DESTINATION_IDS.CARDIOLOGY, appointmentDate: new Date().toISOString().slice(0, 10), slotTime: '10:30', reason: 'Annual preventive echocardiogram & lipid consultation', status: 'confirmed', accessibilityNeeded: true, notes: 'Prefers Central Atrium Elevator route', createdAt: '2026-01-09T08:00:00.000Z', updatedAt: '2026-01-09T08:00:00.000Z' },
  { id: '99999999-9999-4999-8999-999999999902', bookingReference: 'MP-2026-1043', patientId: '88888888-8888-4888-8888-888888888803', patientName: 'Priya Narayanan', patientEmail: 'patient@medipath.demo', patientPhone: '+91 98401 55210', doctorId: DOCTOR_IDS.MEENAKSHI, departmentId: DEPARTMENT_IDS.GENERAL_MEDICINE, destinationId: DESTINATION_IDS.GENERAL_MEDICINE, appointmentDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10), slotTime: '09:00', reason: 'Follow-up blood panel review', status: 'confirmed', accessibilityNeeded: false, createdAt: '2026-01-09T09:15:00.000Z', updatedAt: '2026-01-09T09:15:00.000Z' },
];

export const SAMPLE_QUEUE_TOKENS: QueueToken[] = [
  { id: 'f1000000-0000-4000-8000-000000000001', tokenNumber: 'C-104', departmentId: DEPARTMENT_IDS.CARDIOLOGY, appointmentId: '99999999-9999-4999-8999-999999999901', patientId: '88888888-8888-4888-8888-888888888803', patientName: 'Priya Narayanan', counterLabel: 'Suite 204-A', status: 'called', priority: 'priority', estimatedWaitMinutes: 5, issuedAt: new Date(Date.now() - 1800000).toISOString(), calledAt: new Date(Date.now() - 120000).toISOString() },
  { id: 'f1000000-0000-4000-8000-000000000002', tokenNumber: 'C-105', departmentId: DEPARTMENT_IDS.CARDIOLOGY, patientName: 'Suresh Raghavan', counterLabel: 'Suite 204-A', status: 'waiting', priority: 'normal', estimatedWaitMinutes: 15, issuedAt: new Date(Date.now() - 1200000).toISOString() },
  { id: 'f1000000-0000-4000-8000-000000000003', tokenNumber: 'L-208', departmentId: DEPARTMENT_IDS.LABORATORY, patientName: 'Divya Krishnan', counterLabel: 'Phlebotomy Bay 2', status: 'in_service', priority: 'normal', estimatedWaitMinutes: 0, issuedAt: new Date(Date.now() - 2400000).toISOString(), calledAt: new Date(Date.now() - 600000).toISOString() },
  { id: 'f1000000-0000-4000-8000-000000000004', tokenNumber: 'O-302', departmentId: DEPARTMENT_IDS.ORTHOPAEDICS, patientName: 'Ramesh Babu', counterLabel: 'Suite 214-A', status: 'waiting', priority: 'normal', estimatedWaitMinutes: 12, issuedAt: new Date(Date.now() - 900000).toISOString() },
];

export const SAMPLE_SERVICE_REQUESTS: ServiceRequest[] = [
  { id: 'f2000000-0000-4000-8000-000000000001', hospitalId: HOSPITAL_ID, patientId: '88888888-8888-4888-8888-888888888803', requesterName: 'Priya Narayanan', requesterPhone: '+91 98401 55210', requestType: 'wheelchair', pickupNodeId: NODE_IDS.L0_ENTRANCE, pickupLabel: 'Main Entrance Portico', destinationId: DESTINATION_IDS.CARDIOLOGY, notes: 'Attending morning cardiology review with elderly parent.', status: 'assigned', assignedStaffName: 'Karthik Rajan', createdAt: new Date(Date.now() - 3600000).toISOString(), updatedAt: new Date(Date.now() - 1800000).toISOString() },
];

export const SAMPLE_ANNOUNCEMENTS: Announcement[] = [
  { id: 'f3000000-0000-4000-8000-000000000001', hospitalId: HOSPITAL_ID, title: 'Sample Campus Notice — Architectural Map v1.0 Active', titleTa: 'மாதிரி வளாக அறிவிப்பு — 3D வரைபடம் v1.0 செயல்பாட்டில் உள்ளது', body: 'All four levels of Aurelia Pavilion (Sample Campus) are open with Central & East accessible elevators active. Use QR checkpoints at lobby desks to launch turn-by-turn 3D navigation.', bodyTa: 'ஆரேலியா பெவிலியன் (மாதிரி வளாகம்) நான்கு தளங்களும் மைய மற்றும் கிழக்கு மின்தூக்கிகளுடன் செயல்பாட்டில் உள்ளன.', severity: 'info', isActive: true, publishedAt: '2026-01-05T08:00:00.000Z' },
  { id: 'f3000000-0000-4000-8000-000000000002', hospitalId: HOSPITAL_ID, title: 'Level 3 ICU Sterile Bypass Restricted to Authorized Staff', titleTa: 'தளம் 3 ICU உள்வழி பாதை மருத்துவப் பணியாளர்களுக்கு மட்டுமே', body: 'Visitors heading to the ICU should take Central Atrium Elevators to Level 3 and check in via the North Gallery Nurse Concierge.', bodyTa: 'ICU பார்வையாளர்கள் மைய மின்தூக்கி வழியாக தளம் 3 வடக்கு நடைபாதையில் செவிலியர் வரவேற்பை அணுகவும்.', severity: 'advisory', isActive: true, publishedAt: '2026-01-06T09:00:00.000Z' },
];

export const SAMPLE_AUDIT_LOGS: AuditLog[] = [
  { id: 'f4000000-0000-4000-8000-000000000001', actorId: '88888888-8888-4888-8888-888888888801', actorEmail: 'admin@medipath.demo', actorRole: 'admin', action: 'MAP_VERSION_PUBLISHED', entityType: 'map_versions', entityId: MAP_VERSION_ID, summary: 'Published Map v1.0 with 53 active nodes, 67 edges, and 21 verified destinations.', createdAt: '2026-01-05T08:00:00.000Z' },
];
