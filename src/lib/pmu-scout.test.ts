import assert from "node:assert/strict";
import { test } from "node:test";
import {
  SCOUT_CITIES,
  brandKey,
  extractAlertLinks,
  parseFreshaListing,
  parseFreshaVenue,
  placeKind,
  placeValue,
  scorePmuAd,
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
  });
});

test("place value: market, medical, premium, busy, and few reviews", () => {
  const dubai = SCOUT_CITIES.find((city) => city.city === "Madrid")!;
  const [place] = parseFreshaListing(listing);
  const value = placeValue(dubai, place, parseFreshaVenue(venue));
  assert.equal(value.score, 5);
  assert.deepEqual(value.reasons, [
    "medical setting",
    "premium PMU (EUR 2400)",
    "team of 12",
    "offers PMU without a dedicated PMU artist listed",
  ]);
  assert.equal(placeValue(dubai, { ...place, name: "Tiny Salon", reviews: 5 }, null).score, 2);
});

test("kinds and WhatsApp numbers", () => {
  assert.equal(placeKind("Glow Aesthetic Clinic"), "clinic");
  assert.equal(placeKind("Brow Bar JBR"), "studio");
  assert.equal(placeKind("Paulista Beauty Salon"), "salon");
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
