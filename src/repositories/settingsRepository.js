// settings.repository.js
const Settings = require("../models/settingsModel");

exports.getSettingByKey = async (key) => {
  return Settings.findOne({ key });
};

exports.getSettingById = async (id) => {
  return Settings.findById(id);
};
exports.getAllSettings = async () => {
  return Settings.find({});
};

exports.createSetting = async (data) => {
  return Settings.create(data);
};

exports.updateSettingByID = async (id, updatedData) => {
  return Settings.findByIdAndUpdate(id, updatedData, {
    new: true,
    runValidators: true,
  });
};

exports.deleteSettingById = async (id) => {
  return Settings.findByIdAndDelete(id);
};

exports.updateSettingValue = async (key, value) => {
  return await Settings.findOneAndUpdate(
    { key },
    {
      $set: { value },
    },
    { new: true },
  );
};
