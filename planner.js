const plannerActivities = {
  caminhada: { min: 15, max: 29, rain: 35, wind: 30, gusts: 45, uv: 5,
    weights: { temperature: 20, rain: 20, wind: 12, gusts: 8, uv: 10, sky: 5 } },
  corrida: { min: 10, max: 25, rain: 30, wind: 25, gusts: 40, uv: 5, preferredHours: [[6, 10], [16, 19]],
    weights: { temperature: 24, rain: 14, wind: 12, gusts: 8, uv: 12, sky: 5 } },
  ciclismo: { min: 12, max: 28, rain: 25, wind: 20, gusts: 32, uv: 5,
    weights: { temperature: 14, rain: 18, wind: 19, gusts: 15, uv: 5, sky: 4 } },
  passeio: { min: 17, max: 30, rain: 30, wind: 25, gusts: 40, uv: 4,
    weights: { temperature: 18, rain: 17, wind: 9, gusts: 8, uv: 17, sky: 6 } },
  carro: { min: 12, max: 30, rain: 10, wind: 25, gusts: 35, uv: 5,
    weights: { temperature: 10, rain: 35, wind: 10, gusts: 8, uv: 8, sky: 4 } },
};
const plannerTimes = {
  diurno: { label: "Horário diurno", hours: [6, 19] },
  manhã: { label: "Manhã", hours: [6, 12] },
  tarde: { label: "Tarde", hours: [12, 18] },
  noite: { label: "Noite", hours: [18, 24] },
  madrugada: { label: "Madrugada", hours: [0, 6] },
  qualquer: { label: "Qualquer horário" },
};
const plannerRanking = {
  maxScore: 100,
  schedulePoints: 25,
  schedule: {
    preferred: { weight: 1, label: "faixa preferencial da corrida" },
    compatible: { weight: 0.75, label: "faixa compatível" },
    alternative: { weight: 0.35, label: "alternativa fora do período diurno" },
  },
  missingPenalty: 0.25,
  waitPenaltyPerDay: 5,
};
const plannerDateFormat = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long", day: "numeric", month: "short", timeZone: "UTC",
});
const plannerStorageKey = "atmos-planejador";
const plannerCriteria = {
  temperature: { label: "Temperatura", reason: "Quanto mais perto do centro da faixa escolhida, maior a contribuição." },
  rain: { label: "Chance de chuva", reason: "Chances menores no fim de cada hora rendem mais pontos." },
  wind: { label: "Vento", reason: "Vento mais fraco em relação ao limite da atividade rende mais pontos." },
  gusts: { label: "Rajadas", reason: "Rajadas mais fracas em relação ao limite da atividade rendem mais pontos." },
  uv: { label: "Índice UV", reason: "Índices arredondados mais baixos rendem mais pontos nas horas de luz." },
  sky: { label: "Condição do céu", reason: "As condições aceitas, de céu limpo a encoberto, recebem a mesma contribuição." },
};
const plannerPointsFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const plannerHorizon = 72 * 3600;

function plannerDay(day, offset) {
  return new Date(Date.parse(day + "T00:00:00Z") + offset * 86400000).toISOString().slice(0, 10);
}

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
  const readings = {
    temperature: 1 - Math.abs(temperature - center) / (halfRange + 1),
    rain: margin(rain, options.rain),
    wind: margin(wind, rule.wind),
    gusts: margin(gusts, rule.gusts),
    uv: margin(uv, rule.uv),
    sky: Number.isFinite(code) ? 1 : undefined,
  };
  const preferred = rule.preferredHours?.some((range) => plannerSlotFits(sample, next, range));
  return { readings, daytime, daylight: sample.is_day === 1 || (sample.is_day !== 0 && daytime), preferred };
}

function scorePlannerWeather(hours, weights) {
  const factors = Object.entries(plannerCriteria).map(([key, criterion]) => {
    const applicable = hours.filter((hour) => key !== "uv" || hour.daylight);
    const readings = applicable.map((hour) => hour.readings[key]).filter(Number.isFinite);
    const weight = weights[key];
    return {
      ...criterion, weight, availableWeight: weight * readings.length / hours.length,
      applicableWeight: weight * applicable.length / hours.length,
      missing: applicable.length - readings.length, excluded: hours.length - applicable.length,
      average: readings.length ? readings.reduce((total, value) => total + value, 0) / readings.length : undefined,
    };
  });
  const availableWeight = factors.reduce((total, factor) => total + factor.availableWeight, 0);
  const applicableWeight = factors.reduce((total, factor) => total + factor.applicableWeight, 0);
  const weatherBudget = plannerRanking.maxScore - plannerRanking.schedulePoints;
  for (const factor of factors) {
    if (factor.average === undefined) continue;
    factor.maximum = weatherBudget * factor.availableWeight / availableWeight;
    factor.points = factor.maximum * factor.average;
  }
  const weatherPoints = factors.reduce((total, factor) => total + (factor.points ?? 0), 0);
  const missingPoints = weatherBudget * (1 - availableWeight / applicableWeight) * plannerRanking.missingPenalty;
  return { factors, weatherPoints, missingPoints };
}

