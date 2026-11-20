const plannerActivities = {
  caminhada: { min: 15, max: 29, rain: 35, wind: 30, gusts: 45, uv: 5 },
  corrida: { min: 10, max: 25, rain: 30, wind: 25, gusts: 40, uv: 5 },
  ciclismo: { min: 12, max: 28, rain: 25, wind: 20, gusts: 32, uv: 5 },
  passeio: { min: 17, max: 30, rain: 30, wind: 25, gusts: 40, uv: 4 },
  carro: { min: 12, max: 30, rain: 10, wind: 25, gusts: 35, uv: 5 },
};
const plannerTimes = { madrugada: [0, 6], manhã: [6, 12], tarde: [12, 18], noite: [18, 24] };
const plannerStorageKey = "atmos-planejador";
const plannerCriteria = ["temperatura", "chance de chuva", "vento", "rajadas", "UV", "condição do céu"];

function validPlannerPreferences(activity, values) {
  const { min, max, rain, duration, time } = values ?? {};
  const defaults = plannerActivities[activity];
  const validTemperature = Number.isInteger(min) && Number.isInteger(max) && min >= -30 && max <= 50 && min <= max;
  return {
    min: validTemperature ? min : defaults.min,
    max: validTemperature ? max : defaults.max,
    rain: Number.isInteger(rain) && rain >= 0 && rain <= 100 ? rain : defaults.rain,
    duration: [1, 2, 3, 4].includes(duration) ? duration : 1,
    time: typeof time === "string" && Object.hasOwn(plannerTimes, time) ? time : "qualquer",
  };
}

function plannerHourQuality(sample, next, activity, options) {
  const rule = plannerActivities[activity];
  const temperature = sample.temperature_2m;
  const rain = next.precipitation_probability;
  const wind = sample.wind_speed_10m;
  const gusts = sample.wind_gusts_10m;
  const uv = Number.isFinite(sample.uv_index) ? Math.round(sample.uv_index) : undefined;
  const code = sample.weather_code;
  const hours = plannerTimes[options.time];
  const localHour = Number(sample.time.slice(0, 2));
  if (hours && (localHour < hours[0] || localHour >= hours[1])) return undefined;
  if (!Number.isFinite(temperature) || temperature < options.min || temperature > options.max ||
      !Number.isFinite(rain) || rain > options.rain ||
      advisoryLevel(temperature, advisoryRules.heat) || advisoryLevel(next.precipitation, advisoryRules.rain) ||
      (Number.isFinite(wind) && wind > rule.wind) || (Number.isFinite(gusts) && gusts > rule.gusts) ||
      (uv !== undefined && uv > rule.uv) || (Number.isFinite(code) && ![0, 1, 2, 3].includes(code))) return undefined;
  const center = (options.min + options.max) / 2;
  const halfRange = (options.max - options.min) / 2;
  const margin = (value, limit) => Number.isFinite(value) ? 1 - value / (limit + 1) : undefined;
  return [
    halfRange ? 1 - Math.abs(temperature - center) / (halfRange + 1) : 1,
    margin(rain, options.rain), margin(wind, rule.wind), margin(gusts, rule.gusts), margin(uv, rule.uv),
    Number.isFinite(code) ? 1 : undefined,
  ];
}

function rankPlannerWindows(samples, now, activity, options) {
  const horizon = now + 72 * 3600;
  const upcoming = samples.filter(({ timestamp }) => timestamp > now && timestamp <= horizon);
  const qualities = upcoming.slice(0, -1).map((sample, i) => {
    const next = upcoming[i + 1];
    return next.timestamp - sample.timestamp === 3600 ? plannerHourQuality(sample, next, activity, options) : undefined;
  });
  const windows = [];
  for (let i = 0; i <= qualities.length - options.duration; i++) {
    const hours = qualities.slice(i, i + options.duration);
    if (hours.some((quality) => !quality)) continue;
    const readings = hours.flat();
    windows.push({
      first: upcoming[i], end: upcoming[i + options.duration],
      samples: upcoming.slice(i, i + options.duration),
      rain: Math.max(...upcoming.slice(i + 1, i + options.duration + 1).map((sample) => sample.precipitation_probability)),
      score: Math.round(100 * readings.reduce((total, value) => total + (value ?? 0), 0) / readings.length),
      missing: plannerCriteria.filter((_, column) => hours.some((quality) => quality[column] === undefined)),
    });
  }
  windows.sort((a, b) => b.score - a.score || a.first.timestamp - b.first.timestamp);
  const selected = [];
  for (const window of windows) {
    if (selected.some((other) => other.first.timestamp < window.end.timestamp && window.first.timestamp < other.end.timestamp)) continue;
    selected.push(window);
    if (selected.length === 3) break;
  }
  return selected;
}

