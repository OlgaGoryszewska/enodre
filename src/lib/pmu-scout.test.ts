import assert from "node:assert/strict";
import { test } from "node:test";
import {
  GOOGLE_AREAS,
  SCOUT_CITIES,
  brandKey,
  extractAlertLinks,
  parseFreshaListing,
  googleAreasFor,
  isAestheticClinic,
  judgeGooglePlace,
  parseFreshaVenue,
  parseGooglePlaces,
  placeKind,
  placeValue,
  scorePmuAd,
  websiteOffersPmu,
  whatsappNumber,
} from "./pmu-scout.ts";

test("PMU ads are kept, makeup and 'permanent contract' ads are not", () => {
  assert.ok(scorePmuAd("PMU Artist – Microblading & Lip Blush", "Marbella clinic").keep);
  assert.ok(scorePmuAd("Hudterapeut", "Vi tilbyr permanent makeup og vipper").keep);
  assert.equal(scorePmuAd("Makeup Artist", "Permanent position, bridal").keep, false);
  assert.equal(scorePmuAd("Nail technician", "we also do microblading").keep, false);
  assert.equal(scorePmuAd("Permanant Make Up Artist", "").keep, true);
});

test("red flags sink an ad", () => {
  const verdict = scorePmuAd("SPMU artist", "Visit visa holders welcome, commission only");
  assert.equal(verdict.keep, false);
  assert.deepEqual(verdict.redFlags.sort(), ["commission only", "visit visa"]);
});

test("better ads score higher", () => {
  const plain = scorePmuAd("PMU artist", "").score;
  const great = scorePmuAd(
    "Senior PMU artist (medical clinic)",
    "medical clinic, scalp micropigmentation, housing"
  ).score;
  assert.ok(great > plain, `${great} > ${plain}`);
});

test("alert emails: only links that name a PMU technique", () => {
  const html = `
    <a href="https://www.linkedin.com/jobs/view/1/">Microblading Artist</a>
    <a href="https://www.infojobs.net/oferta/2/"><span>Semi-Permanent Makeup Specialist</span> – Marbella</a>
    <a href="https://www.bayt.com/en/job/3/">Sales Associate</a>
    <a href="https://example.com/unsubscribe">Unsubscribe</a>
    <a href="https://www.linkedin.com/jobs/view/1/">Microblading Artist</a>`;
  assert.deepEqual(
    extractAlertLinks(html).map((link) => link.title),
    ["Microblading Artist", "Semi-Permanent Makeup Specialist – Marbella"]
  );
});

const listing = `<script type="application/ld+json">${JSON.stringify({
  "@graph": [
    { "@type": "WebSite", name: "Fresha" },
    {
      "@type": ["HealthAndBeautyBusiness", "BeautySalon"],
      url: "https://www.fresha.com/a/glow-clinic-dubai-x1#business",
      name: "Glow Aesthetic Clinic",
      address: { streetAddress: "Jumeirah 1" },
      sameAs: ["https://www.instagram.com/glowclinic?igsh=1", "https://glow.ae/", "https://www.google.com/maps/x"],
      aggregateRating: { ratingValue: 4.9, ratingCount: 820 },
    },
  ],
})}</script>`;

test("a Fresha city page gives the places, their Instagram and website", () => {
  assert.deepEqual(parseFreshaListing(listing), [
    {
      url: "https://www.fresha.com/a/glow-clinic-dubai-x1",
      name: "Glow Aesthetic Clinic",
      street: "Jumeirah 1",
      website: "https://glow.ae/",
      instagram: "glowclinic",
      rating: 4.9,
      reviews: 820,
    },
  ]);
});

const venue = `<script type="application/ld+json">${JSON.stringify({
  "@graph": [
    {
      "@type": ["HealthAndBeautyBusiness", "BeautySalon"],
      description: "The team of 12+ practitioners offers Brows, Lips.",
      telephone: "+34 635 36 46 77",
      employee: [{ jobTitle: "Nail Artist" }, { jobTitle: "Senior Hairdresser" }],
      hasOfferCatalog: [
        {
          "@type": "OfferCatalog",
          itemListElement: [
            { "@type": "AggregateOffer", name: "Microblading", highPrice: 2400 },
            { "@type": "Offer", category: "Lips", itemOffered: { name: "Lip Blush" }, price: 1500 },
            {
              "@type": "Offer",
              category: "Microblading I مايكروبليدنق",
              itemOffered: { name: "بكج تفتيح" },
              price: 900,
            },
            { "@type": "AggregateOffer", name: "Manicure", highPrice: 120 },
          ],
        },
      ],
    },
  ],
})}</script>`;

