const searchForm = document.querySelector(".search");
const searchInput = document.querySelector(".search-bar");
const weatherPanel = document.querySelector(".weather");
const statusMessage = document.querySelector(".status");
const skeleton = document.querySelector(".skeleton");
const numberFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const differenceFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1, signDisplay: "exceptZero" });

const forecastList = document.querySelector(".forecast-list");
const forecastStatus = document.querySelector(".forecast-status");
const forecastRange = document.querySelector(".forecast-range");
const calendarPanel = document.querySelector("#calendario");
const calendarList = calendarPanel.querySelector(".calendar-days");
const calendarDetail = calendarPanel.querySelector(".forecast-detail");
const calendarStatus = calendarPanel.querySelector(".calendar-status");
const settingsPanel = document.querySelector("#configuracoes");
const hourlyList = document.querySelector(".hourly-list");
const hourlyStatus = document.querySelector(".hourly-status");
const hourlyDetail = document.querySelector(".hourly-detail");
const hourlyDetailTime = hourlyDetail.querySelector("time");
const hourlyDetailReadings = hourlyDetail.querySelectorAll("[data-hourly]");
const hourlyTitle = document.querySelector("#hourly-title");
const timelineReset = document.querySelector(".timeline-reset");
const planner = new ActivityPlanner(document.querySelector("#planejador"));
const assistant = new WeatherAssistant(document.querySelector("#atmos-ai"), () => {
  const now = Math.floor(Date.now() / 1000);
  const today = getLocalParts(now).day;
  const weather = statusMessage.dataset.state === "loading" || displayedWeather?.saved ? undefined : displayedWeather;
  return {
    weather, forecast: displayedForecast, now, today, history: forecastHistory,
    cities: comparison.slots.map(({ result }) => result),
    tomorrow: today && plannerDay(today, 1),
    air: displayedWeather && airQuality.cachedEstimate(displayedWeather.location),
    planner, format: formatReading, fetchJson,
  };
});
const insightsPanel = document.querySelector(".insights");
const hourlyUnits = {
  temperature_2m: " °C", relative_humidity_2m: "%", wind_speed_10m: " km/h",
  precipitation_probability: "%", uv_index: "", cloud_cover: "%",
};
const chartCard = document.querySelector(".forecast-charts");
const chartsUnavailable = document.querySelector(".charts-unavailable");
const chart = new ForecastChart(chartCard, formatReading);
const forecastHistory = new ForecastHistoryView(document.querySelector(".forecast-history"), formatReading);
const chartReset = document.querySelector(".chart-reset");
const refreshButton = document.querySelector(".refresh-button");
const connectionPanel = document.querySelector(".pwa-connectivity");
const connectionRetry = connectionPanel.querySelector(".connection-retry");
const advisoryButton = document.querySelector(".advisory-button");
const advisoryDialog = document.querySelector(".advisory-dialog");
const localClock = document.querySelector(".current-date");
const weekdayFormat = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "UTC" });
const shortDateFormat = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" });

let activeRequest;
let selectedLocation;
let clockFormat;
let localHourFormat;
let displayedForecast;
let displayedHour;
let selectedDay;
let selectedHour;
let timelineDay;
let pendingPlannerHour;
let focusCalendarDay = false;
let displayedWeather;
const locationCache = new Map();
const pendingLocations = new Map();

advisoryButton.addEventListener("click", () => {
  advisoryDialog.showModal();
  advisoryButton.setAttribute("aria-expanded", "true");
});
advisoryDialog.addEventListener("close", () => {
  advisoryButton.setAttribute("aria-expanded", "false");
  advisoryButton.focus();
});

document.addEventListener("click", (event) => {
  const button = event.target.closest(".explanation-toggle");
  if (!button) return;
  const expanded = button.getAttribute("aria-expanded") === "false";
  setWeatherExplanation(button, expanded);
  if (weatherPanel.contains(button)) saveDashboardLayout();
});

function setWeatherStatus(state, message = "") {
  const loading = state === "loading";
  refreshButton.disabled = loading;
  statusMessage.dataset.state = state;
  if (statusMessage.textContent !== message) statusMessage.textContent = message;
  skeleton.hidden = !loading || !weatherPanel.hidden;
  weatherPanel.setAttribute("aria-busy", String(loading));
  chartsUnavailable.hidden = loading || !chartCard.hidden;
  if (!displayedForecast) calendarStatus.textContent = loading
    ? "Carregando a previsão…" : "Previsão indisponível.";
  renderConnection();
}

function renderConnection() {
  const offline = !navigator.onLine;
  const saved = displayedWeather?.saved;
  connectionPanel.hidden = !offline && !saved && statusMessage.dataset.state !== "offline";
  connectionRetry.disabled = offline || statusMessage.dataset.state === "loading";
  connectionPanel.querySelector(".connection-message").textContent = offline
    ? "Você está offline. A atualização meteorológica precisa de conexão."
    : "O navegador indica conexão. A disponibilidade do serviço meteorológico ainda precisa ser verificada.";
  const message = connectionPanel.querySelector(".saved-forecast-message");
  message.hidden = !saved;
  if (saved) {
    const date = displayedForecast.loadedAt;
    const time = message.querySelector("time");
    time.dateTime = date.toISOString();
    time.textContent = clockFormat ? clockFormat.format(date) + " (horário local da cidade)"
      : date.toLocaleString("pt-BR", { timeZone: "UTC" }) + " (UTC)";
  }
}

function formatReading(value, unit, difference = false) {
  const reading = readingParts(value, unit, difference);
  return reading ? reading.value + reading.suffix : "Indisponível";
}

function readingParts(value, unit, difference = false) {
  if (!Number.isFinite(value)) return undefined;
  const key = unit.trim();
  const formatter = difference ? differenceFormat : numberFormat;
  const converted = convertReading(value, key, difference);
  if (!Number.isFinite(converted)) return undefined;
  return { value: formatter.format(converted), suffix: (unit.startsWith(" ") ? " " : "") + readingUnit(key) };
}

