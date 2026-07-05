const ORDER_FLOW = {
  pending: ["processing", "cancelled"],
  processing: ["processing", "shipped", "cancelled"],
  shipped: ["delivered"], // (لو عايز تسمح بإلغاء إداري فقط)
  delivered: [],
  cancelled: [],
};

const STATUS_PRIORITY = {
  cancelled: 0,
  pending: 1,
  processing: 2,
  shipped: 3,
  delivered: 4,
};

exports.isValidNextStep = (current, next) => {
  if (!current || !next) return false;

  const from = current.toLowerCase();
  const to = next.toLowerCase();

  if (!ORDER_FLOW[from] || !ORDER_FLOW[to]) return false;

  if (!ORDER_FLOW[from].includes(to)) return false;

  // prevent rollback
  if (to !== "cancelled" && STATUS_PRIORITY[to] < STATUS_PRIORITY[from]) {
    return false;
  }

  return true;
};


exports.canDecreaseStock = (from, to) =>
  from === "pending" && to === "processing";

exports.canRestoreStock = (from, to) =>
  ["processing", "shipped"].includes(from) && to === "cancelled";