test("a venue page gives the phone, team, PMU prices and PMU staff", () => {
  assert.deepEqual(parseFreshaVenue(venue), {
    phone: "+34 635 36 46 77",
    teamSize: 12,
    pmuArtists: 0,
    pmuPrice: 2400,
    pmuServices: ["Microblading", "Lip Blush", "Microblading I مايكروبليدنق"],
    topPrice: 2400,
  });
});

test("place value: market, medical, premium, busy; PMU already on the menu scores lower", () => {
  const dubai = SCOUT_CITIES.find((city) => city.city === "Madrid")!;
  const [place] = parseFreshaListing(listing);
  const value = placeValue(dubai, place, parseFreshaVenue(venue));
  assert.equal(value.score, 5);
  assert.deepEqual(value.reasons, [
    "medical aesthetic clinic",
    "premium prices (up to EUR 2400)",
    "team of 12",
    "already offers PMU",
  ]);
  const noPmu = { ...parseFreshaVenue(venue), pmuServices: [] };
  assert.ok(placeValue(dubai, place, noPmu).reasons.includes("no PMU on its menu yet: pitch adding it"));
  assert.equal(placeValue(dubai, { ...place, name: "Tiny Salon", reviews: 5 }, null).score, 2);
});

test("kinds and WhatsApp numbers", () => {
  assert.equal(placeKind("Glow Aesthetic Clinic"), "clinic");
  assert.equal(placeKind("Brow Bar JBR"), "studio");
  assert.equal(placeKind("Paulista Beauty Salon"), "salon");
  assert.equal(placeKind("Clínica Dra. Ana López"), "clinic");
  assert.equal(placeKind("Medicina Estética Marbella"), "clinic");
  assert.equal(placeKind("Aesthetic Beauty Lounge"), "salon");
  assert.equal(placeKind("Dream Lashes"), "studio");
  assert.equal(placeKind("Vanessa Poveda Clínica de Micropigmentación"), "studio");
  assert.equal(placeKind("Clinica Estética Contur"), "clinic");
  assert.equal(whatsappNumber("+34 635 36 46 77"), "+34635364677");
  assert.equal(whatsappNumber("+34 965 03 42 41"), null);
  assert.equal(whatsappNumber("+47 483 38 779"), "+4748338779");
  assert.equal(whatsappNumber("+971 55 399 0010"), null);
});

test("branches of one brand share a key", () => {
  assert.equal(
    brandKey("Cutting Edge Ladies Salon | Marina plaza"),
    brandKey("Cutting Edge Ladies Salon | Silicon Central")
  );
  assert.equal(brandKey("Base & Boon - Diplomatic Quarter"), "base boon");
});

test("the daily search covers Spain and Portugal only", () => {
  assert.ok(SCOUT_CITIES.every((city) => city.country === "Spain" || city.country === "Portugal"));
  assert.equal(whatsappNumber("+351 912 345 678"), "+351912345678");
});

test("nail bars and hair salons score lower", () => {
  const madrid = SCOUT_CITIES.find((city) => city.city === "Madrid")!;
  const venue = {
    url: "u",
    name: "La Esmaltería Viriato",
    street: null,
    website: null,
    instagram: null,
    rating: 4.8,
    reviews: 900,
  };
  const value = placeValue(madrid, venue, null);
  assert.ok(value.reasons.includes("nail or hair salon first"));
  assert.equal(value.score, 3);
});

test("gel polish and lash lifts aren't PMU", () => {
  const html = `<script type="application/ld+json">${JSON.stringify({
    "@type": "BeautySalon",
    name: "Narybu",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      itemListElement: [
        { "@type": "Offer", itemOffered: { name: "Manicura Semipermanente" }, price: 35 },
        { "@type": "Offer", itemOffered: { name: "Ácido hialurónico labios" }, price: 300 },
      ],
    },
  })}</script>`;
  const details = parseFreshaVenue(html);
  assert.deepEqual(details.pmuServices, []);
  assert.equal(details.topPrice, 300);
});

