const plannerActivities = {
  caminhada: { min: 15, max: 29, rain: 35, wind: 30, gusts: 45, uv: 5 },
  corrida: { min: 10, max: 25, rain: 30, wind: 25, gusts: 40, uv: 5, preferredHours: [[6, 10], [16, 19]] },
  ciclismo: { min: 12, max: 28, rain: 25, wind: 20, gusts: 32, uv: 5 },
  passeio: { min: 17, max: 30, rain: 30, wind: 25, gusts: 40, uv: 4 },
  carro: { min: 12, max: 30, rain: 10, wind: 25, gusts: 35, uv: 5 },
};
const plannerTimes = {
  diurno: { label: "Horário diurno", hours: [6, 19] },
  manhã: { label: "Manhã", hours: [6, 12] },
  tarde: { label: "Tarde", hours: [12, 18] },
  noite: { label: "Noite", hours: [18, 24] },
  madrugada: { label: "Madrugada", hours: [0, 6] },
  qualquer: { label: "Qualquer horário" },
};
const plannerRanking = { weatherWeight: 0.75, waitPenaltyPerDay: 5 };
const plannerDateFormat = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long", day: "numeric", month: "short", timeZone: "UTC",
});
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
    time: typeof time === "string" && Object.hasOwn(plannerTimes, time) ? time : "diurno",
  };
}

function plannerSlotFits(sample, next, [start, end]) {
  const minutes = ({ time }) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  const first = minutes(sample);
  const last = minutes(next) + (sample.day === next.day ? 0 : 1440);
  return first >= start * 60 && first < end * 60 && last >= start * 60 && last <= end * 60;
}

function plannerHourQuality(sample, next, activity, options) {
  const rule = plannerActivities[activity];
  const temperature = sample.temperature_2m;
  const rain = next.precipitation_probability;
  const wind = sample.wind_speed_10m;
  const gusts = sample.wind_gusts_10m;
  const uv = Number.isFinite(sample.uv_index) ? Math.round(sample.uv_index) : undefined;
  const code = sample.weather_code;
  const hours = plannerTimes[options.time].hours;
  const daytime = sample.is_day !== 0 && plannerSlotFits(sample, next, plannerTimes.diurno.hours);
  if (options.time === "diurno" ? !daytime : hours && !plannerSlotFits(sample, next, hours)) return undefined;
  if (!Number.isFinite(temperature) || temperature < options.min || temperature > options.max ||
      !Number.isFinite(rain) || rain > options.rain ||
      advisoryLevel(temperature, advisoryRules.heat) || advisoryLevel(next.precipitation, advisoryRules.rain) ||
      (Number.isFinite(wind) && wind > rule.wind) || (Number.isFinite(gusts) && gusts > rule.gusts) ||
      (uv !== undefined && uv > rule.uv) || (Number.isFinite(code) && ![0, 1, 2, 3].includes(code))) return undefined;
  const center = (options.min + options.max) / 2;
  const halfRange = (options.max - options.min) / 2;
  const margin = (value, limit) => Number.isFinite(value) ? 1 - value / (limit + 1) : undefined;
  const readings = [
    halfRange ? 1 - Math.abs(temperature - center) / (halfRange + 1) : 1,
    margin(rain, options.rain), margin(wind, rule.wind), margin(gusts, rule.gusts), margin(uv, rule.uv),
    Number.isFinite(code) ? 1 : undefined,
  ];
  const preferred = rule.preferredHours?.some((range) => plannerSlotFits(sample, next, range));
  return { readings, daytime, preferred: Boolean(preferred) };
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
    const readings = hours.flatMap((hour) => hour.readings);
    const score = 100 * readings.reduce((total, value) => total + (value ?? 0), 0) / readings.length;
    const daytime = hours.every((hour) => hour.daytime);
    const preferred = hours.every((hour) => hour.preferred);
    const schedule = hours.reduce((total, hour) => {
      if (options.time === "qualquer" && !hour.daytime) return total + 35;
      return total + (hour.preferred ? 100 : 75);
    }, 0) / hours.length;
    const ranking = plannerRanking.weatherWeight * score +
      (1 - plannerRanking.weatherWeight) * schedule -
      plannerRanking.waitPenaltyPerDay * (upcoming[i].timestamp - now) / 86400;
    windows.push({
      first: upcoming[i], end: upcoming[i + options.duration],
      samples: upcoming.slice(i, i + options.duration),
      rain: Math.max(...upcoming.slice(i + 1, i + options.duration + 1).map((sample) => sample.precipitation_probability)),
      score: Math.round(score), ranking, daytime, preferred,
      missing: plannerCriteria.filter((_, column) => hours.some((hour) => hour.readings[column] === undefined)),
    });
  }
  windows.sort((a, b) => (options.time === "qualquer" ? Number(b.daytime) - Number(a.daytime) : 0) ||
    b.ranking - a.ranking || a.first.timestamp - b.first.timestamp);
  const selected = [];
  for (const window of windows) {
    if (selected.some((other) => other.first.timestamp < window.end.timestamp && window.first.timestamp < other.end.timestamp)) continue;
    selected.push(window);
    if (selected.length === 3) break;
  }
  return selected;
}

function plannerDateRange(first, end) {
  const date = ({ day }) => plannerDateFormat.format(new Date(day + "T00:00:00Z"));
  return date(first) + ", " + first.displayTime + " a " +
    (first.day === end.day ? end.displayTime : date(end) + ", " + end.displayTime);
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
    const options = this.options[this.activity];
    const windows = rankPlannerWindows(this.samples, this.now, this.activity, options);
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
      const range = plannerDateRange(period.first, period.end);
      item.querySelector(".planner-icon").textContent = icon;
      item.querySelector("h3").textContent = range;
      item.querySelector(".planner-score").textContent = period.score + " de 100";
      item.querySelector(".planner-score").setAttribute("aria-label", "Adequação meteorológica: " + period.score + " de 100");
      item.querySelector(".planner-condition").textContent = condition;
      item.querySelector(".planner-period").textContent = options.time === "qualquer"
        ? period.daytime ? "Horário diurno priorizado" : "Horário alternativo"
        : plannerTimes[options.time].label;
      item.querySelector(".planner-temperature").textContent = min === max ? formatReading(min, " °C")
        : formatReading(min, " °C") + " a " + formatReading(max, " °C");
      item.querySelector(".planner-rain").textContent = "Até " + formatReading(period.rain, "%");
      const peaks = [
        ["Vento", "wind_speed_10m", " km/h"], ["Rajadas", "wind_gusts_10m", " km/h"], ["UV", "uv_index", ""],
      ].flatMap(([label, key, unit]) => {
        const values = period.samples.map((sample) => sample[key]).filter(Number.isFinite);
        return values.length ? [label + " até " + formatReading(Math.max(...values), unit)] : [];
      });
      const schedule = period.preferred && this.activity === "corrida" && (options.time !== "qualquer" || period.daytime)
        ? "Faixa preferencial para corrida." : options.time === "qualquer"
          ? (period.daytime ? "Horário diurno priorizado na classificação." : "Alternativa fora do horário diurno.")
          : "Horário compatível com a faixa escolhida.";
      item.querySelector(".planner-reason").textContent = schedule + " Temperatura e chance de chuva dentro dos limites." +
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