function displayMetricReading(label, value, unit, category = "") {
  const reading = readingParts(value, unit);
  label.classList.toggle("reading-unavailable", !reading);
  label.textContent = reading?.value ?? "Indisponível";
  if (!reading || (!reading.suffix && !category)) return;
  const suffix = document.createElement("span");
  suffix.className = "metric-unit";
  suffix.textContent = category ? " " + category : reading.suffix;
  label.append(suffix);
}

function describeUv(value) {
  if (!Number.isFinite(value) || value < 0) return { reading: "Indisponível", guidance: "" };
  const index = Math.round(value);
  const category = index < 3 ? "Baixo" : index < 6 ? "Moderado" : index < 8 ? "Alto" : index < 11 ? "Muito alto" : "Extremo";
  const guidance = index >= 8
    ? "Evite a exposição ao sol perto do meio-dia. Procure sombra e use roupa protetora, chapéu, óculos de sol e protetor solar."
    : index >= 3
      ? "Procure sombra perto do meio-dia e use roupa protetora, chapéu, óculos de sol e protetor solar."
      : "";
  return { reading: formatReading(index, "") + " · " + category, index, category, guidance };
}

function describeDaylight(sunrise, sunset) {
  if (!isTimestamp(sunrise) || !isTimestamp(sunset) || sunset <= sunrise || sunset - sunrise > 86400) {
    return "Indisponível";
  }
  const minutes = Math.round((sunset - sunrise) / 60);
  const hours = Math.floor(minutes / 60);
  return hours + " h " + minutes % 60 + " min";
}

function configureClock(timezone) {
  clockFormat = undefined;
  localHourFormat = undefined;
  if (timezone) {
    try {
      clockFormat = new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "full", timeStyle: "short", hourCycle: "h23", timeZone: timezone,
      });
      localHourFormat = new Intl.DateTimeFormat("pt-BR", {
        year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit",
        minute: "2-digit", hourCycle: "h23", timeZone: timezone, timeZoneName: "shortOffset",
      });
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
    }
  }
}

function updateClock(now) {
  const label = clockFormat
    ? "Horário local: " + clockFormat.format(now)
    : "Horário local indisponível.";
  if (localClock.textContent !== label) localClock.textContent = label;
}

function getLocalParts(timestamp) {
  if (!localHourFormat || !isTimestamp(timestamp)) return {};
  const parts = Object.fromEntries(localHourFormat.formatToParts(timestamp * 1000)
    .map(({ type, value }) => [type, value]));
  return { day: parts.year + "-" + parts.month + "-" + parts.day,
    time: parts.hour + ":" + parts.minute, offset: parts.timeZoneName };
}

function getLocalTime(timestamp) {
  return getLocalParts(timestamp).time ?? "Indisponível";
}

function displaySolarTime(label, timestamp) {
  const time = getLocalParts(timestamp).time;
  label.classList.toggle("reading-unavailable", !time);
  label.textContent = time ?? "Indisponível";
}

function displayPercentage(selector, value) {
  const label = weatherPanel.querySelector(selector);
  const ring = label.previousElementSibling;
  const available = Number.isFinite(value) && value >= 0 && value <= 100;
  displayMetricReading(label, available ? value : null, "%");
  ring.hidden = !available;
  if (available) ring.style.setProperty("--fill", value + "%");
}

async function fetchJson(endpoint, params, signal) {
  if (!navigator.onLine) throw new Error("Você está offline.");
  const url = new URL(endpoint);
  url.search = new URLSearchParams(params);
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) cancel();
  else signal?.addEventListener("abort", cancel, { once: true });
  const timeout = setTimeout(cancel, 12000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error("Falha na consulta à Open-Meteo");
    const data = await response.json();
    if (!data || typeof data !== "object" || Array.isArray(data) || data.error) {
      throw new Error("Resposta inválida da Open-Meteo");
    }
    return data;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancel);
  }
}

async function fetchForecast(location, signal, forecastDays = 7) {
  const result = await fetchJson("https://api.open-meteo.com/v1/forecast", {
    latitude: location.latitude,
    longitude: location.longitude,
    current: weatherFields.current.join(","),
    hourly: weatherFields.hourly.join(","),
    daily: weatherFields.daily.join(","),
    timezone: "auto",
    timeformat: "unixtime",
    forecast_days: forecastDays,
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    precipitation_unit: "mm",
  }, signal);
  return normalizeForecast(result, location);
}

function displayForecast(daily, today, tomorrow) {
  const rows = [];
  const days = Array.isArray(daily?.time) ? daily.time : [];
  const seen = new Set();
  for (const [index, day] of days.entries()) {
    if (!day || (today && day < today) || seen.has(day)) continue;
    const date = new Date(day + "T00:00:00Z");
    if (!Number.isFinite(date.getTime())) continue;
    seen.add(day);

    const [description, icon] = describeWeather(daily.weather_code?.[index]);
    const row = document.createElement("li");
    row.innerHTML = '<button type="button" class="forecast-choice" aria-controls="detalhes-calendario">' +
      '<span><span class="forecast-day"></span><time class="forecast-date"></time></span>' +
      '<span class="forecast-icon" role="img"></span>' +
      '<span class="forecast-values"><span class="forecast-temps"><strong></strong><span class="forecast-min"></span></span>' +
      '<span class="forecast-rain"></span></span></button>';

    const button = row.querySelector("button");
    button.dataset.day = day;
    button.setAttribute("aria-pressed", String(day === selectedDay));
    if (day === today) button.setAttribute("aria-current", "date");
    button.addEventListener("click", () => {
      selectForecastDay(day);
      focusCalendarDay = true;
      location.hash = "#calendario";
    });

    const weekday = weekdayFormat.format(date);
    const dayLabel = day === today ? "Hoje · " + weekday : day === tomorrow ? "Amanhã · " + weekday : weekday;
    row.classList.toggle("forecast-today", day === today);
    row.querySelector(".forecast-day").textContent = dayLabel[0].toUpperCase() + dayLabel.slice(1);
    const dateLabel = row.querySelector("time");
    dateLabel.dateTime = day;
    dateLabel.textContent = shortDateFormat.format(date);

    const graphic = row.querySelector(".forecast-icon");
    graphic.textContent = icon;
    graphic.setAttribute("aria-label", description);
    graphic.title = description;

    const maximum = daily.temperature_2m_max?.[index];
    const minimum = daily.temperature_2m_min?.[index];
    const high = row.querySelector("strong");
    const low = row.querySelector(".forecast-min");
    high.textContent = formatReading(maximum, " °C");
    high.title = "Máxima";
    low.textContent = formatReading(minimum, " °C");
    low.title = "Mínima";
    row.querySelector(".forecast-temps").setAttribute("aria-label",
      "Máxima: " + formatReading(maximum, " °C") + ". Mínima: " + formatReading(minimum, " °C") + ".");
    const rain = formatReading(daily.precipitation_probability_max?.[index], "%");
    row.querySelector(".forecast-rain").textContent = "Chance máx.: " + rain;
    rows.push(row);
  }
  forecastList.replaceChildren(...rows);
  forecastStatus.hidden = rows.length > 0;
  forecastRange.hidden = rows.length === 0;
  forecastRange.textContent = rows.length === 1 ? "1 dia disponível" : rows.length + " dias disponíveis";
  calendarList.replaceChildren(...rows.map((row) => {
    const tile = row.cloneNode(true);
    const button = tile.querySelector("button");
    const high = tile.querySelector("strong");
    const low = tile.querySelector(".forecast-min");
    high.textContent = "Máx. " + high.textContent;
    low.textContent = "Mín. " + low.textContent;
    button.addEventListener("click", () => {
      selectForecastDay(button.dataset.day);
      calendarDetail.focus();
    });
    return tile;
  }));
  calendarStatus.hidden = calendarList.childElementCount > 0;
  calendarStatus.textContent = "Previsão indisponível.";
}

