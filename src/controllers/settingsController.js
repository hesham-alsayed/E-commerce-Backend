const settingsService = require("../services/settingsService");

// ---------------------------
// GET /settings
// ---------------------------
exports.getAllSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getAllSettings();
    res
      .status(200)
      .json({ status: "success", result: settings.length, data: settings });
  } catch (err) {
    next(err); // تمرير الخطأ للـ global error middleware
  }
};

// ---------------------------
// GET /settings/:key
// ---------------------------
exports.getSettingByKey = async (req, res, next) => {
  try {
    const { key } = req.params;
    const setting = await settingsService.getSettingByKey(key);
    res.status(200).json({ status: "success", setting });
  } catch (err) {
    next(err);
  }
};

// ---------------------------
// GET /settings/id/:id
// ---------------------------
exports.getSettingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const setting = await settingsService.getSettingById(id);
    res.status(200).json({ status: "success", data: setting });
  } catch (err) {
    next(err);
  }
};

// ---------------------------
// POST /settings
// ---------------------------
exports.createSetting = async (req, res, next) => {
  try {
    const data = req.body;
    const setting = await settingsService.createSetting(data);
    res.status(201).json({ status: "success", data: setting });
  } catch (err) {
    next(err);
  }
};

// ---------------------------
// PATCH /settings/:id
// ---------------------------
exports.updateSetting = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const updatedSetting = await settingsService.updateSetting(id, updateData);
    res.status(200).json({ status: "success", data: updatedSetting });
  } catch (err) {
    next(err);
  }
};

// ---------------------------
// DELETE /settings/:key
// ---------------------------
exports.deleteSetting = async (req, res, next) => {
  try {
    const { id } = req.params;
    await settingsService.deleteSetting(id);
    res.status(204).json({ status: "success", data: null });
  } catch (err) {
    next(err);
  }
};

// ---------------------------
// POST /settings/:id/value
// ---------------------------

exports.createValue = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(id)
    const valueData = req.body;
    console.log(valueData);

    const setting = await settingsService.createValue(id, valueData); 
    console.log(setting , "=========================");
    res.status(201).json({
      status: "success",
      resultValues: setting.value.length,
      setting,
    });
  } catch (err) { 
    log(err);
    next(err);
  }
};

// ---------------------------
// PATCH /settings/:settingId/value/:valueId
// ---------------------------
exports.updateValue = async (req, res, next) => {
  try {
    const { settingId, valueId } = req.params;
    const updateData = req.body;

    const setting = await settingsService.updateValue(
      settingId,
      valueId,
      updateData,
    );

    const updatedValue = setting.value.find(
      (v) => v._id.toString() === valueId,
    );

    res.status(200).json({
      status: "success",
      value: updatedValue,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------
// DELETE /settings/value/:valueId
// ---------------------------
exports.deleteValue = async (req, res, next) => {
  try {
    const { settingId, valueId } = req.params;
    const setting = await settingsService.deleteValue(settingId, valueId);
    res.status(200).json({
      status: "success",
      resultValues: setting.value.length,
      message: " value delete success",
    });
  } catch (err) {
    next(err);
  }
};

exports.updateGeneralSetting = async (req, res, next) => {
  try {
    const { type, status } = req.body;
    const updatedSetting = await settingsService.toggleSetting(type, status);
    res.status(200).json({
      status: "success",
      data: updatedSetting,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateAllGeneralSettings = async (req, res, next) => {
  try {
    const settingId = req.params.settingId;
    const { enabled } = req.body;
    const setting = await settingsService.toggleGlobalSetting(
      settingId,
      enabled,
    );
    res.status(200).json({
      status: "success",
      setting,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateSettingValueArray = async (req, res, next) => {
  try {
    console.log("🔥 HIT UPDATE API"); // 👈 مهم

    const { key } = req.params;
    const { value } = req.body; // 👈 full updated array

    const updated = await settingsService.updateValueArray(key, value);

    return res.status(200).json({
      success: true,
      message: "Settings updated successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
};
