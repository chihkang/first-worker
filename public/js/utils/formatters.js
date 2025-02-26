// src/utils/formatters.ts
function formatMillions(value) {
  return (value / 1e6).toFixed(2) + "M";
}
function formatDate(date) {
  return new Date(date).toLocaleDateString("zh-TW");
}
function formatCurrency(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: "TWD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}
function formatPercent(value) {
  return new Intl.NumberFormat("zh-TW", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value / 100);
}
var formatters = {
  formatMillions,
  formatDate,
  formatCurrency,
  formatPercent
};
export {
  formatCurrency,
  formatDate,
  formatMillions,
  formatPercent,
  formatters
};