class ActivityPlanner {
  constructor(panel) {
    this.panel = panel;
    this.form = panel.querySelector("form");
    this.list = panel.querySelector(".planner-results");
    this.status = panel.querySelector(".planner-status");
    this.feedback = panel.querySelector(".planner-feedback");
    let stored;
    try {
      stored = JSON.parse(localStorage.getItem(plannerStorageKey));
    } catch {
      // As opções iniciais ficam disponíveis quando o armazenamento falha.
    }
    this.activity = typeof stored?.activity === "string" && Object.hasOwn(plannerActivities, stored.activity)
      ? stored.activity : "caminhada";
    this.options = Object.fromEntries(Object.keys(plannerActivities).map((id) =>
      [id, validPlannerPreferences(id, stored?.options?.[id])]));
    this.form.elements.activity.value = this.activity;
    this.fillForm();
    this.form.addEventListener("change", (event) => {
      if (event.target.name !== "activity") return;
      this.activity = this.form.elements.activity.value;
      this.fillForm();
      this.save();
      this.render();
    });
    this.form.addEventListener("submit", (event) => {
      event.preventDefault();
      const fields = this.form.elements;
      const min = fields.minimum.valueAsNumber;
      const max = fields.maximum.valueAsNumber;
      if (min > max) {
        fields.maximum.setCustomValidity("A máxima deve ser igual ou maior que a mínima.");
        fields.maximum.reportValidity();
        return;
      }
      this.options[this.activity] = validPlannerPreferences(this.activity, {
        min, max, rain: fields.rain.valueAsNumber, duration: Number(fields.duration.value), time: fields.period.value,
      });
      this.save();
      this.render();
    });
    for (const field of [this.form.elements.minimum, this.form.elements.maximum]) {
      field.addEventListener("input", () => this.form.elements.maximum.setCustomValidity(""));
    }
  }

  fillForm() {
    const fields = this.form.elements;
    const { min, max, rain, duration, time } = this.options[this.activity];
    fields.minimum.value = min;
    fields.maximum.value = max;
    fields.maximum.setCustomValidity("");
    fields.rain.value = rain;
    fields.duration.value = duration;
    fields.period.value = time;
  }

  save() {
    try {
      localStorage.setItem(plannerStorageKey, JSON.stringify({ activity: this.activity, options: this.options }));
      this.feedback.textContent = "Preferências salvas neste navegador.";
    } catch {
      this.feedback.textContent = "Preferências aplicadas nesta visita.";
    }
  }

  update(location, samples, now) {
    this.samples = samples;
    this.now = now;
    this.panel.querySelector(".planner-location").textContent = [location.name, cityRegion(location)].filter(Boolean).join(" · ");
    this.render();
  }

  render() {
    const rule = plannerActivities[this.activity];
    this.panel.querySelector(".planner-limits").textContent = "Nesta atividade, o limite é de " +
      formatReading(rule.wind, " km/h") + " para vento, " + formatReading(rule.gusts, " km/h") +
      " para rajadas e " + rule.uv + " para o índice UV arredondado.";
    if (!this.samples) return;
    const windows = rankPlannerWindows(this.samples, this.now, this.activity, this.options[this.activity]);
    this.status.textContent = windows.length
      ? (windows.length === 1 ? "1 período recomendado" : windows.length + " períodos recomendados")
      : !this.samples.some(({ timestamp }) => timestamp > this.now)
        ? "Previsão horária indisponível para planejar nesta cidade."
        : "Nenhum período atende às preferências com os dados disponíveis.";
    const template = this.panel.querySelector("template");
    const activeTimestamp = this.list.contains(document.activeElement) ? document.activeElement.dataset.timestamp : undefined;
    this.list.replaceChildren(...windows.map((period) => {
      const item = template.content.cloneNode(true);
      const [condition, icon] = describeWeather(period.first.weather_code, period.first.is_day !== 0);
      const temperatures = period.samples.map((sample) => sample.temperature_2m);
      const min = Math.min(...temperatures);
      const max = Math.max(...temperatures);
      const range = forecastTimeRange([period.first, period.end]);
      item.querySelector(".planner-icon").textContent = icon;
      item.querySelector("h3").textContent = range;
      item.querySelector(".planner-score").textContent = period.score + " de 100";
      item.querySelector(".planner-condition").textContent = condition;
      item.querySelector(".planner-temperature").textContent = min === max ? formatReading(min, " °C")
        : formatReading(min, " °C") + " a " + formatReading(max, " °C");
      item.querySelector(".planner-rain").textContent = "Até " + formatReading(period.rain, "%");
      const peaks = [
        ["Vento", "wind_speed_10m", " km/h"], ["Rajadas", "wind_gusts_10m", " km/h"], ["UV", "uv_index", ""],
      ].flatMap(([label, key, unit]) => {
        const values = period.samples.map((sample) => sample[key]).filter(Number.isFinite);
        return values.length ? [label + " até " + formatReading(Math.max(...values), unit)] : [];
      });
      item.querySelector(".planner-reason").textContent = "Temperatura e chuva dentro das preferências." +
        (peaks.length ? " " + peaks.join(" · ") + "." : "");
      item.querySelector(".planner-confidence").textContent = period.missing.length
        ? "Dados parciais para " + period.missing.join(", ") + "." : "Leituras completas para os critérios avaliados.";
      const link = item.querySelector("a");
      link.dataset.timestamp = period.first.timestamp;
      link.setAttribute("aria-label", "Ver na linha do tempo: " + range);
      return item;
    }));
    if (activeTimestamp) {
      const link = this.list.querySelector('[data-timestamp="' + activeTimestamp + '"]');
      (link ?? this.status).focus({ preventScroll: true });
    }
  }
}
