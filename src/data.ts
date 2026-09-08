export interface ShopPayment {
  shop: string;
  domain: string;
  payment: string;
  paymentDomain: string;
}

export interface PaymentHost {
  label: string;
  domain: string;
}

export interface MapsHit {
  id: string;
  listing: string;
  fake: string;
  mapsEdit: string;
}

export interface Filings {
  namecheap: string;
  ftc: string;
  googleAds: string;
  maps: string;
  cloudflare: string;
  paypal: string;
  ic3: string;
  hkExtracts: string;
}

export interface InvestigationData {
  brand: string;
  tagline: string;
  lockedShops: number;
  operatorHandle: string;
  registrar: string;
  shopToPayment: ShopPayment[];
  payments: PaymentHost[];
  filings: Filings;
  mapsContamination: MapsHit[];
  notes: string[];
}

export const DATA: InvestigationData = {
  brand: "Fakeboot",
  tagline: "The fake shoe shop investigation",
  lockedShops: 14,
  operatorHandle:
    "viethoa24 (WordPress admin/author string only — not a proven natural person)",
  registrar: "Namecheap",
  shopToPayment: [
    {
      shop: "Verona Leather Shoe",
      domain: "veronaleathershoe.com",
      payment: "Hwamedia",
      paymentDomain: "hwamedialimited.com",
    },
    {
      shop: "Cedar Grove Bootery",
      domain: "cedargrovebootery.com",
      payment: "Vihanau",
      paymentDomain: "vihanau.com",
    },
    {
      shop: "Tarantino's Shoe Repair",
      domain: "tarantinosshoerepair.com",
      payment: "Ronbika",
      paymentDomain: "ronbika.com",
    },
    {
      shop: "Uncle Hans",
      domain: "unclehansshoerepairs.com",
      payment: "Makerhub",
      paymentDomain: "makerhublimited.com",
    },
    {
      shop: "All American Tailor",
      domain: "allamericantailor.com",
      payment: "Luna Makers",
      paymentDomain: "lunamakerslimited.com",
    },
    {
      shop: "Leather Corner Binghamton",
      domain: "leathercornershoerepair.com",
      payment: "Nova Prints HK",
      paymentDomain: "novaprintshklimited.com",
    },
    {
      shop: "Renew It Nanuet",
      domain: "renewitshoerepair.com",
      payment: "Luna Makers",
      paymentDomain: "lunamakerslimited.com",
    },
    {
      shop: "Colfax Boot & Shoe (Lakewood CO)",
      domain: "colfaxbootshoerepair.com",
      payment: "Vihanau",
      paymentDomain: "vihanau.com",
    },
    {
      shop: "Roswell/Wieuca Atlanta",
      domain: "roswellwieucashoerepair.com",
      payment: "Vihanau",
      paymentDomain: "vihanau.com",
    },
    {
      shop: "Middletown Shoe Repair",
      domain: "middletownshoerepair.com",
      payment: "Vihanau",
      paymentDomain: "vihanau.com",
    },
    {
      shop: "Meserole / Kim's Brooklyn",
      domain: "meseroleshoerepair.com",
      payment: "Duytina Stores",
      paymentDomain: "duytinastores.com",
    },
    {
      shop: "Nu-Way Shoe Repair",
      domain: "nu-wayshoerepair.com",
      payment: "Echo Art Collective",
      paymentDomain: "echoartcollectivelimited.com",
    },
    {
      shop: "National Shoe Services",
      domain: "nationalshoeservices.com",
      payment: "Echo Art Collective",
      paymentDomain: "echoartcollectivelimited.com",
    },
    {
      shop: "Chicago Cobblers Dynasty",
      domain: "chicagocobblersdynasty.com",
      payment: "Vihanau",
      paymentDomain: "vihanau.com",
    },
  ],
  payments: [
    { label: "Hwamedia", domain: "hwamedialimited.com" },
    { label: "Vihanau", domain: "vihanau.com" },
    { label: "Ronbika", domain: "ronbika.com" },
    { label: "Makerhub", domain: "makerhublimited.com" },
    { label: "Luna Makers", domain: "lunamakerslimited.com" },
    { label: "Nova Prints HK", domain: "novaprintshklimited.com" },
    { label: "Duytina Stores", domain: "duytinastores.com" },
    { label: "Echo Art Collective", domain: "echoartcollectivelimited.com" },
  ],
  filings: {
    namecheap: "reported — full evidence thread + every shop listed",
    ftc: "reported — confirmed, control 206624320",
    googleAds: "reported — no ticket number issued",
    maps: "4 map corrections filed: National/Howard, Cobblers/Adams, Nu-Way, Verona; rest parked",
    cloudflare: "blocked — their report form demands a puzzle I can't complete without a browser session",
    paypal: "blocked — requires logging into a PayPal account to report",
    ic3: "blocked — the FBI's form requires a phone number I'm not publishing",
    hkExtracts: "on hold — the records cost money and the case isn't there yet",
  },
  mapsContamination: [
    {
      id: "PC-016",
      listing: "National Shoe Services, 1913 W Howard, Chicago",
      fake: "nationalshoeservices.com",
      mapsEdit: "submitted",
    },
    {
      id: "PC-017",
      listing: "Chicago Cobblers Dynasty, 318 W Adams, Chicago",
      fake: "chicagocobblersdynasty.com",
      mapsEdit: "submitted",
    },
  ],
  notes: [
    "Every fake site impersonates a real, independent US shoe-repair or tailor shop",
    "At checkout, money is collected by separate outside websites — the cash registers — through PayPal",
    "Everything here is built from public evidence; the real shops are victims, not suspects",
    'The nickname "Fakeboot" is a play on Facebook — no connection to any real company',
  ],
};

export function filingsSubmittedCount(filings: Filings): number {
  return Object.values(filings).filter((v) => v.toLowerCase().startsWith("submitted")).length;
}

export function shopsByPayment(
  shops: ShopPayment[],
): Map<string, ShopPayment[]> {
  const map = new Map<string, ShopPayment[]>();
  for (const shop of shops) {
    const list = map.get(shop.payment) ?? [];
    list.push(shop);
    map.set(shop.payment, list);
  }
  return map;
}
