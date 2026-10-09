// ─── Verified Hospital Destination Directory for Kerala Priority Corridors ───
import type { Coordinates } from '@/types';

export interface HospitalDestination {
  id: string;
  name: string;
  alternateName?: string;
  town: string;
  district: string;
  coords: Coordinates;
  address: string;
  verifiedOSM: boolean;
  osmNotes: string;
  category: 'super-specialty' | 'general' | 'taluk' | 'medical-college';
  phone?: string; // Only verified contact lines included
}

/**
 * 13 Verified Healthcare Destinations across Idukki and Ernakulam corridors.
 * All coordinates verified against OpenStreetMap (OSM) nodes and ways.
 */
export const KERALA_HOSPITALS: HospitalDestination[] = [
  {
    id: 'bmh-thodupuzha',
    name: 'Baby Memorial Hospital, Thodupuzha',
    alternateName: 'Formerly Chazhikattu Hospital',
    town: 'Thodupuzha',
    district: 'Idukki',
    coords: { lat: 9.898205, lng: 76.709809 },
    address: 'River View Road, Vengalloor, Thodupuzha, Idukki 685584',
    verifiedOSM: true,
    osmNotes: 'Verified OSM node: Chazhikattu Hospital on River View Road (acquired and operated by Baby Memorial Hospital Group).',
    category: 'super-specialty',
    phone: '04862 250250',
  },
  {
    id: 'smita-thodupuzha',
    name: 'Smita Memorial Hospital & Research Centre',
    alternateName: 'Smitha Memorial Hospital',
    town: 'Thodupuzha',
    district: 'Idukki',
    coords: { lat: 9.910300, lng: 76.699668 },
    address: 'Main Eastern Highway (SH 8), Vengalloor, Thodupuzha, Idukki 685608',
    verifiedOSM: true,
    osmNotes: 'Verified OSM node: smita memorial hospital and research center, SH 8 / Main Eastern Highway.',
    category: 'super-specialty',
    phone: '04862 350700',
  },
  {
    id: 'al-azhar-thodupuzha',
    name: 'Al Azhar Medical College & Super Speciality Hospital',
    town: 'Thodupuzha',
    district: 'Idukki',
    coords: { lat: 9.939524, lng: 76.720604 },
    address: 'Ezhalloor Road, Kodikulam West, Kumaramangalam, Thodupuzha 685582',
    verifiedOSM: true,
    osmNotes: 'Verified OSM node: Al-Azhar Medical College & Super Speciality Hospital, Ezhalloor.',
    category: 'medical-college',
    phone: '04862 226000',
  },
  {
    id: 'district-hospital-thodupuzha',
    name: 'District Hospital, Thodupuzha',
    alternateName: 'Taluk Headquarters Hospital Thodupuzha',
    town: 'Thodupuzha',
    district: 'Idukki',
    coords: { lat: 9.899845, lng: 76.726544 },
    address: 'Newman College Road, Mangattukavala, Thodupuzha, Idukki 685585',
    verifiedOSM: true,
    osmNotes: 'Verified OSM node: Taluk Headquarters Hospital Thodupuzha (serves as the primary public municipal hospital; District Hospital Idukki is at Painavu).',
    category: 'taluk',
  },
  {
    id: 'st-marys-thodupuzha',
    name: "St. Mary's Hospital, Thodupuzha",
    town: 'Thodupuzha',
    district: 'Idukki',
    coords: { lat: 9.892231, lng: 76.715880 },
    address: 'Thodupuzha - Puliyanmala Road, Thodupuzha, Idukki 685585',
    verifiedOSM: true,
    osmNotes: "Verified OSM node: St. Mary's Hospital, Puliyanmala Road.",
    category: 'general',
  },
  {
    id: 'holy-family-muthalakodam',
    name: 'Holy Family Hospital, Muthalakodam',
    town: 'Muthalakodam',
    district: 'Idukki',
    coords: { lat: 9.912241, lng: 76.733859 },
    address: 'Muthalakkodam - Pazhukkakulam Road, Kunnam, Thodupuzha 685605',
    verifiedOSM: true,
    osmNotes: 'Verified OSM node: Muthalakkodam Holy Family Hospital.',
    category: 'general',
  },
  {
    id: 'archana-thodupuzha',
    name: 'Archana Hospital, Thodupuzha',
    town: 'Thodupuzha',
    district: 'Idukki',
    coords: { lat: 9.903305, lng: 76.710046 },
    address: 'Main Eastern Highway, Kanjiramattom, Thodupuzha, Idukki 685584',
    verifiedOSM: true,
    osmNotes: 'Verified OSM node: Archana Hospital, Main Eastern Highway.',
    category: 'general',
  },
  {
    id: 'general-hospital-muvattupuzha',
    name: 'General Hospital, Muvattupuzha',
    alternateName: 'Government General Hospital',
    town: 'Muvattupuzha',
    district: 'Ernakulam',
    coords: { lat: 9.979142, lng: 76.580002 },
    address: 'MC Road, Kizhakkekara, Muvattupuzha, Ernakulam 686661',
    verifiedOSM: true,
    osmNotes: 'Verified OSM node: Government General Hospital, MC Road, Muvattupuzha.',
    category: 'general',
  },
  {
    id: 'muvattupuzha-medical-centre',
    name: 'Muvattupuzha Medical Centre',
    town: 'Muvattupuzha',
    district: 'Ernakulam',
    coords: { lat: 9.990291, lng: 76.576814 },
    address: 'MC Road, Velloorkunnam, Muvattupuzha, Ernakulam 686673',
    verifiedOSM: true,
    osmNotes: 'Verified OSM node: Muvattupuzha Medical Centre (മൂവാറ്റുപുഴ മെഡിക്കൽ സെന്റർ), MC Road.',
    category: 'general',
  },
  {
    id: 'taluk-hospital-perumbavoor',
    name: 'Taluk Headquarters Hospital, Perumbavoor',
    town: 'Perumbavoor',
    district: 'Ernakulam',
    coords: { lat: 10.115991, lng: 76.481420 },
    address: 'MDR Road, Perumbavoor, Kunnathunad, Ernakulam 683500',
    verifiedOSM: true,
    osmNotes: 'Verified OSM node: Taluk Headquarters Hospital Perumbavoor.',
    category: 'taluk',
  },
  {
    id: 'district-hospital-aluva',
    name: 'District Hospital, Aluva',
    town: 'Aluva',
    district: 'Ernakulam',
    coords: { lat: 10.105397, lng: 76.355062 },
    address: 'Railway Station Road, Thottakkattukara, Aluva, Ernakulam 683101',
    verifiedOSM: true,
    osmNotes: 'Verified OSM node: District Hospital Aluva, Railway Station Road.',
    category: 'general',
  },
  {
    id: 'rajagiri-hospital-aluva',
    name: 'Rajagiri Hospital, Aluva',
    town: 'Aluva',
    district: 'Ernakulam',
    coords: { lat: 10.087659, lng: 76.388212 },
    address: 'Aluva - Munnar Road, Chunangamvely, Aluva, Ernakulam 683112',
    verifiedOSM: true,
    osmNotes: 'Verified OSM node: Rajagiri Hospital, Chunangamvely, Aluva.',
    category: 'super-specialty',
    phone: '0484 2905000',
  },
  {
    id: 'general-hospital-ernakulam',
    name: 'General Hospital, Ernakulam',
    town: 'Ernakulam (Kochi)',
    district: 'Ernakulam',
    coords: { lat: 9.971960, lng: 76.281052 },
    address: 'Market Road, Boat Jetty, Marine Drive, Ernakulam, Kochi 682011',
    verifiedOSM: true,
    osmNotes: 'Verified OSM node: General Hospital Ernakulam, Market Road / Marine Drive.',
    category: 'general',
  },
];

/**
 * Filter hospitals by search term matching name, town, district, or category.
 */
export function searchHospitals(query: string): HospitalDestination[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return KERALA_HOSPITALS;
  return KERALA_HOSPITALS.filter(
    (h) =>
      h.name.toLowerCase().includes(clean) ||
      h.town.toLowerCase().includes(clean) ||
      h.district.toLowerCase().includes(clean) ||
      h.category.toLowerCase().includes(clean) ||
      (h.alternateName && h.alternateName.toLowerCase().includes(clean)),
  );
}