function makeHourlySamples(hourly) {
  const counts = new Map();
  const samples = hourly.time.flatMap((timestamp, index) => {
    const { day, time, offset } = getLocalParts(timestamp);
    if (!day) return [];
    const localKey = day + "T" + time;
    counts.set(localKey, (counts.get(localKey) ?? 0) + 1);
    return [{
      timestamp, day, time, offset, localKey,
      temperature_2m: hourly.temperature_2m?.[index],
      wind_speed_10m: hourly.wind_speed_10m?.[index],
      wind_gusts_10m: hourly.wind_gusts_10m?.[index],
      precipitation: hourly.precipitation?.[index],
      precipitation_probability: hourly.precipitation_probability?.[index],
      relative_humidity_2m: hourly.relative_humidity_2m?.[index],
      cloud_cover: hourly.cloud_cover?.[index],
      weather_code: hourly.weather_code?.[index],
      is_day: hourly.is_day?.[index],
      uv_index: hourly.uv_index?.[index],
    }];
  });
  for (const sample of samples) {
    sample.displayTime = counts.get(sample.localKey) > 1 ? sample.time + " (" + sample.offset + ")" : sample.time;
    sample.label = shortDateFormat.format(new Date(sample.day + "T00:00:00Z")) + " às " + sample.displayTime;
  }
  return samples;
}

function displayHourly(samples, currentHour) {
  const hadFocus = hourlyList.contains(document.activeElement);
  const rows = samples.map((sample, index) => {
    const row = document.createElement("li");
    row.innerHTML = '<button class="hourly-choice" type="button" aria-controls="detalhes-horarios">' +
      '<span class="hourly-date" aria-hidden="true"></span><time></time><span class="hourly-icon" aria-hidden="true"></span>' +
      '<strong></strong><span class="hourly-rain"></span></button>';
    const button = row.firstElementChild;
    button.dataset.timestamp = sample.timestamp;
    if (sample.timestamp === currentHour) button.setAttribute("aria-current", "time");
    const time = row.querySelector("time");
    time.dateTime = new Date(sample.timestamp * 1000).toISOString();
    time.textContent = sample.displayTime;
    if (sample.timestamp === currentHour) {
      row.querySelector(".hourly-date").textContent = "Hora atual";
    } else if (index === 0 || samples[index - 1].day !== sample.day) {
      row.querySelector(".hourly-date").textContent = shortDateFormat.format(new Date(sample.day + "T00:00:00Z"));
    }
    const [description, icon] = describeWeather(sample.weather_code, sample.is_day !== 0);
    const temperature = formatReading(sample.temperature_2m, " °C");
    const rain = "Chance: " + formatReading(sample.precipitation_probability, "%");
    button.setAttribute("aria-label", "Previsão para " + sample.label + " · " + description +
      " · Temperatura: " + temperature + " · " + rain);
    row.querySelector(".hourly-icon").textContent = icon;
    row.querySelector("strong").textContent = temperature;
    row.querySelector(".hourly-rain").textContent = rain;
    return row;
  });
  const preserved = samples.find(({ timestamp }) => timestamp === selectedHour);
  const scroll = preserved ? hourlyList.scrollLeft : 0;
  hourlyList.replaceChildren(...rows);
  hourlyList.scrollLeft = scroll;
  const selected = selectHourlySample(preserved ?? samples[0]);
  if (hadFocus) (selected ?? document.querySelector(".hourly-charts-link")).focus({ preventScroll: true });
  hourlyList.hidden = rows.length === 0;
  hourlyStatus.hidden = timelineDay ? rows.length > 0 : rows.length === 24;
  hourlyStatus.textContent = rows.length && !timelineDay
    ? "Previsão disponível para " + rows.length + " das próximas 24 horas."
    : "Previsão horária indisponível.";
}

function displayTimeline() {
  const { samples, upcoming, currentHour } = displayedForecast;
  const dated = timelineDay && samples.filter((sample) => sample.day === timelineDay);
  if (dated && !dated.length) timelineDay = undefined;
  displayedForecast.timeline = timelineDay ? dated : upcoming;
  hourlyTitle.textContent = timelineDay ? "Previsão por hora · " +
    shortDateFormat.format(new Date(timelineDay + "T00:00:00Z")) : "Próximas 24 horas";
  timelineReset.hidden = !timelineDay;
  displayHourly(displayedForecast.timeline, currentHour);
}

