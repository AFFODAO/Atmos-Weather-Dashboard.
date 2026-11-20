const advisoryRules = {
  wind: { moderate: 40, high: 60 },
  gusts: { moderate: 55, high: 75 },
  rain: { moderate: 10, high: 25 },
  uv: { moderate: 6, high: 8 },
  heat: { moderate: 35, high: 40 },
  thunder: { codes: [95, 96, 99], hail: [96, 99] },
};

function advisoryLevel(value, { moderate, high }) {
  if (!Number.isFinite(value) || value < moderate) return 0;
  return value >= high ? 2 : 1;
}

function buildForecastAdvisories(samples, elapsedHour) {
  const rules = advisoryRules;
  const checks = [
    {
      id: "vento", title: "Vento e rajadas",
      level: (sample) => Math.max(advisoryLevel(sample.wind_speed_10m, rules.wind), advisoryLevel(sample.wind_gusts_10m, rules.gusts)),
      reason: (period) => [
        ["Vento", "wind_speed_10m", rules.wind, " km/h"],
        ["Rajadas", "wind_gusts_10m", rules.gusts, " km/h"],
      ].flatMap(([label, key, rule, unit]) => {
        const peak = Math.max(...period.map((sample) => sample[key]).filter(Number.isFinite));
        return advisoryLevel(peak, rule)
          ? [label + " de até " + formatReading(peak, unit) + " (critério a partir de " + formatReading(rule.moderate, unit) + ")"]
          : [];
      }).join(". ") + ".",
    },
    {
      id: "chuva", title: "Chuva intensa",
      level: (sample) => sample.timestamp > elapsedHour ? advisoryLevel(sample.precipitation, rules.rain) : 0,
      reason: (period) => "Até " + formatReading(Math.max(...period.map((sample) => sample.precipitation)), " mm") +
        " acumulados na hora que termina no horário indicado. O critério começa em " + formatReading(rules.rain.moderate, " mm") + " em uma hora.",
    },
    {
      id: "trovoadas", title: "Trovoadas",
      level: (sample) => rules.thunder.hail.includes(sample.weather_code) ? 2 : Number(rules.thunder.codes.includes(sample.weather_code)),
      reason: (period) => period.some((sample) => rules.thunder.hail.includes(sample.weather_code))
        ? "A previsão indica trovoadas com granizo no período." : "A previsão indica trovoadas no período.",
    },
    {
      id: "uv", title: "Índice UV alto",
      level: (sample) => advisoryLevel(Math.round(sample.uv_index ?? NaN), rules.uv),
      reason: (period) => "UV previsto de até " + describeUv(Math.max(...period.map((sample) => sample.uv_index))).reading +
        ". O critério começa na faixa alta, com índice " + rules.uv + ".",
    },
    {
      id: "calor", title: "Temperatura elevada",
      level: (sample) => advisoryLevel(sample.temperature_2m, rules.heat),
      reason: (period) => "Temperatura prevista de até " +
        formatReading(Math.max(...period.map((sample) => sample.temperature_2m)), " °C") +
        ". O critério começa em " + formatReading(rules.heat.moderate, " °C") + ".",
    },
  ];
  return checks.flatMap(({ id, title, level, reason }) =>
    consecutiveForecastPeriods(samples, (sample) => level(sample) > 0).map((period) => ({
      id: id + "-" + period[0].timestamp, title, period,
      level: Math.max(...period.map(level)), reason: reason(period),
    }))).sort((a, b) => b.level - a.level || a.period[0].timestamp - b.period[0].timestamp);
}

function renderForecastAdvisories(dialog, button, samples, currentHour, location, loadedAt, updatedLabel) {
  const advisories = buildForecastAdvisories(samples, currentHour);
  const count = advisories.length;
  button.querySelector(".advisory-count").textContent = count;
  button.setAttribute("aria-label", "Avisos baseados na previsão: " + count + (count === 1 ? " aviso" : " avisos"));
  dialog.querySelector(".advisory-city").textContent = [location.name, cityRegion(location)].filter(Boolean).join(" · ");
  const updated = dialog.querySelector(".advisory-updated");
  updated.dateTime = loadedAt.toISOString();
  updated.textContent = updatedLabel;
  dialog.querySelector(".advisory-source").hidden = false;
  const empty = dialog.querySelector(".advisory-empty");
  empty.hidden = count > 0;
  const hasReadings = samples.some((sample) =>
    ["wind_speed_10m", "wind_gusts_10m", "uv_index", "temperature_2m"].some((key) => Number.isFinite(sample[key])) ||
    (sample.timestamp > currentHour && Number.isFinite(sample.precipitation)) || Number.isFinite(sample.weather_code));
  empty.textContent = hasReadings ? "Nenhum aviso identificado nos dados disponíveis."
    : "Dados horários insuficientes para avaliar as condições.";
  const limits = (rule, unit) => formatReading(rule.moderate, unit) + " / " + formatReading(rule.high, unit);
  dialog.querySelector(".advisory-method").hidden = false;
  dialog.querySelector(".advisory-thresholds").textContent =
    "Limites inclusivos para Atenção / Elevado. Vento: " + limits(advisoryRules.wind, " km/h") +
    ". Rajadas: " + limits(advisoryRules.gusts, " km/h") +
    ". Chuva em uma hora: " + limits(advisoryRules.rain, " mm") +
    ". Índice UV arredondado: " + limits(advisoryRules.uv, "") +
    ". Temperatura: " + limits(advisoryRules.heat, " °C") +
    ". Trovoadas: Atenção. Trovoadas com granizo: Elevado.";

  const list = dialog.querySelector(".advisory-list");
  const opened = new Set(Array.from(list.querySelectorAll("details[open]"), (detail) => detail.dataset.advisory));
  const focused = list.contains(document.activeElement) ? document.activeElement.closest("details")?.dataset.advisory : undefined;
  const template = dialog.querySelector("template");
  list.replaceChildren(...advisories.map((advisory) => {
    const item = template.content.cloneNode(true);
    const details = item.querySelector("details");
    details.dataset.advisory = advisory.id;
    details.open = opened.has(advisory.id);
    item.querySelector(".advisory-title").textContent = advisory.title;
    const severity = item.querySelector(".advisory-severity");
    severity.dataset.level = advisory.level;
    severity.textContent = advisory.level === 2 ? "Elevado" : "Atenção";
    item.querySelector(".advisory-time").textContent = forecastTimeRange(advisory.period);
    item.querySelector(".advisory-reason").textContent = advisory.reason;
    return item;
  }));
  if (focused) {
    const summary = Array.from(list.querySelectorAll("summary")).find((item) => item.parentElement.dataset.advisory === focused);
    (summary ?? dialog.querySelector(".advisory-close")).focus({ preventScroll: true });
  }
}