const googleResult = {
  places: [
    {
      id: "a",
      displayName: { text: "Clínica Médico Estética Mar" },
      formattedAddress: "Av. de l'Albir 10, Albir",
      rating: 4.9,
      userRatingCount: 210,
      websiteUri: "https://clinicamar.es/",
      internationalPhoneNumber: "+34 600 11 22 33",
      googleMapsUri: "https://maps.google.com/?cid=1",
      types: ["medical_clinic", "health"],
      businessStatus: "OPERATIONAL",
    },
    {
      id: "b",
      displayName: { text: "Glow Beauty Salon" },
      rating: 4.9,
      userRatingCount: 400,
      types: ["beauty_salon"],
    },
    { id: "c", displayName: { text: "Skin Lab" }, rating: 4.8, userRatingCount: 90, types: ["skin_care_clinic"] },
    { id: "g", displayName: { text: "SALUFIT | Centro integral" }, rating: 5, userRatingCount: 643, types: ["doctor"] },
    {
      id: "h",
      displayName: { text: "Clinic de langue française - Médecine générale" },
      rating: 5,
      userRatingCount: 66,
      types: ["doctor"],
    },
    {
      id: "i",
      displayName: { text: "Medical Club | Depilación Láser" },
      rating: 4.7,
      userRatingCount: 125,
      types: ["doctor"],
    },
    {
      id: "j",
      displayName: { text: "Pepa Pérez Esthetic Center" },
      rating: 4.8,
      userRatingCount: 159,
      types: ["beauty_salon"],
    },
    { id: "d", displayName: { text: "Clínica Dental Sonrisa" }, rating: 5, userRatingCount: 300, types: ["dentist"] },
    { id: "e", displayName: { text: "Clínica Estética Nueva" }, rating: 4.9, userRatingCount: 12, types: [] },
    {
      id: "f",
      displayName: { text: "Clínica Cerrada" },
      rating: 4.9,
      userRatingCount: 200,
      types: ["doctor"],
      businessStatus: "CLOSED_PERMANENTLY",
    },
  ],
};

test("Google places: premium medical aesthetic clinics only", () => {
  const albir = GOOGLE_AREAS.find((area) => area.area === "Albir")!;
  const [clinic, salon, skinLab, gym, gp, hairRemoval, beauty, dentist, small, closed] =
    parseGooglePlaces(googleResult);
  for (const place of [gym, gp, hairRemoval, beauty]) assert.equal(judgeGooglePlace(place, albir), null, place.name);
  assert.equal(clinic.website, "https://clinicamar.es/");
  assert.deepEqual(judgeGooglePlace(clinic, albir), {
    score: 5,
    reasons: ["Google 4.9★ from 210 reviews", "medical aesthetic clinic", "top rated and busy"],
  });
  assert.equal(judgeGooglePlace(salon, albir), null);
  assert.deepEqual(judgeGooglePlace(skinLab, albir)?.reasons, [
    "Google 4.8★ from 90 reviews",
    "medical clinic on Google",
  ]);
  assert.equal(judgeGooglePlace(dentist, albir), null);
  assert.equal(judgeGooglePlace(small, albir), null);
  assert.equal(judgeGooglePlace(closed, albir), null);
});

test("Google areas: the Costa Blanca towns are in, and each run moves on", () => {
  for (const town of ["Moraira", "Jávea", "Altea", "Albir"]) assert.ok(GOOGLE_AREAS.some((area) => area.area === town));
  const first = googleAreasFor(0, 6).map((area) => area.area);
  const next = googleAreasFor(1, 6).map((area) => area.area);
  assert.equal(first.length, 6);
  assert.equal(first[0], "Moraira");
  assert.notDeepEqual(first, next);
  // Every area comes round.
  const days = Math.ceil(GOOGLE_AREAS.length / 6) + 1;
  const covered = new Set(Array.from({ length: days }, (_, day) => googleAreasFor(day, 6).map((a) => a.area)).flat());
  assert.equal(covered.size, GOOGLE_AREAS.length);
});

test("a clinic website that already offers PMU", () => {
  assert.ok(websiteOffersPmu("<nav><a>Micropigmentación de cejas</a></nav>"));
  assert.ok(websiteOffersPmu("<li>Microblading</li>"));
  assert.ok(!websiteOffersPmu("<li>Ácido hialurónico</li><li>Manicura semipermanente</li>"));
  assert.ok(!websiteOffersPmu("<script>var x='microblading'</script><p>Botox</p>"));
});

test("the daily search keeps aesthetic clinics, not dentists or labs", () => {
  assert.ok(isAestheticClinic("ETERNAL CLINIC"));
  assert.ok(isAestheticClinic("Clínica Dermatológica Lucía Pérez"));
  assert.ok(!isAestheticClinic("Felizdente - Clínica Médica Dentária"));
  assert.ok(!isAestheticClinic("Joaquim Chaves Saúde - Trajouce | Análises Clínicas"));
  assert.ok(!isAestheticClinic("Clínica NutriSaúde"));
  assert.ok(!isAestheticClinic("Vanessa Poveda Clínica de Micropigmentación"));
});
