import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Seeds a demo organization with three users (admin/broker/investor) and a
 * fully-enriched demo property mirroring the UVIKT presentation mock
 * (Av. Calz. Las Águilas 1280, Álvaro Obregón, CDMX).
 */
async function main() {
  console.log("Seeding UVIKT demo data…");

  const passwordHash = await bcrypt.hash("demo12345", 10);

  // 1. Demo organization + branding
  const org = await prisma.organization.upsert({
    where: { slug: "demo-uvikt" },
    create: {
      name: "Demo Bienes Raíces",
      slug: "demo-uvikt",
      demographicRadiiMeters: "500,1000,5000",
      brandingProfile: {
        create: {
          companyName: "Demo Bienes Raíces",
          primaryColor: "#0E2A35",
          accentColor: "#E4B43C",
          contactEmail: "contacto@demo.uvikt.mx",
          contactPhone: "+52 55 1234 5678",
          footerNote: "Información estratégica para la toma de decisión.",
        },
      },
    },
    update: {},
  });

  // 2. Users
  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.uvikt.mx" },
    create: { email: "admin@demo.uvikt.mx", passwordHash, name: "Ana Admin" },
    update: {},
  });
  const broker = await prisma.user.upsert({
    where: { email: "broker@demo.uvikt.mx" },
    create: { email: "broker@demo.uvikt.mx", passwordHash, name: "Beto Bróker" },
    update: {},
  });
  const investor = await prisma.user.upsert({
    where: { email: "investor@demo.uvikt.mx" },
    create: { email: "investor@demo.uvikt.mx", passwordHash, name: "Isabel Inversionista" },
    update: {},
  });

  for (const [user, role] of [[admin, "admin"], [broker, "broker"], [investor, "investor"]] as const) {
    await prisma.organizationMembership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
      create: { userId: user.id, organizationId: org.id, role },
      update: { role },
    });
  }

  // 3. Demo property from the presentation mock (idempotent)
  const existing = await prisma.property.findFirst({
    where: { organizationId: org.id, title: "Local comercial esquina Av. Las Águilas" },
  });
  if (existing) {
    console.log("Demo property exists, updating:", existing.id);
    await prisma.property.update({
      where: { id: existing.id },
      data: {
        transactionType: "acquisition",
        ticketNumber: "UVK-0001",
        acquisitionStage: "analyzing",
        propertyType: "local",
        occupancyStatus: "rented",
        currentTenant: "Kentucky Fried Chicken",
        currentRent: 185000,
        responsableInternoId: admin.id,
        responsableExternoName: "Beto Bróker",
        responsableExternoEmail: "broker@demo.uvikt.mx",
        responsableExternoPhone: "+52 55 1234 5678",
      },
    });
    await ensureCounterAndExtras(org.id, admin.id, broker.id);
    console.log("✓ Updated demo property + extras.");
    return;
  }

  const property = await prisma.property.create({
    data: {
      organizationId: org.id,
      createdById: broker.id,
      inputMethod: "desktop_address",
      status: "report_ready",
      transactionType: "acquisition",
      ticketNumber: "UVK-0001",
      acquisitionStage: "analyzing",
      propertyType: "local",
      occupancyStatus: "rented",
      currentTenant: "Kentucky Fried Chicken",
      currentRent: 185000,
      responsableInternoId: admin.id,
      responsableExternoName: "Beto Bróker",
      responsableExternoEmail: "broker@demo.uvikt.mx",
      responsableExternoPhone: "+52 55 1234 5678",
      title: "Local comercial esquina Av. Las Águilas",
      description:
        "Excelente local comercial sobre avenida principal, frente a plaza vecindaria con alto flujo vehicular y peatonal. Esquina con iluminación natural en dos frentes. Ideal para banco, farmacia o restaurante de marca.",
      priceAmount: 24500000,
      priceCurrency: "MXN",
      surfaceM2: 420,
      frontageM: 14,
      depthM: 30,
      propertyUse: "comercio",
      isCorner: true,
      levels: 1,
      localUnits: 3,
      notableBrands: "Kentucky Fried Chicken, Sherwin Williams, Tacos La Güera",
      landUse: "HC/3/20",
      seduviFichaUrl: "https://ciudadmx.gob.mx/seduvi/ficha?cp=01730&lat=19.35613&lng=-99.22367",
      polygonGeoJson: JSON.stringify({
        type: "Feature",
        properties: { synthetic: false, note: "Demo parcel" },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [-99.22380, 19.35604],
            [-99.22354, 19.35604],
            [-99.22354, 19.35622],
            [-99.22380, 19.35622],
            [-99.22380, 19.35604],
          ]],
        },
      }),
      reportReadyAt: new Date(),
      addresses: {
        create: [
          {
            source: "user", isPrimary: true,
            line1: "Av. Calz. Las Águilas 1280",
            neighborhood: "Puente Colorado",
            municipality: "Álvaro Obregón",
            state: "Ciudad de México",
            postalCode: "01730",
            country: "MX",
            validated: true, validatedAt: new Date(),
          },
          {
            source: "sepomex", isPrimary: false,
            line1: "Av. Calz. Las Águilas 1280",
            neighborhood: "Puente Colorado",
            municipality: "Álvaro Obregón",
            state: "Ciudad de México",
            postalCode: "01730",
            country: "MX",
            validated: true, validatedAt: new Date(),
            confidence: 0.95,
          },
        ],
      },
      locations: {
        create: { kind: "original", lat: 19.35613, lng: -99.22367, source: "geocoded" },
      },
      inputs: {
        create: { method: "desktop_address", rawPayload: JSON.stringify({ seeded: true }) },
      },
      media: {
        create: {
          kind: "hero",
          url: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1400&q=80",
          storageKey: "demo/hero.jpg",
          uploadedById: broker.id,
          mimeType: "image/jpeg",
        },
      },
      demographics: {
        create: [
          { radiusMeters: 500,  population: 12800, households: 3800,  avgAge: 34.2, avgHouseholdIncome: 38500, socioeconomicAbc1Pct: 28, socioeconomicC2Pct: 22, socioeconomicCPct: 27, socioeconomicDPct: 18, socioeconomicEPct: 5 },
          { radiusMeters: 1000, population: 48200, households: 14200, avgAge: 33.8, avgHouseholdIncome: 34100, socioeconomicAbc1Pct: 22, socioeconomicC2Pct: 20, socioeconomicCPct: 30, socioeconomicDPct: 22, socioeconomicEPct: 6 },
          { radiusMeters: 5000, population: 620400, households: 183900, avgAge: 33.1, avgHouseholdIncome: 26800, socioeconomicAbc1Pct: 14, socioeconomicC2Pct: 18, socioeconomicCPct: 32, socioeconomicDPct: 28, socioeconomicEPct: 8 },
        ],
      },
      commercialCtx: {
        create: [
          { radiusMeters: 500,  category: "retail",     count: 18, notableBrands: "Superama, Oxxo, 7-Eleven" },
          { radiusMeters: 500,  category: "banking",    count: 4,  notableBrands: "BBVA, Santander" },
          { radiusMeters: 500,  category: "food",       count: 9,  notableBrands: "Starbucks, KFC" },
          { radiusMeters: 500,  category: "automotive", count: 2,  notableBrands: "Ford" },
          { radiusMeters: 1000, category: "retail",     count: 42, notableBrands: "Walmart, Chedraui, Sams" },
          { radiusMeters: 1000, category: "banking",    count: 11, notableBrands: "BBVA, Banorte, HSBC" },
          { radiusMeters: 1000, category: "food",       count: 27, notableBrands: "Starbucks, Toks, Vips" },
          { radiusMeters: 5000, category: "retail",     count: 184, notableBrands: "Liverpool, Costco" },
          { radiusMeters: 5000, category: "banking",    count: 48,  notableBrands: "Todos los bancos grandes" },
          { radiusMeters: 5000, category: "food",       count: 210, notableBrands: "Cadena amplia" },
        ],
      },
      documents: {
        create: {
          kind: "seduvi_ficha",
          url: "https://ciudadmx.gob.mx/seduvi/ficha?cp=01730&lat=19.35613&lng=-99.22367",
          label: "Ficha SEDUVI HC/3/20",
        },
      },
      sourceRecords: {
        create: [
          { source: "sepomex",    status: "success", confidence: 0.95, normalizedPayload: JSON.stringify({ postalCode: "01730" }) },
          { source: "seduvi",     status: "success", confidence: 0.80, normalizedPayload: JSON.stringify({ landUseCode: "HC/3/20" }) },
          { source: "inegi",      status: "success", confidence: 0.70 },
          { source: "commercial", status: "partial", confidence: 0.55, errorMessage: "Sin proveedor live; datos sintéticos." },
        ],
      },
      enrichmentJobs: {
        create: [
          { source: "sepomex",    status: "success", startedAt: new Date(Date.now() - 120000), finishedAt: new Date(Date.now() - 119000) },
          { source: "seduvi",     status: "success", startedAt: new Date(Date.now() - 118000), finishedAt: new Date(Date.now() - 115000) },
          { source: "inegi",      status: "success", startedAt: new Date(Date.now() - 114000), finishedAt: new Date(Date.now() - 110000) },
          { source: "commercial", status: "partial", startedAt: new Date(Date.now() - 109000), finishedAt: new Date(Date.now() - 107000) },
        ],
      },
    },
  });

  await ensureCounterAndExtras(org.id, admin.id, broker.id);

  // Investor pipeline entry (legacy)
  await prisma.investorPipelineEntry.create({
    data: { propertyId: property.id, stage: "reviewing", estimatedValue: 24500000, rtzRadiusMeters: 1500 },
  });

  // Generate a demo report using the service so a public share link exists
  const snapshot = await buildSnapshot(property.id);
  const reportToken = randomToken(24);
  await prisma.generatedReport.create({
    data: {
      propertyId: property.id,
      shareToken: reportToken,
      snapshotJson: JSON.stringify(snapshot),
      publicAllowed: true,
      createdById: broker.id,
    },
  });

  console.log(`\n✓ Demo organization: ${org.name}`);
  console.log(`  Admin:    admin@demo.uvikt.mx    / demo12345`);
  console.log(`  Broker:   broker@demo.uvikt.mx   / demo12345`);
  console.log(`  Investor: investor@demo.uvikt.mx / demo12345`);
  console.log(`\n✓ Demo property: ${property.id}`);
  console.log(`  Public report: /r/${reportToken}`);
}