function rankPlannerWindows(samples, now, activity, options) {
  const horizon = now + plannerHorizon;
  const upcoming = samples.filter(({ timestamp }) => timestamp > now && timestamp <= horizon);
  const qualities = upcoming.slice(0, -1).map((sample, i) => {
    const next = upcoming[i + 1];
    return next.timestamp - sample.timestamp === 3600 ? plannerHourQuality(sample, next, activity, options) : undefined;
  });
  const windows = [];
  for (let i = 0; i <= qualities.length - options.duration; i++) {
    const hours = qualities.slice(i, i + options.duration);
    if (hours.some((quality) => !quality)) continue;
    const weather = scorePlannerWeather(hours, plannerActivities[activity].weights);
    const daytime = hours.every((hour) => hour.daytime);
    const preferred = hours.every((hour) => hour.preferred);
    const scheduleRules = hours.map((hour) => {
      if (options.time === "qualquer" && !hour.daytime) return plannerRanking.schedule.alternative;
      return hour.preferred ? plannerRanking.schedule.preferred : plannerRanking.schedule.compatible;
    });
    const schedulePoints = plannerRanking.schedulePoints *
      scheduleRules.reduce((total, rule) => total + rule.weight, 0) / hours.length;
    const wait = plannerRanking.waitPenaltyPerDay * (upcoming[i].timestamp - now) / 86400;
    const ranking = weather.weatherPoints + schedulePoints - weather.missingPoints - wait;
    const score = Math.round(Math.max(0, Math.min(plannerRanking.maxScore, ranking)));
    windows.push({
      first: upcoming[i], end: upcoming[i + options.duration],
      samples: upcoming.slice(i, i + options.duration),
      rain: Math.max(...upcoming.slice(i + 1, i + options.duration + 1).map((sample) => sample.precipitation_probability)),
      ranking, score, daytime, preferred, ...weather, schedulePoints, scheduleRules, wait,
    });
  }
  windows.sort((a, b) => (options.time === "qualquer" ? Number(b.daytime) - Number(a.daytime) : 0) ||
    b.ranking - a.ranking || a.first.timestamp - b.first.timestamp);
  return windows;
}

