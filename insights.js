const insightRules = Object.freeze({
  rain: 60,
  uv: 3,
  wind: 40,
  temperatureChange: 6,
  outdoorRain: 25,
  outdoorWind: 25,
  outdoorMinTemperature: 16,
  outdoorMaxTemperature: 30,
  outdoorHours: 2,
  outdoorWeatherCodes: Object.freeze([0, 1, 2, 3]),
});

function buildWeatherInsights(daily, dayIndex, samples) {
  const rules = insightRules;
  const today = (key) => daily[key]?.[dayIndex];
  const [minimum, maximum, chance, uv, code] = [
    "temperature_2m_min", "temperature_2m_max", "precipitation_probability_max", "uv_index_max", "weather_code",
  ].map(today);
  const summary = [];
  if (Number.isFinite(code)) summary.push(describeWeather(code)[0]);
  if (Number.isFinite(minimum)) summary.push("mínima de " + formatReading(minimum, " °C"));
  if (Number.isFinite(maximum)) summary.push("máxima de " + formatReading(maximum, " °C"));
  if (Number.isFinite(chance)) summary.push("chance de chuva de até " + formatReading(chance, "%"));
  if (Number.isFinite(uv)) summary.push("UV máximo " + describeUv(uv).reading);

  const entries = [];
  for (const [key, threshold, icon, title, measure, suggestion] of [
    ["precipitation_probability", rules.rain, "☂", "Chance de chuva", (value) => formatReading(value, "%"),
      "Considere levar um guarda-chuva ao sair."],
    ["uv_index", rules.uv, "☀", "Exposição ao sol", (value) => describeUv(value).reading,
      "Prefira sombra e use proteção solar em atividades ao ar livre."],
    ["wind_speed_10m", rules.wind, "≋", "Vento forte", (value) => formatReading(value, " km/h"),
      "O vento pode dificultar atividades em locais expostos. Considere um local abrigado."],
  ]) {
    const periods = consecutiveForecastPeriods(samples, (sample) => Number.isFinite(sample[key]) &&
      (key === "uv_index" ? Math.round(sample[key]) : sample[key]) >= threshold);
    const peaks = periods.map((period) => ({
      period, peak: period.reduce((best, sample) => sample[key] > best[key] ? sample : best),
    }));
    peaks.sort((a, b) => b.peak[key] - a.peak[key] || b.period.length - a.period.length);
    if (!peaks.length) continue;
    const { period, peak } = peaks[0];
    entries.push({ icon, title, period, sample: peak, text: "Até " + measure(peak[key]) + ". " + suggestion });
  }

  let change;
  for (const period of consecutiveForecastPeriods(samples, (sample) => Number.isFinite(sample.temperature_2m))) {
    const low = period.reduce((a, b) => b.temperature_2m < a.temperature_2m ? b : a);
    const high = period.reduce((a, b) => b.temperature_2m > a.temperature_2m ? b : a);
    const difference = high.temperature_2m - low.temperature_2m;
    if (difference < rules.temperatureChange || (change && difference <= change.difference)) continue;
    change = { difference, period: [low, high].sort((a, b) => a.timestamp - b.timestamp) };
  }
  if (change) {
    const [first, last] = change.period;
    entries.push({
      icon: "↕", title: first.temperature_2m < last.temperature_2m ? "Aquecimento previsto" : "Resfriamento previsto",
      period: change.period, sample: last,
      text: "De " + formatReading(first.temperature_2m, " °C") + " para " +
        formatReading(last.temperature_2m, " °C") + ". Planeje a roupa para os dois horários.",
    });
  }

  const byTime = new Map(samples.map((sample) => [sample.timestamp, sample]));
  const outdoor = consecutiveForecastPeriods(samples, (sample) => sample.is_day === 1 &&
    rules.outdoorWeatherCodes.includes(sample.weather_code) &&
    Number.isFinite(sample.precipitation_probability) && sample.precipitation_probability <= rules.outdoorRain &&
    Number.isFinite(sample.uv_index) && Math.round(sample.uv_index) < rules.uv &&
    Number.isFinite(sample.wind_speed_10m) && sample.wind_speed_10m < rules.outdoorWind &&
    Number.isFinite(sample.temperature_2m) && sample.temperature_2m >= rules.outdoorMinTemperature &&
    sample.temperature_2m <= rules.outdoorMaxTemperature &&
    !advisoryLevel(sample.wind_gusts_10m, advisoryRules.gusts) &&
    !advisoryLevel(sample.precipitation, advisoryRules.rain) &&
    !advisoryLevel(byTime.get(sample.timestamp + 3600)?.precipitation, advisoryRules.rain))
    .filter((period) => period.length >= rules.outdoorHours)
    .sort((a, b) => b.length - a.length)[0];
  if (outdoor) {
    entries.push({
      icon: "◉", title: "Período favorável ao ar livre", period: outdoor, sample: outdoor[0],
      text: "A previsão indica chuva pouco provável, UV baixo, vento mais fraco e temperatura amena.",
    });
  }

  return { summary, entries };
}