async function ensureCounterAndExtras(orgId: string, adminId: string, brokerId: string) {
  await prisma.organizationCounter.upsert({
    where: { organizationId: orgId },
    create: { organizationId: orgId, lastTicketNum: 5 },
    update: { lastTicketNum: 5 },
  });

  const extras: Array<{ ticket: string; title: string; type: string; stage: string; price: number; line1: string; nbhd: string; muni: string; cp: string; occupancy: string; tenant?: string; rent?: number; pot?: string }> = [
    { ticket: "UVK-0002", title: "Terreno Polanco esquina", type: "terreno", stage: "authorized",  price: 48000000, line1: "Horacio 1234",         nbhd: "Polanco IV Sección", muni: "Miguel Hidalgo",     cp: "11560", occupancy: "vacant",  pot: "BBVA" },
    { ticket: "UVK-0003", title: "Bodega industrial Vallejo", type: "bodega",  stage: "signing",     price: 62500000, line1: "Calle 33 #45",         nbhd: "Nueva Vallejo",      muni: "Gustavo A. Madero",  cp: "07750", occupancy: "rented",  tenant: "DHL", rent: 420000 },
    { ticket: "UVK-0004", title: "Local Reforma Juárez",     type: "local",   stage: "signed",      price: 31200000, line1: "Paseo de la Reforma 200", nbhd: "Juárez",           muni: "Cuauhtémoc",         cp: "06600", occupancy: "rented",  tenant: "Starbucks", rent: 145000 },
    { ticket: "UVK-0005", title: "Terreno Coyoacán",         type: "terreno", stage: "canceled",    price: 18500000, line1: "Av. Universidad 800",  nbhd: "Santa Catarina",     muni: "Coyoacán",           cp: "04010", occupancy: "vacant",  pot: "Oxxo" },
  ];
  for (const e of extras) {
    const exists = await prisma.property.findFirst({ where: { organizationId: orgId, ticketNumber: e.ticket } });
    if (exists) continue;
    await prisma.property.create({
      data: {
        organizationId: orgId,
        createdById: brokerId,
        inputMethod: "manual",
        transactionType: "acquisition",
        ticketNumber: e.ticket,
        acquisitionStage: e.stage,
        propertyType: e.type,
        title: e.title,
        priceAmount: e.price,
        priceCurrency: "MXN",
        surfaceM2: Math.round(200 + Math.random() * 600),
        occupancyStatus: e.occupancy,
        currentTenant: e.tenant,
        currentRent: e.rent,
        potentialTenant: e.pot,
        responsableInternoId: adminId,
        responsableExternoName: "Beto Bróker",
        status: "draft",
        addresses: { create: { source: "user", isPrimary: true, line1: e.line1, neighborhood: e.nbhd, municipality: e.muni, state: "Ciudad de México", postalCode: e.cp, country: "MX" } },
      },
    });
  }
}

