export interface MediaAsset {
  src: string;
  alt: string;
  altTa: string;
  caption: string;
  captionTa: string;
  width: number;
  height: number;
}

export const HOSPITAL_EXTERIOR_MEDIA: MediaAsset = {
  src: '/images/hospital-exterior.jpg',
  alt: 'Aurelia Pavilion Medical Center modern 4-story glass and limestone hospital exterior',
  altTa: 'ஆரேலியா பெவிலியன் மருத்துவ மையத்தின் 4 தள நவீன கட்டிட முகப்பு',
  caption: 'Aurelia Pavilion · South Main Entrance & 4 Clinical Levels',
  captionTa: 'ஆரேலியா பெவிலியன் · தெற்கு பிரதான நுழைவாயில் மற்றும் 4 தளங்கள்',
  width: 1280,
  height: 800,
};

const SERVICE_MEDIA_BY_SLUG: Record<string, MediaAsset> = {
  'diagnostic-laboratory-panels': {
    src: '/images/service-lab.jpg',
    alt: 'Calm sunlit blood draw and clinical pathology bays on Level 1 overlooking a green garden',
    altTa: 'தளம் 1-இல் உள்ள அமைதியான இரத்தப் பரிசோதனை மற்றும் ஆய்வகப் பிரிவு',
    caption: 'Level 1 West Wing · Blood tests & lab sample bays',
    captionTa: 'தளம் 1 மேற்குப் பகுதி · இரத்தப் பரிசோதனை மையம்',
    width: 1280,
    height: 800,
  },
  'mri-ct-imaging-suite': {
    src: '/images/service-diagnostics.jpg',
    alt: 'Quiet 3T MRI and low-dose CT scan imaging room with indirect lighting',
    altTa: 'அமைதியான 3T MRI மற்றும் CT ஸ்கேன் பரிசோதனை அறை',
    caption: 'Level 1 Southwest Wing · 3T MRI & CT scans',
    captionTa: 'தளம் 1 தென்மேற்குப் பகுதி · 3T MRI & CT ஸ்கேன்',
    width: 1280,
    height: 800,
  },
  '24-hour-pharmacy-dispensary': {
    src: '/images/service-pharmacy.jpg',
    alt: 'Bright 24/7 clinical pharmacy counter next to the East Elevators on Level 1',
    altTa: 'கிழக்கு மின்தூக்கிகளுக்கு அருகிலுள்ள 24 மணி நேர மருந்தகம்',
    caption: 'Level 1 Southeast · Open 24/7 right off East Lift',
    captionTa: 'தளம் 1 தென்கிழக்கு · 24 மணி நேர மருந்தகம்',
    width: 1280,
    height: 800,
  },
  'wheelchair-escort-assistance': {
    src: '/images/service-mobility.jpg',
    alt: 'Ground atrium concierge desk with clean transport wheelchair ready for visitors',
    altTa: 'பிரதான வரவேற்பு பகுதியில் தயாராக உள்ள சக்கர நாற்காலி சேவை மையம்',
    caption: 'Ground Lobby (G-03) · Free wheelchair & guide in 5 min',
    captionTa: 'தரை தளம் (G-03) · 5 நிமிடத்தில் இலவச சக்கர நாற்காலி உதவி',
    width: 1280,
    height: 800,
  },
  'billing-insurance-concierge': {
    src: '/images/service-cardiology.jpg',
    alt: 'Spacious sunlit ground-floor reception desk for outpatient billing and insurance',
    altTa: 'தரை தளத்தில் அமைந்துள்ள கட்டணம் மற்றும் காப்பீட்டு உதவி மேசை',
    caption: 'Ground East Wing (G-05) · Fast desk & insurance help',
    captionTa: 'தரை தளம் கிழக்கு (G-05) · கட்டணம் & காப்பீட்டு மையம்',
    width: 1280,
    height: 800,
  },
  'garden-terrace-cafeteria': {
    src: '/images/service-cafeteria.jpg',
    alt: 'Peaceful sunlit garden terrace dining area for patients and family visitors',
    altTa: 'குடும்பத்தினர் ஓய்வெடுக்கும் அமைதியான தோட்ட உணவகம்',
    caption: 'Ground Northeast Garden · Warm meals & quiet terrace',
    captionTa: 'தரை தளம் வடகிழக்கு · தோட்ட உணவகம்',
    width: 1280,
    height: 800,
  },
};

