const mongoose = require("mongoose");
const repo = require("../repositories/shippingZoneRepository");
const AppError = require("../../utils/AppError");
const slugify = require("slugify");

/* =========================
   HELPERS
========================= */

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const assertId = (id, name = "id") => {
  if (!isValidId(id)) {
    throw new AppError(`Invalid ${name}`, 400);
  }
};

const normalize = (str) =>
  typeof str === "string"
    ? str.trim().toLowerCase().replace(/\s+/g, "_")
    : str;

const makeSlug = (str) =>
  slugify(str || "", { lower: true, strict: true });

/* =========================
   ZONES
========================= */

exports.createZone = async (data) => {
  if (!data?.name) throw new AppError("Zone name is required", 400);

  const name = normalize(data.name);
  const slug = makeSlug(data.name);

  const exists = await repo.findZoneBySlug(slug);
  if (exists) throw new AppError("Zone already exists", 409);

  return repo.createZone({
    ...data,
    name,
    slug,
  });
};

exports.getAllZones = async () => {
  return repo.getAllZones();
};

exports.getZoneById = async (id) => {
  assertId(id, "zoneId");

  const zone = await repo.getZoneById(id);
  if (!zone) throw new AppError("Zone not found", 404);

  return zone;
};

exports.updateZone = async (id, data) => {
  assertId(id, "zoneId");

  if (!data || Object.keys(data).length === 0) {
    throw new AppError("No data provided to update", 400);
  }

  if (data.name) {
    const name = normalize(data.name);
    const slug = makeSlug(data.name);

    const exists = await repo.findZoneBySlug(slug);

    if (exists && exists._id.toString() !== id) {
      throw new AppError("Zone already exists", 409);
    }

    data.name = name;
    data.slug = slug;
  }

  const updated = await repo.updateZone(id, data);

  if (!updated) throw new AppError("Zone not found", 404);

  return updated;
};

exports.deleteZone = async (id) => {
  assertId(id, "zoneId");

  const deleted = await repo.deleteZone(id);

  if (!deleted) throw new AppError("Zone not found", 404);

  return deleted;
};

/* =========================
   CITIES
========================= */

exports.addCity = async (zoneId, data) => {
  assertId(zoneId, "zoneId");

  if (!data?.city) throw new AppError("City name is required", 400);

  const city = normalize(data.city);
  const slug = makeSlug(data.city);

  const exists = await repo.findCityBySlug(zoneId, slug);

  if (exists) {
    throw new AppError("City already exists in this zone", 409);
  }

  return repo.addCity(zoneId, {
    ...data,
    city,
    slug,
  });
};

exports.updateCity = async (zoneId, cityId, data) => {
  assertId(zoneId, "zoneId");
  assertId(cityId, "cityId");

  if (!data || Object.keys(data).length === 0) {
    throw new AppError("No data provided to update city", 400);
  }

  if (data.city) {
    const city = normalize(data.city);
    const slug = makeSlug(data.city);

    const exists = await repo.findCityBySlug(zoneId, slug);

    if (exists && exists._id.toString() !== cityId) {
      throw new AppError("City already exists in this zone", 409);
    }

    data.city = city;
    data.slug = slug;
  }

  data.zoneId = undefined;

  const updated = await repo.updateCity(zoneId, cityId, data);

  if (!updated) throw new AppError("City not found", 404);

  return updated;
};

exports.deleteCity = async (zoneId, cityId) => {
  assertId(zoneId, "zoneId");
  assertId(cityId, "cityId");

  const deleted = await repo.deleteCity(zoneId, cityId);

  if (!deleted) throw new AppError("City not found", 404);

  return deleted;
};

/* =========================
   TOGGLE ALL
========================= */

exports.toggleAllZones = async (active) => {
  if (typeof active !== "boolean") {
    throw new AppError("active must be boolean", 400);
  }

  const result = await repo.updateManyZones({}, { isActive: active });

  return {
    updated: result.modifiedCount,
    isActive: active,
  };
};

/* =========================
   SAVE ALL ZONES
========================= */

exports.saveZones = async (zones) => {
  if (!Array.isArray(zones)) {
    throw new AppError("Zones must be an array", 400);
  }

  const normalized = zones.map((z) => ({
    ...z,
    name: normalize(z.name),
    slug: makeSlug(z.name),
    cities: (z.cities || []).map((c) => ({
      ...c,
      city: normalize(c.city),
      slug: makeSlug(c.city),
    })),
  }));

  return repo.replaceAll(normalized);
};