// Duplicated tiny helpers to avoid importing server-only modules in seed script.
async function buildSnapshot(propertyId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { organization: { include: { brandingProfile: true } }, addresses: true, locations: true, media: true, demographics: true, commercialCtx: true },
  });
  if (!property) throw new Error("missing");
  const addr = property.addresses.find((a) => a.isPrimary) ?? property.addresses[0];
  const loc = property.locations[0];
  const hero = property.media.find((m) => m.kind === "hero");
  const branding = property.organization.brandingProfile;

  const commercialByRadius = new Map<number, { radiusMeters: number; byCategory: Record<string, { count: number; brands: string[] }> }>();
  for (const c of property.commercialCtx) {
    const band = commercialByRadius.get(c.radiusMeters) ?? { radiusMeters: c.radiusMeters, byCategory: {} };
    band.byCategory[c.category] = { count: c.count, brands: (c.notableBrands ?? "").split(",").map((s) => s.trim()).filter(Boolean) };
    commercialByRadius.set(c.radiusMeters, band);
  }

  return {
    property: {
      id: property.id, title: property.title, description: property.description, transactionType: property.transactionType,
      priceAmount: property.priceAmount, priceCurrency: property.priceCurrency, surfaceM2: property.surfaceM2,
      frontageM: property.frontageM, depthM: property.depthM, propertyUse: property.propertyUse,
      isCorner: property.isCorner, levels: property.levels, localUnits: property.localUnits,
      notableBrands: property.notableBrands, landUse: property.landUse, seduviFichaUrl: property.seduviFichaUrl,
      kmzUrl: property.kmzUrl, polygonGeoJson: property.polygonGeoJson,
    },
    address: addr ? { line1: addr.line1, line2: addr.line2, neighborhood: addr.neighborhood, municipality: addr.municipality, state: addr.state, postalCode: addr.postalCode } : null,
    location: loc ? { lat: loc.lat, lng: loc.lng } : null,
    heroPhotoUrl: hero?.url ?? null,
    branding: {
      companyName: branding?.companyName ?? property.organization.name,
      logoUrl: branding?.logoUrl ?? null,
      primaryColor: branding?.primaryColor ?? "#0E2A35",
      accentColor: branding?.accentColor ?? "#E4B43C",
      contactEmail: branding?.contactEmail, contactPhone: branding?.contactPhone, footerNote: branding?.footerNote,
    },
    demographics: property.demographics.map((d) => ({
      radiusMeters: d.radiusMeters, population: d.population, households: d.households, avgAge: d.avgAge,
      avgHouseholdIncome: d.avgHouseholdIncome, abc1Pct: d.socioeconomicAbc1Pct, c2Pct: d.socioeconomicC2Pct,
      cPct: d.socioeconomicCPct, dPct: d.socioeconomicDPct, ePct: d.socioeconomicEPct,
    })).sort((a, b) => a.radiusMeters - b.radiusMeters),
    commercial: Array.from(commercialByRadius.values()).sort((a, b) => a.radiusMeters - b.radiusMeters),
    sectionsFilled: { address: true, photo: true, landUse: true, demographics: true, commercial: true, polygon: true },
    generatedAt: new Date().toISOString(),
  };
}

function randomToken(len: number) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