const FALLBACK_BY_CATEGORY: Record<string, MediaAsset> = {
  diagnostic: SERVICE_MEDIA_BY_SLUG['mri-ct-imaging-suite'],
  pharmacy: SERVICE_MEDIA_BY_SLUG['24-hour-pharmacy-dispensary'],
  support: SERVICE_MEDIA_BY_SLUG['wheelchair-escort-assistance'],
  billing: SERVICE_MEDIA_BY_SLUG['billing-insurance-concierge'],
  amenity: SERVICE_MEDIA_BY_SLUG['garden-terrace-cafeteria'],
  emergency: {
    src: '/images/service-emergency.jpg',
    alt: 'West Gate A sheltered emergency ramp entrance open 24/7',
    altTa: '24/7 திறந்திருக்கும் மேற்கு நுழைவாயில் A அவசர சிகிச்சைப் பாதை',
    caption: 'Ground West Gate A · Direct step-free ambulance ramp',
    captionTa: 'தரை தளம் மேற்கு A · தடையற்ற ஆம்புலன்ஸ் நுழைவு',
    width: 1280,
    height: 800,
  },
};

export function getServiceMedia(slug?: string, category?: string): MediaAsset {
  if (slug && SERVICE_MEDIA_BY_SLUG[slug]) {
    return SERVICE_MEDIA_BY_SLUG[slug];
  }
  if (category && FALLBACK_BY_CATEGORY[category]) {
    return FALLBACK_BY_CATEGORY[category];
  }
  return SERVICE_MEDIA_BY_SLUG['billing-insurance-concierge'];
}

const DEPARTMENT_MEDIA_BY_SLUG: Record<string, MediaAsset> = {
  cardiology: {
    src: '/images/service-cardiology.jpg',
    alt: 'Bright Level 2 West Atrium Lounge leading to Cardiology & Vascular suites',
    altTa: 'தளம் 2 இதயவியல் பிரிவிற்கான அமைதியான வரவேற்பு கூடம்',
    caption: 'Level 2 West · Cardiology & Heart Care Suites',
    captionTa: 'தளம் 2 மேற்கு · இதயவியல் பிரிவு',
    width: 1280,
    height: 800,
  },
  neurology: {
    src: '/images/service-cardiology.jpg',
    alt: 'Calm Southwest Level 2 clinic reception for Neurology and Stroke Care',
    altTa: 'தளம் 2 தென்மேற்கு நரம்பியல் மற்றும் பக்கவாத சிகிச்சைப் பிரிவு',
    caption: 'Level 2 Southwest · Neurology & Stroke Clinic',
    captionTa: 'தளம் 2 தென்மேற்கு · நரம்பியல் பிரிவு',
    width: 1280,
    height: 800,
  },
  orthopaedics: {
    src: '/images/service-mobility.jpg',
    alt: 'Wide step-free corridor and lounge near East Lifts for Orthopaedics & Rehab',
    altTa: 'எலும்பியல் பிரிவிற்கான தடையற்ற சக்கர நாற்காலி நடைபாதை',
    caption: 'Level 2 Southeast · Orthopaedics & Rehab',
    captionTa: 'தளம் 2 தென்கிழக்கு · எலும்பியல் பிரிவு',
    width: 1280,
    height: 800,
  },
  'general-medicine': {
    src: '/images/service-cardiology.jpg',
    alt: 'Primary outpatient consultation lounge on Level 2 Northeast Wing',
    altTa: 'தளம் 2 வடகிழக்கு பொது மருத்துவ ஆலோசனை மையம்',
    caption: 'Level 2 Northeast · General Medicine Clinics',
    captionTa: 'தளம் 2 வடகிழக்கு · பொது மருத்துவம்',
    width: 1280,
    height: 800,
  },
  emergency: FALLBACK_BY_CATEGORY.emergency,
  laboratory: SERVICE_MEDIA_BY_SLUG['diagnostic-laboratory-panels'],
  radiology: SERVICE_MEDIA_BY_SLUG['mri-ct-imaging-suite'],
  pharmacy: SERVICE_MEDIA_BY_SLUG['24-hour-pharmacy-dispensary'],
  icu: {
    src: '/images/service-diagnostics.jpg',
    alt: 'Quiet Level 3 Critical Care Zone & family lounge off Central Elevators',
    altTa: 'தளம் 3 தீவிர சிகிச்சைப் பிரிவு மற்றும் குடும்பத்தினர் ஓய்வறை',
    caption: 'Level 3 West · Intensive Care Unit (ICU)',
    captionTa: 'தளம் 3 மேற்கு · தீவிர சிகிச்சைப் பிரிவு (ICU)',
    width: 1280,
    height: 800,
  },
  'inpatient-wards': {
    src: '/images/service-cafeteria.jpg',
    alt: 'Sunlight-filled quiet east recovery wing and garden overlook on Level 3',
    altTa: 'தோட்டக் காட்சியுடன் கூடிய தளம் 3 உள்நோயாளி அறைகள்',
    caption: 'Level 3 East · Private Recovery Suites',
    captionTa: 'தளம் 3 கிழக்கு · உள்நோயாளி அறைகள்',
    width: 1280,
    height: 800,
  },
};