function resetTimeline() {
  timelineDay = undefined;
  displayTimeline();
  selectForecastDay(undefined);
}

timelineReset.addEventListener("click", () => {
  resetTimeline();
  (hourlyList.querySelector('[aria-pressed="true"]') ?? document.querySelector(".hourly-charts-link")).focus();
});

function selectHourlySample(sample) {
  selectedHour = sample?.timestamp;
  let selected;
  for (const button of hourlyList.querySelectorAll(".hourly-choice")) {
    const active = Number(button.dataset.timestamp) === selectedHour;
    button.tabIndex = active ? 0 : -1;
    button.setAttribute("aria-pressed", String(active));
    if (active) selected = button;
  }
  hourlyDetail.hidden = !sample;
  if (!sample) return undefined;
  hourlyDetailTime.dateTime = new Date(sample.timestamp * 1000).toISOString();
  if (hourlyDetailTime.textContent !== sample.label) hourlyDetailTime.textContent = sample.label;
  for (const reading of hourlyDetailReadings) {
    const key = reading.dataset.hourly;
    reading.textContent = key === "weather_code"
      ? describeWeather(sample.weather_code, sample.is_day !== 0)[0]
      : formatReading(sample[key], hourlyUnits[key]);
  }
  return selected;
}

function activateHour(button, focusDetails = false) {
  const sample = displayedForecast.timeline.find(({ timestamp }) => timestamp === Number(button.dataset.timestamp));
  if (!sample) return;
  selectHourlySample(sample);
  if (selectedDay) selectForecastDay(undefined);
  else chart.selectTimestamp(selectedHour);
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (focusDetails) {
    hourlyDetail.querySelector("h3").focus();
    const card = button.getBoundingClientRect();
    const list = hourlyList.getBoundingClientRect();
    hourlyList.scrollBy({ left: card.left - list.left - (list.width - card.width) / 2,
      behavior: reducedMotion ? "instant" : "smooth" });
  } else {
    button.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reducedMotion ? "instant" : "smooth" });
  }
}

insightsPanel.addEventListener("click", (event) => {
  const recommendation = event.target.closest(".insights-hour");
  if (!recommendation) return;
  if (timelineDay) resetTimeline();
  const hour = hourlyList.querySelector('[data-timestamp="' + recommendation.dataset.timestamp + '"]');
  if (hour) activateHour(hour, true);
});

planner.list.addEventListener("click", (event) => {
  const link = event.target.closest("a[data-timestamp]");
  if (link && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
    pendingPlannerHour = Number(link.dataset.timestamp);
  }
});

function openPlannerHour(timestamp) {
  const sample = displayedForecast?.samples.find((entry) => entry.timestamp === timestamp);
  if (!sample) return;
  timelineDay = displayedForecast.upcoming.includes(sample) ? undefined : sample.day;
  selectedHour = timestamp;
  displayTimeline();
  selectForecastDay(undefined);
  const button = hourlyList.querySelector('[aria-pressed="true"]');
  if (button) activateHour(button, true);
}

hourlyList.addEventListener("click", (event) => {
  const button = event.target.closest(".hourly-choice");
  if (button) activateHour(button);
});

hourlyList.addEventListener("keydown", (event) => {
  const button = event.target.closest(".hourly-choice");
  if (!button || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const row = button.parentElement;
  const destination = {
    ArrowLeft: row.previousElementSibling, ArrowRight: row.nextElementSibling,
    Home: hourlyList.firstElementChild, End: hourlyList.lastElementChild,
  }[event.key]?.firstElementChild;
  event.preventDefault();
  if (!destination) return;
  destination.focus({ preventScroll: true });
  activateHour(destination);
});

function selectForecastDay(day, updateChart = true) {
  selectedDay = day;
  const { daily, samples, timeline } = displayedForecast;
  const index = day ? daily.time.indexOf(day) : -1;
  for (const button of document.querySelectorAll(".forecast-choice")) {
    button.setAttribute("aria-pressed", String(button.dataset.day === day));
  }
  calendarDetail.hidden = index < 0 || Boolean(displayedForecast.today && day < displayedForecast.today);
  chartReset.disabled = index < 0 && !timelineDay;
  if (index < 0) {
    if (updateChart) {
      chart.setSamples(timeline, "Previsão do modelo · " +
        (timelineDay ? shortDateFormat.format(new Date(timelineDay + "T00:00:00Z")) : "próximas 24 horas") + " · horário local");
      chart.selectTimestamp(selectedHour);
    }
    return;
  }
  const date = new Date(day + "T00:00:00Z");
  const label = weekdayFormat.format(date) + ", " + shortDateFormat.format(date);
  const [description] = describeWeather(daily.weather_code?.[index]);
  const summary = description + " · " +
    "Máxima: " + formatReading(daily.temperature_2m_max?.[index], " °C") + " · " +
    "Mínima: " + formatReading(daily.temperature_2m_min?.[index], " °C") + " · " +
    "Maior chance horária de precipitação: " + formatReading(daily.precipitation_probability_max?.[index], "%");
  const sunrise = daily.sunrise?.[index];
  const sunset = daily.sunset?.[index];
  const extra =
    "Nascer do sol: " + getLocalTime(sunrise) + " · " +
    "Pôr do sol: " + getLocalTime(sunset) + " · " +
    "Luz do dia: " + describeDaylight(sunrise, sunset) + " · " +
    "Índice UV máximo: " + describeUv(daily.uv_index_max?.[index]).reading;
  calendarDetail.querySelector("h2").textContent = label;
  calendarDetail.querySelector(".forecast-detail-summary").textContent = summary;
  calendarDetail.querySelector(".forecast-detail-extra").textContent = extra;
  if (updateChart) chart.setSamples(samples.filter((sample) => sample.day === day),
    "Previsão do modelo · " + label + " · horário local");
}

chartReset.addEventListener("click", () => {
  if (timelineDay) resetTimeline();
  else selectForecastDay(undefined);
  (chart.content.hidden ? chart.metric : chart.range).focus();
});
document.querySelector(".hourly-charts-link").addEventListener("click", (event) => {
  if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) selectForecastDay(undefined);
});

