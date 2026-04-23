import { prisma } from "@/lib/db";
import { logAudit } from "./audit";
import { enqueue } from "@/server/jobs/queue";
import { allocateTicketNumber } from "./ticket";

export type CreatePropertyInput = {
  organizationId: string;
  createdById: string;
  inputMethod: "mobile_photo" | "desktop_address" | "manual";
  transactionType?: "sale" | "rent" | "acquisition";

  // Acquisition CRM fields (Etapa 1)
  acquisitionStage?: "analyzing" | "authorized" | "canceled" | "signing" | "signed";
  propertyType?: "terreno" | "local" | "bodega" | "otro";
  occupancyStatus?: "rented" | "vacant";
  currentTenant?: string;
  currentRent?: number;
  potentialTenant?: string;
  responsableInternoId?: string;
  responsableExternoName?: string;
  responsableExternoEmail?: string;
  responsableExternoPhone?: string;

  title?: string;
  description?: string;
  priceAmount?: number;
  priceCurrency?: string;
  surfaceM2?: number;
  frontageM?: number;
  depthM?: number;
  propertyUse?: string;
  isCorner?: boolean;
  levels?: number;
  localUnits?: number;
  notableBrands?: string;
  address: {
    line1: string;
    line2?: string;
    neighborhood?: string;
    municipality?: string;
    state?: string;
    postalCode?: string;
  };
  location?: {
    lat: number;
    lng: number;
    accuracyMeters?: number;
    source: string;
    kind?: "original" | "corrected" | "geocoded";
  };
  photoUrl?: string;
  photoStorageKey?: string;

  // Pre-uploaded documents
  seduviFichaUploadedUrl?: string;
  kmzUploadedUrl?: string;
  kmzPolygonGeoJson?: string;
};

export async function createProperty(input: CreatePropertyInput) {
  const ticketNumber = await allocateTicketNumber(input.organizationId);

  const p = await prisma.property.create({
    data: {
      organizationId: input.organizationId,
      createdById: input.createdById,
      inputMethod: input.inputMethod,
      transactionType: input.transactionType ?? "acquisition",
      ticketNumber,
      acquisitionStage: input.acquisitionStage ?? "analyzing",
      propertyType: input.propertyType,
      occupancyStatus: input.occupancyStatus,
      currentTenant: input.currentTenant,
      currentRent: input.currentRent,
      potentialTenant: input.potentialTenant,
      responsableInternoId: input.responsableInternoId,
      responsableExternoName: input.responsableExternoName,
      responsableExternoEmail: input.responsableExternoEmail,
      responsableExternoPhone: input.responsableExternoPhone,
      polygonGeoJson: input.kmzPolygonGeoJson,
      title: input.title,
      description: input.description,
      priceAmount: input.priceAmount,
      priceCurrency: input.priceCurrency ?? "MXN",
      surfaceM2: input.surfaceM2,
      frontageM: input.frontageM,
      depthM: input.depthM,
      propertyUse: input.propertyUse,
      isCorner: input.isCorner ?? false,
      levels: input.levels,
      localUnits: input.localUnits,
      notableBrands: input.notableBrands,
      status: "draft",
      addresses: {
        create: {
          source: "user",
          isPrimary: true,
          line1: input.address.line1,
          line2: input.address.line2,
          neighborhood: input.address.neighborhood,
          municipality: input.address.municipality,
          state: input.address.state,
          postalCode: input.address.postalCode,
          country: "MX",
        },
      },
      locations: input.location
        ? {
            create: {
              kind: input.location.kind ?? "original",
              lat: input.location.lat,
              lng: input.location.lng,
              accuracyMeters: input.location.accuracyMeters,
              source: input.location.source,
            },
          }
        : undefined,
      media: input.photoUrl && input.photoStorageKey
        ? {
            create: {
              kind: "hero",
              url: input.photoUrl,
              storageKey: input.photoStorageKey,
              uploadedById: input.createdById,
            },
          }
        : undefined,
      inputs: {
        create: {
          method: input.inputMethod,
          rawPayload: JSON.stringify(input),
        },
      },
      documents: {
        create: [
          ...(input.seduviFichaUploadedUrl
            ? [{ kind: "seduvi_ficha_uploaded", url: input.seduviFichaUploadedUrl, label: "Ficha SEDUVI (cargada)" }]
            : []),
          ...(input.kmzUploadedUrl
            ? [{ kind: "kmz_uploaded", url: input.kmzUploadedUrl, label: "KMZ (cargado)" }]
            : []),
        ],
      },
    },
    include: { addresses: true, locations: true, media: true, documents: true },
  });

  await logAudit({
    organizationId: input.organizationId,
    actorId: input.createdById,
    action: "property.create",
    targetType: "property",
    targetId: p.id,
    metadata: { ticketNumber, inputMethod: input.inputMethod, acquisitionStage: p.acquisitionStage },
  });

  // Only fire auto-enrichment for the original broker flow (sale/rent).
  // Acquisition CRM flow is manual — brokers upload SEDUVI PDF + KMZ themselves.
  if (input.transactionType !== "acquisition") {
    await enqueue("enrich_property", { propertyId: p.id });
  }

  return p;
}

export async function changeAcquisitionStage(
  organizationId: string,
  propertyId: string,
  newStage: string,
  actorId: string,
) {
  const current = await prisma.property.findUnique({ where: { id: propertyId }, select: { acquisitionStage: true } });
  await prisma.property.update({
    where: { id: propertyId },
    data: { acquisitionStage: newStage },
  });
  await logAudit({
    organizationId, actorId, action: "property.stage_change",
    targetType: "property", targetId: propertyId,
    metadata: { from: current?.acquisitionStage, to: newStage },
  });
}

export async function correctPin(
  organizationId: string,
  propertyId: string,
  lat: number,
  lng: number,
  actorId: string,
) {
  // Business rule: original coordinates from geophoto must remain immutable.
  // Corrected coordinates are stored as a separate location record.
  await prisma.propertyLocation.create({
    data: {
      propertyId,
      kind: "corrected",
      lat,
      lng,
      source: "user_pin",
    },
  });
  await logAudit({
    organizationId, actorId, action: "property.pin_corrected",
    targetType: "property", targetId: propertyId, metadata: { lat, lng },
  });
}