function renderWeatherInsights(panel, daily, dayIndex, samples) {
  const { summary, entries } = buildWeatherInsights(daily, dayIndex, samples);
  panel.querySelector(".insights-summary").textContent = summary.length
    ? "Hoje: " + summary.join(" · ") + "."
    : "Resumo de hoje indisponível para esta cidade.";
  const empty = panel.querySelector(".insights-empty");
  empty.hidden = entries.length > 0;
  const hasReadings = samples.some((sample) =>
    ["precipitation_probability", "uv_index", "wind_speed_10m", "temperature_2m"]
      .some((key) => Number.isFinite(sample[key])));
  empty.textContent = hasReadings
    ? "As leituras disponíveis não indicam recomendações pelos critérios abaixo."
    : "Previsão horária insuficiente para recomendar um horário.";
  const template = panel.querySelector("template");
  const preview = panel.querySelector(".insights-preview");
  const more = panel.querySelector(".insights-more");
  const extra = more.querySelector(".insights-extra");
  const active = document.activeElement;
  const focused = active.closest(".insights-list") ? active.getAttribute("aria-label") : undefined;
  const items = entries.map((entry) => {
    const item = template.content.cloneNode(true);
    item.querySelector(".insights-icon").textContent = entry.icon;
    item.querySelector("h3").textContent = entry.title;
    item.querySelector(".insights-time").textContent = forecastTimeRange(entry.period);
    item.querySelector(".insights-advice").textContent = entry.text;
    const button = item.querySelector("button");
    button.dataset.timestamp = entry.sample.timestamp;
    button.setAttribute("aria-label", "Ver previsão para " + entry.sample.label + " · " + entry.title);
    return item;
  });
  preview.replaceChildren(...items.slice(0, 1));
  extra.replaceChildren(...items.slice(1));
  const remaining = Math.max(entries.length - 1, 0);
  more.hidden = remaining === 0;
  if (more.hidden) more.open = false;
  const moreToggle = more.querySelector("summary");
  moreToggle.textContent = remaining === 1 ? "Mais 1 sugestão" : "Mais " + remaining + " sugestões";
  if (focused) {
    const replacement = Array.from(panel.querySelectorAll(".insights-hour"))
      .find((button) => button.getAttribute("aria-label") === focused);
    if (replacement && extra.contains(replacement)) more.open = true;
    (replacement ?? (more.hidden ? panel.querySelector(".insights-method summary") : moreToggle))
      .focus({ preventScroll: true });
  } else if (active === moreToggle && more.hidden) {
    panel.querySelector(".insights-method summary").focus({ preventScroll: true });
  }
  panel.querySelector(".insights-criteria").textContent =
    "Chuva a partir de " + formatReading(insightRules.rain, "%") + ", UV a partir de " + insightRules.uv +
    " (moderado ou maior, após arredondar), vento a partir de " + formatReading(insightRules.wind, " km/h") +
    " e variação de temperatura de pelo menos " +
    formatReading(insightRules.temperatureChange, " °C", true).replace(/^\+/, "") +
    " em horas consecutivas com dados. Para atividades ao ar livre, buscamos pelo menos " +
    insightRules.outdoorHours + " horários seguidos com luz do dia, condição de céu limpo a encoberto, chance de chuva de até " +
    formatReading(insightRules.outdoorRain, "%") + ", UV baixo, vento abaixo de " +
    formatReading(insightRules.outdoorWind, " km/h") + " e temperatura entre " +
    formatReading(insightRules.outdoorMinTemperature, " °C") + " e " +
    formatReading(insightRules.outdoorMaxTemperature, " °C") +
    ". Rajadas e chuva intensa também excluem horários quando esses dados estão disponíveis.";
}
