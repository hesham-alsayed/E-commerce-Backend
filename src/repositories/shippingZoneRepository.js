const ShippingZone = require("../models/shippingZoneModel");

// CREATE
exports.createZone = (data) => ShippingZone.create(data);

// GET ALL
exports.getAllZones = () => ShippingZone.find();

// GET BY ID
exports.getZoneById = (id) => ShippingZone.findById(id);

// UPDATE ZONE
exports.updateZone = (id, data) =>
  ShippingZone.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

// DELETE ZONE
exports.deleteZone = (id) => ShippingZone.findByIdAndDelete(id);

// ADD CITY
exports.addCity = (zoneId, cityData) =>
  ShippingZone.findByIdAndUpdate(
    zoneId,
    { $push: { cities: cityData } },
    { new: true, runValidators: true },
  );

// UPDATE CITY
exports.updateCity = (zoneId, cityId, data) =>
  ShippingZone.findOneAndUpdate(
    { _id: zoneId, "cities._id": cityId },
    {
      $set: {
        "cities.$.city": data.city,
        "cities.$.price": data.price,
        "cities.$.estimatedDays": data.estimatedDays,
        "cities.$.isActive": data.isActive,
      },
    },
    { new: true, runValidators: true },
  );

// DELETE CITY
exports.deleteCity = (zoneId, cityId) =>
  ShippingZone.findByIdAndUpdate(
    zoneId,
    { $pull: { cities: { _id: cityId } } },
    { new: true, runValidators: true },
  );

exports.updateManyZones = async (filter, data) => {
  return await ShippingZone.updateMany(filter, data);
};

exports.replaceAll = async (zones) => {
  await ShippingZone.deleteMany({});
  return ShippingZone.insertMany(zones);
};

exports.findZoneBySlug = (slug) => {
  return ShippingZone.findOne({ slug });
};

exports.findCityBySlug = (zoneId, slug) => {
  return ShippingZone.findOne({
    _id: zoneId,
    "cities.slug": slug,
  });
};