function plannerDailyResults(samples, now, activity, options, today, lastDay) {
  if (!today || !lastDay) return [];
  const windows = rankPlannerWindows(samples, now, activity, options);
  const coveredDays = new Set();
  for (let i = 0; i < samples.length - options.duration; i++) {
    const first = samples[i];
    const end = samples[i + options.duration];
    if (first.timestamp <= now || end.timestamp > now + plannerHorizon) continue;
    const hours = samples.slice(i, i + options.duration);
    if (hours.every((hour, index) => {
      const next = samples[i + index + 1];
      return next.timestamp - hour.timestamp === 3600 && Number.isFinite(hour.temperature_2m) &&
        Number.isFinite(next.precipitation_probability);
    })) coveredDays.add(first.day);
  }
  const days = [];
  let previousEnd = now;
  for (let day = today; day <= lastDay; day = plannerDay(day, 1)) {
    const candidates = windows.filter(({ first }) => first.day === day);
    const period = candidates.find(({ first }) => first.timestamp >= previousEnd);
    if (period) previousEnd = period.end.timestamp;
    days.push({ day, period, covered: coveredDays.has(day), overlaps: !period && candidates.length > 0 });
  }
  return days;
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

  update(location, samples, now, today, lastDay) {
    this.samples = samples;
    this.now = now;
    this.today = today;
    this.lastDay = lastDay;
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
    const activityName = this.form.querySelector(".planner-activities label:has(:checked) .planner-activity-name").textContent;
    const days = plannerDailyResults(this.samples, this.now, this.activity, options, this.today, this.lastDay);
    const count = days.filter(({ period }) => period).length;
    this.status.textContent = !days.some(({ covered }) => covered)
      ? "Previsão horária indisponível ou insuficiente para a duração escolhida."
      : count === 1 ? "1 período recomendado"
        : count ? count + " períodos recomendados" : "Nenhum período atende às preferências com os dados disponíveis.";
    const template = this.panel.querySelector("template");
    const active = this.list.contains(document.activeElement) ? document.activeElement : undefined;
    const activeDay = active?.closest("[data-day]")?.dataset.day;
    const openDays = new Set([...this.list.querySelectorAll("details[open]")]
      .map((details) => details.closest("[data-day]").dataset.day));
    const tomorrow = this.today && plannerDay(this.today, 1);
    const groups = new Map();
    for (const { day, period, covered, overlaps } of days) {
      const groupName = day === this.today ? "Hoje" : day === tomorrow ? "Amanhã" : "Próximos dias";
      if (!groups.has(groupName)) {
        const section = document.createElement("section");
        const heading = document.createElement("h3");
        heading.textContent = groupName;
        section.append(heading);
        groups.set(groupName, section);
      }
      const item = template.content.firstElementChild.cloneNode(true);
      item.dataset.day = day;
      groups.get(groupName).append(item);
      const heading = item.querySelector("h4");
      if (!period) {
        heading.textContent = plannerDateFormat.format(new Date(day + "T00:00:00Z"));
        const message = document.createElement("p");
        message.textContent = overlaps
          ? "Os períodos adequados coincidem com a recomendação do dia anterior."
          : covered
          ? "Nenhum período disponível atende ao horário, às preferências e aos limites da atividade."
          : "A previsão restante deste dia não tem dados horários suficientes para a duração escolhida.";
        item.replaceChildren(heading, message);
        continue;
      }
      const [condition, icon] = describeWeather(period.first.weather_code, period.first.is_day !== 0);
      const temperatures = period.samples.map((sample) => sample.temperature_2m);
      const min = Math.min(...temperatures);
      const max = Math.max(...temperatures);
      const range = plannerDateRange(period.first, period.end);
      item.querySelector(".planner-icon").textContent = icon;
      heading.textContent = range;
      item.querySelector(".planner-score-label").textContent = "Adequação estimada · " + period.score + " de " + plannerRanking.maxScore;
      const meter = item.querySelector(".planner-score-meter");
      meter.max = plannerRanking.maxScore;
      meter.value = period.score;
      item.querySelector(".planner-condition").textContent = condition;
      item.querySelector(".planner-activity").textContent = activityName;
      item.querySelector(".planner-period").textContent = options.time === "qualquer"
        ? period.daytime ? "Horário diurno priorizado" : "Horário alternativo"
        : plannerTimes[options.time].label;
      item.querySelector(".planner-temperature").textContent = min === max ? formatReading(min, " °C")
        : formatReading(min, " °C") + " a " + formatReading(max, " °C");
      item.querySelector(".planner-rain").textContent = "Até " + formatReading(period.rain, "%");
      for (const [selector, key, unit] of [
        [".planner-wind", "wind_speed_10m", " km/h"], [".planner-gusts", "wind_gusts_10m", " km/h"],
        [".planner-uv", "uv_index", ""],
      ]) {
        const values = period.samples.map((sample) => sample[key]).filter(Number.isFinite);
        const reading = item.querySelector(selector);
        reading.textContent = values.length ? "Até " + formatReading(Math.max(...values), unit) : "Indisponível";
      }
      const schedule = period.preferred && this.activity === "corrida" && (options.time !== "qualquer" || period.daytime)
        ? "Faixa preferencial para corrida." : options.time === "qualquer"
          ? (period.daytime ? "Horário diurno priorizado na classificação." : "Alternativa fora do horário diurno.")
          : "Horário compatível com a faixa escolhida.";
      item.querySelector(".planner-reason").textContent = schedule + " Temperatura e chance de chuva dentro dos limites." +
        (period.missingPoints > 0 ? " Há leituras meteorológicas indisponíveis." : "");
      const details = item.querySelector("details");
      details.open = openDays.has(day);
      const points = (value) => plannerPointsFormat.format(value);
      const units = (value, maximum) => points(value) + " de " + points(maximum) + " pontos";
      const breakdown = [
        ...period.factors.map((factor) => {
          const contribution = factor.points === undefined ? "" : " · " + units(factor.points, factor.maximum);
          const missing = factor.missing ? " · Indisponível (" + factor.missing + " h)" : "";
          const excluded = factor.excluded ? " · Fora do cálculo sem luz (" + factor.excluded + " h)" : "";
          return factor.label + " (peso " + factor.weight + ")" + contribution + missing + excluded + ". " + factor.reason;
        }),
        "Horário · " + units(period.schedulePoints, plannerRanking.schedulePoints) + " · " +
          [...new Set(period.scheduleRules)].map((rule) => {
            const count = period.scheduleRules.filter((value) => value === rule).length;
            return count + " h em " + rule.label + " (" + points(100 * rule.weight) + "%)";
          }).join(", "),
      ];
      for (const line of breakdown) {
        const entry = document.createElement("li");
        entry.textContent = line;
        details.querySelector("ul").append(entry);
      }
      item.querySelector(".planner-calculation").textContent = "Nota final de " + period.score + " · " +
        points(period.weatherPoints) + " de previsão + " + points(period.schedulePoints) + " de horário − " +
        points(period.missingPoints) + " por dados ausentes − " + points(period.wait) +
        " pela espera. As parcelas exibidas são arredondadas.";
      const link = item.querySelector("a");
      link.dataset.timestamp = period.first.timestamp;
      link.setAttribute("aria-label", "Ver na linha do tempo: " + range);
    }
    this.list.replaceChildren(...groups.values());
    if (activeDay) {
      const target = this.list.querySelector('[data-day="' + activeDay + '"] ' + active.localName);
      (target ?? this.status).focus({ preventScroll: true });
    }
  }
}
