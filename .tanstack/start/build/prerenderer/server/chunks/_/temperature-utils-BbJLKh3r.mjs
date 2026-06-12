const fahrenheitToCelsius = (f) => {
  if (f === null || f === void 0) return f;
  return Math.round((f - 32) * 5 / 9 * 10) / 10;
};
const celsiusToFahrenheit = (c) => {
  if (c === null || c === void 0) return c;
  return Math.round((c * 9 / 5 + 32) * 10) / 10;
};
const formatTemperature = (temp, prefersCelsius, raw_data_format = "celsius") => {
  if (temp === null || temp === void 0) return "--";
  let value = temp;
  if (raw_data_format === "fahrenheit" && prefersCelsius) {
    value = fahrenheitToCelsius(temp);
  } else if (raw_data_format === "celsius" && !prefersCelsius) {
    value = celsiusToFahrenheit(temp);
  }
  const unit = prefersCelsius ? "\xB0C" : "\xB0F";
  return `${value}${unit}`;
};

export { celsiusToFahrenheit as c, formatTemperature as f };
//# sourceMappingURL=temperature-utils-BbJLKh3r.mjs.map