function displayWeather(location, { current, daily, hourly, timezone, utc_offset_seconds }, { loadedAt = new Date(), saved = false } = {}) {
  configureClock(timezone);
  const previousLocation = displayedWeather?.location;
  const sameLocation = location === previousLocation || (isCity(location) && location.id === previousLocation?.id);
  if (!sameLocation) {
    selectedHour = undefined;
    timelineDay = undefined;
    hourlyList.scrollLeft = 0;
    advisoryDialog.querySelector(".advisory-list").replaceChildren();
  }
  displayedWeather = { location, current, timezone, saved };
  assistant.updateLocation(location);
  displayCurrentWeather(location, current);
  const place = [location.name, cityRegion(location)].filter(Boolean).join(" · ");
  calendarPanel.querySelector(".calendar-location").textContent = place;
  document.querySelector(".charts-location").textContent = place;

  const days = daily.time.map((timestamp) => dailyDate(timestamp, utc_offset_seconds, (time) => getLocalParts(time).day));
  if (!sameLocation || !days.includes(selectedDay)) selectedDay = undefined;
  const now = new Date();
  displayedForecast = { daily: { ...daily, time: days }, samples: makeHourlySamples(hourly), loadedAt };
  if (!saved) forecastHistory.record(location, displayedForecast.daily, timezone, utc_offset_seconds, loadedAt);
  updateClock(now);
  weatherPanel.hidden = false;
  chartCard.hidden = false;
  displayDailyMetrics(now, true);
}

function displayCurrentWeather(location, current) {
  const saved = displayedWeather.saved;
  document.querySelector("#current-title").textContent = saved ? "Condições da consulta salva" : "Condições atuais";
  document.querySelector("#metrics-title").textContent = saved ? "Métricas da consulta salva" : "Métricas atuais";
  const { temperature_2m, relative_humidity_2m, wind_speed_10m, weather_code, is_day } = current;
  const [description, icon] = describeWeather(weather_code, is_day !== 0);
  const region = cityRegion(location);
  const regionLabel = weatherPanel.querySelector(".region");
  regionLabel.textContent = region;
  regionLabel.hidden = !region;

  weatherPanel.querySelector(".city").textContent = location.name;
  weatherPanel.querySelector(".icon").textContent = icon;
  weatherPanel.querySelector(".description").textContent = description;
  const temperature = weatherPanel.querySelector(".temp");
  const convertedTemperature = convertReading(temperature_2m, "°C");
  temperature.classList.toggle("reading-unavailable", !Number.isFinite(convertedTemperature));
  if (Number.isFinite(convertedTemperature)) {
    const unit = document.createElement("span");
    unit.textContent = " " + readingUnit("°C");
    temperature.replaceChildren(numberFormat.format(convertedTemperature), unit);
  } else {
    temperature.textContent = "Temperatura indisponível";
  }
  weatherPanel.querySelector(".feels-like").textContent =
    "Sensação térmica: " + formatReading(current.apparent_temperature, " °C");
  const observation = getLocalParts(current.time);
  const observedDate = observation.day && new Date(observation.day + "T00:00:00Z");
  weatherPanel.querySelector(".observation-time").textContent = !observedDate || !Number.isFinite(observedDate.getTime())
    ? (saved ? "Horário da leitura salva indisponível." : "Horário dos dados atuais indisponível.")
    : "Dados de " + shortDateFormat.format(observedDate) + " às " + observation.time + " (horário local)";
  displayPercentage(".humidity", relative_humidity_2m);
  displayPercentage(".cloud-cover", current.cloud_cover);
  displayMetricReading(weatherPanel.querySelector(".wind"), wind_speed_10m, " km/h");
  weatherPanel.querySelector(".wind-gusts").textContent = formatReading(current.wind_gusts_10m, " km/h");
  const direction = current.wind_direction_10m;
  const compass = weatherPanel.querySelector(".compass");
  const validDirection = Number.isFinite(direction) && direction >= 0 && direction <= 360;
  compass.hidden = !validDirection;
  if (validDirection) compass.style.setProperty("--bearing", direction + "deg");
  const bearings = ["N", "NE", "L", "SE", "S", "SO", "O", "NO"];
  weatherPanel.querySelector(".wind-direction").textContent = validDirection
    ? bearings[Math.round(direction / 45) % bearings.length] + " · " + formatReading(direction, "°")
    : "Indisponível";
  displayMetricReading(weatherPanel.querySelector(".surface-pressure"), current.surface_pressure, " hPa");
  displayMetricReading(weatherPanel.querySelector(".precipitation-amount"), current.precipitation, " mm");
  const interval = weatherPanel.querySelector(".precipitation-interval");
  const showInterval = Number.isFinite(current.precipitation) && Number.isFinite(current.interval) && current.interval > 0;
  interval.hidden = !showInterval;
  interval.textContent = showInterval
    ? "Acumulada nos " + formatReading(current.interval / 60, " min") + " anteriores à leitura" : "";
  weatherPanel.querySelector(".current").dataset.sky = is_day === 0 ? "night" : weather_code <= 2 ? "clear" : "cloudy";
}

