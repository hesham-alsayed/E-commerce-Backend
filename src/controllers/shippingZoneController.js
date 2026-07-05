const service = require("../services/shippingZoneService");

/* =========================
   ZONES
========================= */

// CREATE ZONE
exports.createZone = async (req, res, next) => {
  try {
    const zone = await service.createZone(req.body);

    res.status(201).json({
      status: "success",
      data: zone,
    });
  } catch (err) {
    next(err);
  }
};

// GET ALL ZONES
exports.getAllZones = async (req, res, next) => {
  try {
    const zones = await service.getAllZones();

    res.status(200).json({
      status: "success",
      results: zones.length,
      zones,
    });
  } catch (err) {
    next(err);
  }
};

// GET ONE ZONE
exports.getZone = async (req, res, next) => {
  try {
    const zone = await service.getZoneById(req.params.id);

    res.status(200).json({
      status: "success",
      data: zone,
    });
  } catch (err) {
    next(err);
  }
};

// UPDATE ZONE
exports.updateZone = async (req, res, next) => {
  try {
    const zone = await service.updateZone(req.params.id, req.body);

    res.status(200).json({
      status: "success",
      data: zone,
    });
  } catch (err) {
    next(err);
  }
};

// DELETE ZONE
exports.deleteZone = async (req, res, next) => {
  try {
    await service.deleteZone(req.params.id);

    res.status(200).json({
      status: "success",
      message: "Zone deleted",
    });
  } catch (err) {
    next(err);
  }
};

/* =========================
   CITIES
========================= */

// ADD CITY
exports.addCity = async (req, res, next) => {
  try {
    const zone = await service.addCity(req.params.zoneId, req.body);

    res.status(200).json({
      status: "success",
      data: zone,
    });
  } catch (err) {
    next(err);
  }
};

// UPDATE CITY
exports.updateCity = async (req, res, next) => {
  try {
    const zone = await service.updateCity(
      req.params.zoneId,
      req.params.cityId,
      req.body,
    );

    res.status(200).json({
      status: "success",
      data: zone,
    });
  } catch (err) {
    next(err);
  }
};

// DELETE CITY
exports.deleteCity = async (req, res, next) => {
  try {
    const zone = await service.deleteCity(req.params.zoneId, req.params.cityId);

    res.status(200).json({
      status: "success",
      data: zone,
    });
  } catch (err) {
    next(err);
  }
};

exports.toggleAllZones = async (req, res) => {
  try {
    const { active } = req.body;
    console.log("active", active);

    const result = await service.toggleAllZones(active);

    return res.status(200).json({
      success: true,
      message: active ? "All zones activated" : "All zones deactivated",
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

exports.saveZones = async (req, res, next) => {
  try {
    const { value } = req.body;

    const zones = await service.saveZones(value);

    res.json({
      success: true,
      message: "Zones updated successfully",
      zones,
    });
  } catch (err) {
    next(err);
  }
};
