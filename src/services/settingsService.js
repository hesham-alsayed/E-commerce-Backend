// settings.service.js
const mongoose = require("mongoose");
const AppError = require("../../utils/AppError");
const settingsModel = require("../models/settingsModel");
const settingsRepository = require("../repositories/settingsRepository");
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const normalizeType = (value) => {
  if (!value || typeof value !== "string") return "";

  return value.trim().toLowerCase().replace(/\s+/g, "_");
};

exports.getSettingByKey = async (key) => {
  if (!key) throw new AppError("Key is required", 400);
  const setting = await settingsRepository.getSettingByKey(key);
  if (!setting) throw new AppError("Setting not found", 404);
  return setting;
};

exports.checkFreeShipping = async () => {
  const settings = await settingsModel.findOne({
    key: "general_settings",
  });

  const value = settings?.value || [];

  const freeShipping = value.find((s) => s.type === "freeShippingThreshold");

  if (!freeShipping?.enabled) return null;

  return {
    type: freeShipping.type,
    value: Number(freeShipping.value),
    enabled: freeShipping.enabled,
  };
};

exports.getSettingById = async (id) => {
  if (!id) throw new AppError(" ID is required", 400);
  const setting = await settingsRepository.getSettingById(id);
  if (!setting) throw new AppError("Setting not found", 404);
  return setting;
};
exports.getAllSettings = async () => {
  return settingsRepository.getAllSettings();
};

exports.createSetting = async (data) => {
  if (!data.key) {
    throw new AppError("setting Key is required", 400);
  }

  // 🔥 normalize key
  const normalizedKey = normalizeType(data.key);

  const exists = await settingsRepository.getSettingByKey(normalizedKey);

  if (exists) {
    throw new AppError("Setting already exists", 400);
  }

  const setting = await settingsRepository.createSetting({
    ...data,
    key: normalizedKey,
  });

  return setting;
};

exports.updateSetting = async (settingId, updateData) => {
  const allowedFields = ["enabled", "description"];
  const filteredData = {};

  Object.keys(updateData).forEach((key) => {
    if (allowedFields.includes(key)) {
      filteredData[key] = updateData[key];
    }
  });

  if (Object.keys(filteredData).length === 0) {
    throw new AppError("No valid fields provided to update", 400);
  }

  const existSetting = await settingsRepository.getSettingById(settingId);

  if (!existSetting) {
    throw new AppError("Setting not found", 404);
  }

  const updatedSetting = await settingsRepository.updateSettingByID(
    settingId,
    filteredData,
  );

  return updatedSetting;
};

exports.deleteSetting = async (id) => {
  if (!id) throw new AppError("id is required", 400);

  const deleted = await settingsRepository.deleteSettingById(id);
  if (!deleted) throw new AppError("Setting not found", 404);

  return deleted;
};
// ---------------------------------------------------------------------

exports.createValue = async (settingId, valueData) => {
  if (!settingId) throw new AppError("setting ID is required", 400);
  if (!valueData.type) throw new AppError("Value type is required", 400);

  console.log("SETTING ID:", settingId);
  console.log("VALUE DATA:", valueData);
  const setting = await settingsRepository.getSettingById(settingId);

  if (!setting) {
    throw new AppError("Setting not found. Please create setting first.", 404);
  }

  // 🔥 normalize input
  const normalizedType = normalizeType(valueData.type);

  // 🔥 check duplicates safely
  const exists = setting.value.find(
    (v) => normalizeType(v.type) === normalizedType,
  );

  if (exists) {
    throw new AppError(`type "${valueData.type}" already exists`, 400);
  }

  // store normalized type
  setting.value.push({
    ...valueData,
    type: normalizedType,
  });

  await setting.save();
  return setting;
};

exports.updateValue = async (settingId, valueId, updateData) => {
  if (!settingId) throw new AppError("Setting ID is required", 400);
  if (!valueId) throw new AppError("Value ID is required", 400);

  if (!isValidId(settingId)) throw new AppError("Invalid setting ID", 400);
  if (!isValidId(valueId)) throw new AppError("Invalid value ID", 400);
  if (updateData.type) {
    throw new AppError("type value can not changed", 400);
    return;
  }
  const setting = await settingsRepository.getSettingById(settingId);

  if (!setting) {
    throw new AppError("Setting not found", 404);
  }

  const value = setting.value.id(valueId);

  if (!value) {
    throw new AppError("Value not found in setting", 404);
  }

  // 🔥 normalize type if exists in update
  if (updateData.type) {
    updateData.type = normalizeType(updateData.type);

    // optional: prevent duplicates on update
    const duplicate = setting.value.find(
      (v) =>
        v._id.toString() !== valueId &&
        normalizeType(v.type) === updateData.type,
    );

    if (duplicate) {
      throw new AppError(`type "${updateData.type}" already exists`, 400);
    }
  }

  // apply update
  Object.keys(updateData).forEach((key) => {
    value[key] = updateData[key];
  });

  await setting.save();
  return setting;
};

exports.deleteValue = async (settingId, valueId) => {
  if (!settingId || !valueId)
    throw new AppError("setting ID , value ID is required", 400);
  if (!isValidId(valueId) || !isValidId(settingId))
    throw new AppError("Invalid value id or Setting Id", 400);

  const setting = await settingsModel.findById(settingId);
  if (!setting) throw new AppError("setting Id or Value Id not found", 404);

  setting.value = setting.value.filter((v) => v._id.toString() !== valueId);
  await setting.save();
  return setting;
};

exports.toggleSetting = async (type, status) => {
  const settings = await settingsRepository.getSettingByKey("general_settings");
  const item = settings.value.find((v) => v.type === type);
  if (item) {
    item.enabled = status;
    await settings.save();
    return item;
  }
  throw new Error("Setting not found");
};

exports.toggleGlobalSetting = async (settingId, enabled) => {
  const setting = await settingsRepository.getSettingById(settingId);
  setting.enabled = enabled;
  await setting.save();
  return setting;
};

exports.updateValueArray = async (key, valueArray) => {
  if (!Array.isArray(valueArray)) {
    throw new Error("Value must be an array");
  }

  const updated = await settingsRepository.updateSettingValue(key, valueArray);

  if (!updated) {
    throw new Error("Failed to update settings");
  }

  return updated;
};