function displayDailyMetrics(now, newForecast = false, unitsChanged = false) {
  const { daily, samples } = displayedForecast;
  const saved = displayedWeather.saved;
  const timestamp = Math.floor(now.getTime() / 1000);
  const current = samples.findLast((sample) => sample.timestamp <= timestamp && timestamp - sample.timestamp < 3600);
  const today = getLocalParts(timestamp).day;
  const oldDay = displayedForecast.today;
  const hourKey = current?.timestamp ?? Math.floor(timestamp / 3600);
  if (!newForecast && !unitsChanged && hourKey === displayedHour && oldDay === today) return;
  displayedHour = hourKey;
  displayedForecast.today = today;
  const selectionExpired = Boolean(selectedDay && today && selectedDay < today);
  if (selectionExpired) selectedDay = undefined;
  const start = current?.timestamp ?? timestamp;
  displayedForecast.currentHour = current?.timestamp;
  displayedForecast.upcoming = samples.filter((sample) =>
    sample.timestamp >= start && sample.timestamp < start + 24 * 3600);
  if (timelineDay && today && timelineDay < today) timelineDay = undefined;
  displayTimeline();
  planner.update(displayedWeather.location, saved ? [] : samples, timestamp, today, getLocalParts(timestamp + plannerHorizon).day);
  if (saved) planner.status.textContent = "Atualize a previsão para receber recomendações de atividades.";
  const tomorrow = today ? new Date(Date.parse(today + "T00:00:00Z") + 86400000).toISOString().slice(0, 10) : undefined;
  const dayIndex = Array.isArray(daily?.time) && today ? daily.time.indexOf(today) : -1;
  renderWeatherInsights(insightsPanel, daily, dayIndex, saved ? [] : displayedForecast.upcoming);
  if (saved) insightsPanel.querySelector(".insights-empty").textContent = "Atualize a previsão para receber sugestões.";
  const loadedAt = displayedForecast.loadedAt;
  renderForecastAdvisories(advisoryDialog, advisoryButton, saved ? [] : displayedForecast.upcoming, current?.timestamp ?? timestamp,
    displayedWeather.location, loadedAt, clockFormat?.format(loadedAt) ?? "horário local indisponível");
  if (saved) {
    advisoryButton.setAttribute("aria-label", "Avisos aguardando atualização da previsão");
    advisoryDialog.querySelector(".advisory-empty").textContent = "Atualize a previsão para avaliar os avisos.";
  }
  displayPercentage(".precipitation", daily?.precipitation_probability_max?.[dayIndex]);
  const uv = describeUv(daily?.uv_index_max?.[dayIndex]);
  displayMetricReading(weatherPanel.querySelector(".uv-index"), uv.index, "", uv.category);
  weatherPanel.querySelector(".uv-hourly").textContent = describeUv(current?.uv_index).reading;
  const guidance = weatherPanel.querySelector(".uv-guidance");
  guidance.hidden = !uv.guidance;
  guidance.textContent = uv.guidance;
  const sunrise = daily?.sunrise?.[dayIndex];
  const sunset = daily?.sunset?.[dayIndex];
  displaySolarTime(weatherPanel.querySelector(".sunrise"), sunrise);
  displaySolarTime(weatherPanel.querySelector(".sunset"), sunset);
  weatherPanel.querySelector(".daylight-duration").textContent = describeDaylight(sunrise, sunset);
  displayMetricReading(weatherPanel.querySelector(".temperature-max"), daily?.temperature_2m_max?.[dayIndex], " °C");
  displayMetricReading(weatherPanel.querySelector(".temperature-min"), daily?.temperature_2m_min?.[dayIndex], " °C");
  if (newForecast || unitsChanged || oldDay !== today) displayForecast(daily, today, tomorrow);
  if (newForecast || unitsChanged || oldDay !== today || !selectedDay) {
    selectForecastDay(selectedDay, newForecast || !unitsChanged || oldDay !== today || selectionExpired);
  }
}

function showSavedForecast(match) {
  const saved = readOfflineForecast(match);
  if (!saved) return false;
  displayWeather(saved.city, saved.forecast, { loadedAt: saved.loadedAt, saved: true });
  selectedLocation = saved.city;
  searchInput.value = saved.city.name;
  cityDirectory.setCurrent(saved.city, false, false);
  if (!assistant.panel.hidden) assistant.refreshQuestions();
  return true;
}

function markWeatherSaved() {
  if (!displayedWeather || displayedWeather.saved) return;
  displayedWeather.saved = true;
  assistant.updateLocation(displayedWeather.location);
  displayCurrentWeather(displayedWeather.location, displayedWeather.current);
  displayDailyMetrics(new Date(), true);
}

function showOffline(match) {
  const found = displayedWeather
    ? !match || (typeof match === "string" ? match.trim().toLocaleLowerCase("pt-BR") === displayedWeather.location.name.toLocaleLowerCase("pt-BR")
      : match === displayedWeather.location || (isCity(match) && match.id === displayedWeather.location.id))
    : false;
  const available = found || showSavedForecast(match);
  markWeatherSaved();
  setWeatherStatus("offline", available ? "" : "Não há uma previsão salva para esta cidade. Tente novamente quando houver conexão.");
}

async function loadWeather(resolveLocation, {
  loadingMessage = "Carregando dados meteorológicos…", remember = false, recordSearch = false,
} = {}) {
  activeRequest?.abort();
  const request = new AbortController();
  activeRequest = request;
  setWeatherStatus("loading", loadingMessage);
  let location;

  try {
    location = await resolveLocation(request.signal);
    if (request.signal.aborted || !location) return;
    if (!navigator.onLine) {
      showOffline(location);
      return;
    }
    setWeatherStatus("loading", "Carregando dados meteorológicos…");

    const forecast = await fetchForecast(location, request.signal);
    if (request.signal.aborted) return;
    if (!forecast.available) {
      if (!displayedWeather) showSavedForecast(location);
      markWeatherSaved();
      setWeatherStatus("empty", "Não há dados meteorológicos disponíveis para esta cidade." +
        (selectedLocation ? " Exibindo a última previsão carregada." : ""));
      return;
    }
    const loadedAt = new Date();
    displayWeather(location, forecast, { loadedAt });
    saveOfflineForecast(location, forecast, loadedAt);
    selectedLocation = location;
    cityDirectory.setCurrent(location, remember, recordSearch);
    setWeatherStatus("ready");
    if (!assistant.panel.hidden) assistant.refreshQuestions();
    showActiveEnvironment();
  } catch {
    if (!request.signal.aborted) {
      if (!navigator.onLine) {
        showOffline(location);
        return;
      }
      if (location && !displayedWeather) showSavedForecast(location);
      markWeatherSaved();
      setWeatherStatus("error",
        "Não foi possível carregar os dados meteorológicos. Verifique sua conexão e tente novamente." +
        (selectedLocation ? " Exibindo os dados da última consulta bem-sucedida." : ""));
    }
  } finally {
    if (activeRequest === request) activeRequest = undefined;
  }
}