export function getDepartmentMedia(slug: string): MediaAsset {
  return DEPARTMENT_MEDIA_BY_SLUG[slug] ?? HOSPITAL_EXTERIOR_MEDIA;
}

export const SIMPLE_WAYFINDING_STEPS: {
  step: string;
  title: string;
  titleTa: string;
  summary: string;
  summaryTa: string;
  image: MediaAsset;
  to: string;
}[] = [
  {
    step: '01',
    title: 'Pick Where You Are',
    titleTa: 'நீங்கள் இருக்கும் இடத்தைத் தேர்ந்தெடுக்கவும்',
    summary: 'Start from the Main Entrance or tap a nearby floor QR stand.',
    summaryTa: 'பிரதான நுழைவாயில் அல்லது அருகிலுள்ள QR பலகையைத் தேர்ந்தெடுக்கவும்.',
    image: SERVICE_MEDIA_BY_SLUG['wheelchair-escort-assistance'],
    to: '/qr/MP-QR-ENTRANCE',
  },
  {
    step: '02',
    title: 'Rotate 360° or View Real Building',
    titleTa: '360° சுழற்றி முழுக் கட்டிடத்தைப் பாருங்கள்',
    summary: 'Drag smoothly 360° left or right, or switch between Real Building exterior and inside floors.',
    summaryTa: 'விரலால் 360° சுழற்றலாம் அல்லது முழு கட்டிடம் / உள் தளங்களைப் பார்க்கலாம்.',
    image: HOSPITAL_EXTERIOR_MEDIA,
    to: '/navigate',
  },
  {
    step: '03',
    title: 'Follow Clear Step-Free Directions',
    titleTa: 'எளிய வழிமுறைகளைப் பின்பற்றவும்',
    summary: 'See walk time, meter distance, and elevator-only paths in one clean view.',
    summaryTa: 'நடை நேரம், தூரம் மற்றும் மின்தூக்கி வழித்தடத்தைத் தெளிவாகப் பாருங்கள்.',
    image: SERVICE_MEDIA_BY_SLUG['billing-insurance-concierge'],
    to: '/navigate?accessible=true',
  },
];