async function fetchLocations(city, signal) {
  if (signal.aborted) throw signal.reason;
  const name = city.trim().normalize("NFC");
  const key = name.toLocaleLowerCase("pt-BR");
  const cached = locationCache.get(key);
  if (cached && Date.now() - cached.time < 5 * 60 * 1000) return cached.results;
  let pending = pendingLocations.get(key);
  if (!pending || pending.controller.signal.aborted) {
    const controller = new AbortController();
    pending = { controller, consumers: new Set() };
    pendingLocations.set(key, pending);
    pending.result = fetchJson("https://geocoding-api.open-meteo.com/v1/search", {
      name, count: 8, language: "pt",
    }, controller.signal).then(({ results }) => {
      const cities = uniqueCities(results);
      if (!controller.signal.aborted) {
        locationCache.delete(key);
        locationCache.set(key, { time: Date.now(), results: cities });
        if (locationCache.size > 50) locationCache.delete(locationCache.keys().next().value);
      }
      return cities;
    }).finally(() => {
      if (pendingLocations.get(key) === pending) pendingLocations.delete(key);
    });
  }
  return new Promise((resolve, reject) => {
    const consumer = {};
    pending.consumers.add(consumer);
    const release = () => {
      signal.removeEventListener("abort", abort);
      pending.consumers.delete(consumer);
    };
    const abort = () => {
      release();
      if (!pending.consumers.size) pending.controller.abort();
      reject(signal.reason);
    };
    signal.addEventListener("abort", abort, { once: true });
    pending.result.then((results) => {
      release();
      resolve(results);
    }, (error) => {
      release();
      reject(error);
    });
  });
}

function searchWeather(city, cached, remember = true) {
  if (!navigator.onLine) {
    showOffline(city);
    return;
  }
  if (city.length < 2) {
    activeRequest?.abort();
    setWeatherStatus("error", "Digite pelo menos duas letras do nome da cidade.");
    return;
  }
  return loadWeather(async (signal) => {
    try {
      const results = cached ?? await fetchLocations(city, signal);
      if (signal.aborted) return;
      if (!results.length) {
        setWeatherStatus("empty", "Cidade não encontrada. Confira o nome e tente novamente.");
        return;
      }
      searchInput.value = results[0].name;
      return results[0];
    } catch {
      if (!signal.aborted) {
        if (!displayedWeather && !remember) showSavedForecast(city);
        setWeatherStatus("error", "Não foi possível buscar cidades. Verifique a conexão e tente novamente.");
      }
    }
  }, { loadingMessage: "Buscando cidade…", remember, recordSearch: remember });
}

function selectCity(location, recordSearch) {
  searchInput.value = location.name;
  if (window.location.hash === "#favoritos") {
    window.location.hash = "#painel";
  }
  return loadWeather(() => location, { remember: true, recordSearch });
}

function locateUser(signal) {
  if (!navigator.geolocation) {
    setWeatherStatus("error", "A localização não está disponível neste navegador. Busque pelo nome da cidade.");
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      resolve({ name: "Minha localização", latitude: coords.latitude, longitude: coords.longitude });
    }, (error) => {
      if (!signal.aborted) {
        setWeatherStatus("error", error.code === 1
          ? "A permissão de localização foi negada. Libere o acesso no navegador ou busque pelo nome da cidade."
          : "Não foi possível obter sua localização. Tente novamente ou busque pelo nome da cidade.");
      }
      resolve(null);
    }, { timeout: 10000 });
  });
}

const cityDirectory = new CityDirectory(searchForm, fetchLocations, searchWeather, selectCity);
const comparePanel = document.querySelector("#comparar");
const comparison = new WeatherComparison(comparePanel, { fetchLocations, fetchForecast, describeWeather, formatReading });
const mapPanel = document.querySelector("#mapas");
const airPanel = document.querySelector("#qualidade-do-ar");
const weatherMap = new WeatherMap(mapPanel, { fetchJson, describeWeather, formatReading });
const airQuality = new AirQuality(airPanel, { fetchJson, formatReading, displayMetricReading });

if (isCity(storedPreferences?.defaultCity)) preferences.defaultCity = storedPreferences.defaultCity;
const settingsFeedback = settingsPanel.querySelector(".settings-feedback");
const themeSelect = document.querySelector("#theme-preference");
const defaultCityForm = settingsPanel.querySelector(".default-city-search");
const resetDefaultCity = settingsPanel.querySelector(".reset-default-city");
let defaultCityRequest;

function persistSettings(message) {
  settingsFeedback.textContent = savePreferences()
    ? message : "Preferência aplicada nesta visita. Não foi possível salvá-la no navegador.";
}

function updateWeatherUnits() {
  if (displayedWeather) {
    displayCurrentWeather(displayedWeather.location, displayedWeather.current);
    displayDailyMetrics(new Date(), false, true);
    chart.refresh();
  }
  comparison.update({ preserveHour: true });
  forecastHistory.refreshUnits();
  if (weatherMap.pointWeather) weatherMap.renderPointWeather();
}

for (const [key, control] of [
  ["temperature", document.querySelector("#temperature-unit")],
  ["wind", document.querySelector("#wind-unit")],
  ["theme", themeSelect],
]) {
  control.value = preferences[key];
  control.addEventListener("change", () => {
    if (!preferenceOptions[key].includes(control.value)) return;
    preferences[key] = control.value;
    if (key === "theme") applyTheme();
    else updateWeatherUnits();
    persistSettings("Preferência salva.");
  });
}
applyTheme();
document.querySelector(".theme-button").addEventListener("click", () => {
  themeSelect.value = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  themeSelect.dispatchEvent(new Event("change"));
});

function renderDefaultCity() {
  const city = preferences.defaultCity;
  settingsPanel.querySelector(".default-city-label").textContent = city
    ? [city.name, cityRegion(city)].filter(Boolean).join(" · ")
    : "Última cidade consultada. Na primeira visita, Denver.";
  resetDefaultCity.disabled = !city;
}

function setDefaultCity(city) {
  defaultCityRequest?.abort();
  if (!isCity(city)) {
    settingsFeedback.textContent = "Cidade não encontrada. Confira o nome e tente novamente.";
    return;
  }
  preferences.defaultCity = city;
  defaultCityForm.querySelector("input").value = "";
  renderDefaultCity();
  persistSettings(city.name + " será aberta ao iniciar o ATMOS.");
}

new CitySearch(defaultCityForm, fetchLocations, async (query, cached) => {
  defaultCityRequest?.abort();
  if (query.length < 2) {
    settingsFeedback.textContent = "Digite pelo menos duas letras do nome da cidade.";
    return;
  }
  const request = new AbortController();
  defaultCityRequest = request;
  settingsFeedback.textContent = "Buscando cidade…";
  try {
    const results = cached ?? await fetchLocations(query, request.signal);
    if (!request.signal.aborted) setDefaultCity(results[0]);
  } catch {
    if (!request.signal.aborted) settingsFeedback.textContent = "Não foi possível buscar a cidade. Tente novamente.";
  }
}, setDefaultCity);
defaultCityForm.querySelector("input").addEventListener("input", () => {
  defaultCityRequest?.abort();
  settingsFeedback.textContent = "";
});
resetDefaultCity.addEventListener("click", () => {
  defaultCityRequest?.abort();
  delete preferences.defaultCity;
  renderDefaultCity();
  defaultCityForm.querySelector("input").focus();
  persistSettings("A última cidade consultada será aberta ao iniciar o ATMOS.");
});
renderDefaultCity();

function showActiveEnvironment() {
  if (!mapPanel.hidden) weatherMap.show(selectedLocation);
  if (!airPanel.hidden) airQuality.show(selectedLocation);
}
document.querySelector(".location-button").addEventListener("click", () => {
  if (!navigator.onLine) {
    showOffline();
    return;
  }
  cityDirectory.close();
  loadWeather(locateUser, { loadingMessage: "Obtendo sua localização…" });
});
function retryForecast() {
  if (!navigator.onLine || activeRequest) return;
  if (selectedLocation) loadWeather(() => selectedLocation);
  else if (searchInput.value.trim()) searchWeather(searchInput.value.trim());
  else loadDefaultCity();
}
refreshButton.addEventListener("click", retryForecast);
connectionRetry.addEventListener("click", retryForecast);

const layout = document.querySelector(".layout");
const sidebarToggle = document.querySelector(".sidebar-toggle");
const sidebar = document.querySelector(".sidebar");
const mobileSectionName = sidebar.querySelector(".mobile-section-name");
const sectionLinks = sidebar.querySelectorAll("nav a");
const pages = new Map([...document.querySelectorAll("[data-page]")].map((page) => ["#" + page.id, page]));
const mobileViewport = matchMedia("(max-width: 720px), (max-width: 980px) and (max-height: 500px) and (any-pointer: coarse)");
let activePage;

function setMenuCollapsed(collapsed) {
  layout.classList.toggle("mobile-navigation", mobileViewport.matches);
  layout.classList.toggle("menu-collapsed", collapsed);
  const label = mobileViewport.matches ? (collapsed ? "Abrir páginas" : "Fechar páginas")
    : (collapsed ? "Expandir menu" : "Recolher menu");
  sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
  sidebarToggle.setAttribute("aria-label", label);
  sidebarToggle.title = label;
}
setMenuCollapsed(mobileViewport.matches);
mobileViewport.addEventListener("change", (event) => setMenuCollapsed(event.matches));
sidebarToggle.addEventListener("click", () => {
  setMenuCollapsed(!layout.classList.contains("menu-collapsed"));
});
sidebar.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && mobileViewport.matches && !layout.classList.contains("menu-collapsed")) {
    setMenuCollapsed(true);
    sidebarToggle.focus();
  }
});
for (const type of ["click", "focusin"]) {
  document.addEventListener(type, (event) => {
    if (mobileViewport.matches && !sidebar.contains(event.target) && !layout.classList.contains("menu-collapsed")) {
      setMenuCollapsed(true);
    }
  });
}
for (const link of sectionLinks) {
  link.addEventListener("click", (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (location.hash === link.hash) {
      event.preventDefault();
      updateCurrentSection();
    }
  });
}

document.querySelector(".skip-link").addEventListener("click", (event) => {
  event.preventDefault();
  activePage.focus();
});

function updateCurrentSection(moveFocus = true) {
  const target = pages.has(location.hash) ? location.hash : "#painel";
  activePage = pages.get(target);
  if (mobileViewport.matches) setMenuCollapsed(true);
  for (const page of pages.values()) page.hidden = page !== activePage;
  if (!assistant.panel.hidden) assistant.refreshQuestions();
  for (const link of sectionLinks) {
    if (link.hash === target) {
      link.setAttribute("aria-current", "page");
      mobileSectionName.textContent = link.getAttribute("aria-label");
    } else link.removeAttribute("aria-current");
  }
  if (moveFocus) {
    const details = focusCalendarDay && activePage === calendarPanel && !calendarDetail.hidden;
    (details ? calendarDetail : activePage).focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
  focusCalendarDay = false;
  showActiveEnvironment();
  if (target === "#painel" && pendingPlannerHour !== undefined) {
    const timestamp = pendingPlannerHour;
    pendingPlannerHour = undefined;
    openPlannerHour(timestamp);
  }
}
history.scrollRestoration = "manual";
window.addEventListener("hashchange", () => updateCurrentSection());
updateCurrentSection(Boolean(location.hash));

function loadDefaultCity() {
  const saved = preferences.defaultCity ?? cityDirectory.state.last;
  if (!navigator.onLine) {
    if (saved) searchInput.value = saved.name;
    return showOffline(saved);
  }
  if (saved) {
    searchInput.value = saved.name;
    return loadWeather(() => saved);
  }
  return searchWeather("Denver", undefined, false);
}

window.addEventListener("offline", () => {
  activeRequest?.abort();
  activeRequest = undefined;
  if (displayedWeather) showOffline();
  else loadDefaultCity();
  if (!assistant.panel.hidden) assistant.refreshQuestions();
});
window.addEventListener("online", renderConnection);
loadDefaultCity();
setInterval(() => {
  if (!clockFormat || !displayedForecast) return;
  const now = new Date();
  updateClock(now);
  displayDailyMetrics(now);
}, 15000);
