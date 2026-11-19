function loadLeaflet() {
  if (loadLeaflet.pending) return loadLeaflet.pending;
  const base = "https://unpkg.com/leaflet@1.9.4/dist/leaflet";
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = base + ".css";
  css.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
  const script = document.createElement("script");
  script.src = base + ".js";
  script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
  const assets = Promise.all([css, script].map((element) => new Promise((resolve, reject) => {
    element.crossOrigin = "anonymous";
    element.onload = resolve;
    element.onerror = reject;
    document.head.append(element);
  })));
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("Tempo limite ao carregar o mapa.")), 12000);
  });
  loadLeaflet.pending = Promise.race([assets, timeout]).then(() => {
    if (!window.L?.map) throw new Error("A biblioteca do mapa não foi inicializada.");
    return window.L;
  }).catch((error) => {
    css.remove();
    script.remove();
    loadLeaflet.pending = undefined;
    throw error;
  }).finally(() => clearTimeout(timer));
  return loadLeaflet.pending;
}

function environmentLocation(location) {
  return [location.name, cityRegion(location)].filter(Boolean).join(" · ");
}

function environmentStatus(element, message = "", state = "") {
  element.textContent = message;
  element.dataset.state = state;
}

const mapAttribution = '© <a href="https://www.openstreetmap.org/copyright">colaboradores do OpenStreetMap</a>';

function createMapTiles(leaflet) {
  const requests = new WeakMap();
  const MapTiles = leaflet.TileLayer.extend({
    createTile(coords, done) {
      const tile = document.createElement("img");
      tile.alt = "";
      tile.setAttribute("role", "presentation");
      const controller = new AbortController();
      requests.set(tile, controller);
      const timeout = setTimeout(() => controller.abort("tempo limite"), 12000);
      const load = async () => {
        let objectUrl;
        let failure;
        try {
          const response = await fetch(this.getTileUrl(coords), {
            signal: controller.signal,
            referrerPolicy: "strict-origin-when-cross-origin",
            credentials: "omit",
          });
          if (!response.ok) {
            const error = new Error("Não foi possível obter o mosaico.");
            error.status = response.status;
            const retryAfter = response.headers.get("Retry-After");
            if (retryAfter) {
              error.retryAfter = /^\d+$/.test(retryAfter) ? Number(retryAfter) * 1000 : Date.parse(retryAfter) - Date.now();
            }
            throw error;
          }
          const blob = await response.blob();
          controller.signal.throwIfAborted();
          objectUrl = URL.createObjectURL(blob);
          tile.src = objectUrl;
          await tile.decode();
          controller.signal.throwIfAborted();
        } catch (error) {
          failure = error;
        } finally {
          clearTimeout(timeout);
          requests.delete(tile);
          if (objectUrl) URL.revokeObjectURL(objectUrl);
        }
        if (controller.signal.reason !== "mosaico removido") done(failure, tile);
      };
      load();
      return tile;
    },
  });
  return new MapTiles("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    updateWhenIdle: true,
    updateWhenZooming: false,
    keepBuffer: 1,
  }).on("tileunload", ({ tile }) => requests.get(tile)?.abort("mosaico removido"));
}

class WeatherMap {
  constructor(panel, { fetchJson, describeWeather, formatReading }) {
    this.panel = panel;
    this.fetchJson = fetchJson;
    this.describeWeather = describeWeather;
    this.formatReading = formatReading;
    this.place = panel.querySelector(".map-place");
    this.status = panel.querySelector(".map-status");
    this.grid = panel.querySelector(".map-grid");
    this.canvas = panel.querySelector(".map-canvas");
    this.retry = panel.querySelector(".map-retry");
    this.pointStatus = panel.querySelector(".map-point-status");
    this.pointData = panel.querySelector(".map-point-data");
    this.coordinates = panel.querySelector(".map-point-coordinates");
    this.retryAfter = 0;
    this.retry.addEventListener("click", () => {
      if (this.map) this.loadTiles();
      else this.show(this.location);
    });
    panel.querySelector(".map-center").addEventListener("click", () => this.centerCity());
    panel.querySelector(".map-inspect").addEventListener("click", () => this.inspect(this.map.getCenter()));
  }

  async show(location) {
    if (!location) {
      this.place.textContent = "";
      environmentStatus(this.status, "Selecione uma cidade no Painel para abrir o mapa.", "empty");
      return;
    }
    this.location = location;
    this.place.textContent = environmentLocation(location);
    if (!this.map) {
      this.retry.hidden = true;
      environmentStatus(this.status, "Carregando mapa…", "loading");
      try {
        this.leaflet = await loadLeaflet();
        if (this.panel.hidden || this.location !== location) return;
        if (!this.map) this.createMap();
      } catch {
        if (this.panel.hidden || this.location !== location) return;
        this.grid.hidden = true;
        this.retry.hidden = false;
        environmentStatus(this.status, "Não foi possível abrir o mapa. Verifique a conexão e tente novamente.", "error");
        return;
      }
    }
    if (this.panel.hidden) return;
    this.resize();
    const key = location.latitude + "," + location.longitude;
    if (this.cityKey !== key) {
      this.cityKey = key;
      this.pointRequest?.abort();
      this.pointRequest = undefined;
      this.pointMarker?.remove();
      this.pointMarker = undefined;
      this.pointWeather = undefined;
      this.coordinates.hidden = true;
      this.pointData.hidden = true;
      environmentStatus(this.pointStatus, "Selecione um ponto no mapa para consultar o tempo atual.");
      this.centerCity();
      const coords = [location.latitude, location.longitude];
      if (this.cityMarker) this.cityMarker.setLatLng(coords);
      else this.cityMarker = this.marker(coords, "map-city-marker");
      if (!this.tiles && !this.tilesUnavailable) this.loadTiles();
    }
    this.cityMarker.getElement().setAttribute("aria-label", location.name);
    this.cityMarker.getElement().title = location.name;
  }

  createMap() {
    const L = this.leaflet;
    this.grid.hidden = false;
    this.map = L.map(this.canvas, {
      scrollWheelZoom: false, zoomControl: false, minZoom: 2, maxZoom: 19,
      trackResize: false,
      zoomAnimation: !matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
    this.map.attributionControl.setPrefix('<a href="https://leafletjs.com/">Leaflet</a>');
    L.control.zoom({ zoomInTitle: "Aproximar", zoomOutTitle: "Afastar" }).addTo(this.map);
    this.map.attributionControl.addAttribution(mapAttribution);
    this.map.on("click", ({ latlng }) => this.inspect(latlng));
    new ResizeObserver(() => this.resize()).observe(this.canvas);
  }

  resize() {
    if (!this.panel.hidden && this.canvas.clientWidth && this.canvas.clientHeight) {
      this.map.invalidateSize({ animate: false, debounceMoveend: true });
    }
  }

  loadTiles() {
    const waiting = this.retryAfter - Date.now();
    if (waiting > 0) {
      environmentStatus(this.status, "O provedor limitou as consultas. Aguarde mais " +
        Math.ceil(waiting / 1000) + " s antes de tentar novamente.", "error");
      return;
    }
    if (!["http:", "https:"].includes(location.protocol)) {
      this.tilesUnavailable = true;
      environmentStatus(this.status, "Abra o ATMOS por um servidor HTTP ou HTTPS para carregar os mosaicos.", "error");
      return;
    }
    this.tilesUnavailable = false;
    if (this.tiles) this.tiles.redraw();
    else {
      const tiles = createMapTiles(this.leaflet);
      this.tiles = tiles;
      let failed;
      let loaded;
      tiles.on("loading", () => {
        failed = false;
        loaded = false;
        this.retry.hidden = true;
        this.canvas.setAttribute("aria-busy", "true");
        environmentStatus(this.status, "Carregando mosaicos do mapa…", "loading");
      }).on("tileload", () => {
        loaded = true;
      }).on("tileerror", ({ error }) => {
        if ([401, 403, 429].includes(error?.status)) {
          const wait = error.status === 429 ? Math.max(60000, error.retryAfter || 0) : 0;
          this.retryAfter = Date.now() + wait;
          this.stopTiles(tiles, error.status === 429
            ? "O provedor limitou as consultas. Aguarde " + Math.ceil(wait / 1000) + " s antes de tentar novamente."
            : "O provedor recusou o acesso aos mosaicos. A consulta do tempo continua disponível.");
        } else failed = true;
      }).on("load", () => {
        if (this.tiles !== tiles) return;
        if (failed && !loaded) {
          this.stopTiles(tiles, "Os mosaicos estão indisponíveis. Verifique a conexão e tente novamente.");
          return;
        }
        this.canvas.setAttribute("aria-busy", "false");
        this.retry.hidden = !failed;
        environmentStatus(this.status, failed ? "Alguns mosaicos estão indisponíveis. Você pode tentar novamente." : "",
          failed ? "error" : "");
      }).addTo(this.map);
    }
  }

  stopTiles(tiles, message) {
    if (this.tiles !== tiles) return;
    this.tiles = undefined;
    this.tilesUnavailable = true;
    queueMicrotask(() => tiles.remove());
    this.canvas.setAttribute("aria-busy", "false");
    this.retry.hidden = false;
    environmentStatus(this.status, message, "error");
  }

  marker(coords, className) {
    return this.leaflet.marker(coords, {
      interactive: false,
      keyboard: false,
      icon: this.leaflet.divIcon({ className, iconSize: [18, 18], iconAnchor: [9, 9] }),
    }).addTo(this.map);
  }

  centerCity() {
    this.map.setView([this.location.latitude, this.location.longitude], 11, { animate: false });
  }

  async inspect(latlng) {
    const point = latlng.wrap();
    const key = point.lat + "," + point.lng;
    if (this.pointRequest?.key === key) return;
    this.pointRequest?.abort();
    const request = new AbortController();
    request.key = key;
    this.pointRequest = request;
    if (this.pointMarker) this.pointMarker.setLatLng(latlng);
    else this.pointMarker = this.marker(latlng, "map-selected-marker");
    const coordinates = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 });
    this.coordinates.textContent =
      "Latitude " + coordinates.format(point.lat) + "° · Longitude " + coordinates.format(point.lng) + "°";
    this.coordinates.hidden = false;
    this.pointData.hidden = true;
    this.pointWeather = undefined;
    environmentStatus(this.pointStatus, "Consultando o tempo no ponto…");
    try {
      const keys = ["temperature_2m", "relative_humidity_2m", "wind_speed_10m", "weather_code"];
      const { current, timezone, utc_offset_seconds } = await this.fetchJson("https://api.open-meteo.com/v1/forecast", {
        latitude: point.lat, longitude: point.lng,
        current: [...keys, "is_day"].join(","),
        temperature_unit: "celsius", wind_speed_unit: "kmh", forecast_days: 1,
        timezone: "auto", timeformat: "unixtime",
      }, request.signal);
      if (request.signal.aborted) return;
      const readings = Object.fromEntries([...keys, "is_day"].map((field) => [field, forecastValue(field, current?.[field])]));
      if (!keys.some((field) => Number.isFinite(readings[field]))) {
        environmentStatus(this.pointStatus, "Não há dados meteorológicos disponíveis para este ponto.");
        return;
      }
      this.pointWeather = { ...readings, time: current?.time,
        timezone: validTimeZone(timezone, fixedTimeZone(utc_offset_seconds)) };
      this.renderPointWeather();
      environmentStatus(this.pointStatus);
      this.pointData.hidden = false;
    } catch {
      if (!request.signal.aborted) {
        environmentStatus(this.pointStatus, "Não foi possível consultar o ponto. Tente selecionar novamente.");
      }
    } finally {
      if (this.pointRequest === request) this.pointRequest = undefined;
    }
  }

  renderPointWeather() {
    const current = this.pointWeather;
    const [condition, icon] = this.describeWeather(current.weather_code, current.is_day !== 0);
    this.panel.querySelector(".map-point-condition").textContent = icon + " " + condition;
    const time = isTimestamp(current.time) && current.timezone
      ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short", timeStyle: "short", timeZone: current.timezone, hourCycle: "h23",
      }).format(current.time * 1000) : undefined;
    this.panel.querySelector(".map-point-time").textContent = time
      ? "Estimativa de " + time + " (horário local)" : "Horário local da estimativa indisponível.";
    const list = this.panel.querySelector(".map-point-values");
    list.replaceChildren();
    for (const [label, value, unit] of [
      ["Temperatura", current.temperature_2m, " °C"],
      ["Umidade relativa", current.relative_humidity_2m, "%"],
      ["Velocidade do vento", current.wind_speed_10m, " km/h"],
    ]) {
      const term = document.createElement("dt");
      const reading = document.createElement("dd");
      term.textContent = label;
      reading.textContent = this.formatReading(value, unit);
      list.append(term, reading);
    }
  }
}

const airIndexes = {
  us_aqi: {
    name: "IQA dos EUA (US AQI)",
    limits: [50, 100, 150, 200, 300],
    labels: ["Bom", "Moderado", "Insalubre para grupos sensíveis", "Insalubre", "Muito insalubre", "Perigoso"],
  },
  european_aqi: {
    name: "IQA europeu",
    limits: [20, 40, 60, 80, 100],
    labels: ["Bom", "Razoável", "Moderado", "Ruim", "Muito ruim", "Extremamente ruim"],
  },
};

const airFields = "us_aqi,european_aqi,pm2_5,pm10";

class AirQuality {
  constructor(panel, { fetchJson, formatReading }) {
    this.panel = panel;
    this.fetchJson = fetchJson;
    this.formatReading = formatReading;
    this.place = panel.querySelector(".air-place");
    this.status = panel.querySelector(".air-status");
    this.retry = panel.querySelector(".air-retry");
    this.data = panel.querySelector(".air-data");
    this.scale = panel.querySelector("#air-scale");
    this.chart = new ForecastChart(panel.querySelector(".air-chart"), formatReading);
    this.scale.addEventListener("change", () => {
      this.renderIndex();
      this.chart.metric.value = this.scale.value;
      this.chart.refresh();
    });
    this.retry.addEventListener("click", () => this.show(this.location));
    this.cache = new Map();
  }

  async show(location) {
    this.location = location;
    this.retry.hidden = true;
    if (!location) {
      this.request?.controller.abort();
      this.request = undefined;
      this.data.hidden = true;
      this.place.textContent = "";
      environmentStatus(this.status, "Selecione uma cidade no Painel para consultar a qualidade do ar.", "empty");
      return;
    }
    this.place.textContent = environmentLocation(location);
    const key = location.latitude + "," + location.longitude;
    if (this.request?.key === key) return;
    this.request?.controller.abort();
    this.request = undefined;
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.time < 15 * 60 * 1000) {
      if (this.data.hidden || this.displayedKey !== key || this.displayedHour !== Math.floor(Date.now() / 3600000)) {
        this.render(cached.result);
      }
      return;
    }
    const controller = new AbortController();
    const request = { key, controller };
    this.request = request;
    this.data.hidden = true;
    environmentStatus(this.status, "Consultando a qualidade do ar…", "loading");
    try {
      const result = await this.fetchJson("https://air-quality-api.open-meteo.com/v1/air-quality", {
        latitude: location.latitude, longitude: location.longitude,
        current: airFields, hourly: airFields, past_days: 1, forecast_days: 1,
        timezone: "auto", timeformat: "unixtime",
      }, controller.signal);
      if (controller.signal.aborted) return;
      if (this.render(result)) {
        this.cache.delete(key);
        this.cache.set(key, { result, time: Date.now() });
        if (this.cache.size > 20) this.cache.delete(this.cache.keys().next().value);
      }
    } catch {
      if (!controller.signal.aborted) {
        environmentStatus(this.status, "Não foi possível consultar a qualidade do ar. Verifique a conexão e tente novamente.", "error");
        this.retry.hidden = false;
      }
    } finally {
      if (this.request === request) this.request = undefined;
    }
  }

  render(result) {
    const timezone = validTimeZone(result?.timezone, this.location?.timezone) ?? "UTC";
    const dateOptions = { dateStyle: "short", timeStyle: "short", hourCycle: "h23" };
    const date = new Intl.DateTimeFormat("pt-BR", { ...dateOptions, timeZone: timezone });
    const time = new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    const now = Date.now() / 1000;
    const hourly = result?.hourly;
    const keys = airFields.split(",");
    const samples = timestampEntries(hourly?.time).flatMap(({ time: timestamp, index }) =>
      timestamp > now - 86400 && timestamp <= now ? [{
        timestamp, time: time.format(timestamp * 1000), label: date.format(timestamp * 1000),
        ...Object.fromEntries(keys.map((key) => [key, forecastValue(key, Array.isArray(hourly[key]) ? hourly[key][index] : undefined)])),
      }] : []);
    this.current = Object.fromEntries(keys.map((key) => [key, forecastValue(key, result?.current?.[key])]));
    const available = keys.some((key) => Number.isFinite(this.current[key]) ||
      samples.some((sample) => Number.isFinite(sample[key])));
    environmentStatus(this.status, available ? "" : "Não há estimativas disponíveis para este local.", available ? "" : "empty");
    this.data.hidden = !available;
    this.retry.hidden = available;
    if (!available) return false;
    this.renderIndex();
    this.panel.querySelector(".air-pm25").textContent = this.formatReading(this.current.pm2_5, " µg/m³");
    this.panel.querySelector(".air-pm10").textContent = this.formatReading(this.current.pm10, " µg/m³");
    this.panel.querySelector(".air-time").textContent = isTimestamp(result?.current?.time)
      ? "Estimativa atual: " + date.format(result.current.time * 1000) + " · " + timezone
      : "Horário da estimativa atual indisponível.";
    this.chart.setSamples(samples, "Últimas 24 horas · estimativas horárias · " + timezone);
    this.displayedKey = this.location.latitude + "," + this.location.longitude;
    this.displayedHour = Math.floor(now / 3600);
    return true;
  }

  renderIndex() {
    const index = airIndexes[this.scale.value];
    const raw = this.current?.[this.scale.value];
    const value = Number.isFinite(raw) && raw >= 0 ? raw : undefined;
    const level = index.limits.findIndex((limit) => value <= limit);
    this.panel.querySelector(".air-index-label").textContent = index.name;
    this.panel.querySelector(".air-index").textContent = this.formatReading(value, " pts");
    this.panel.querySelector(".air-category").textContent = value === undefined
      ? "Categoria indisponível."
      : index.labels[level < 0 ? index.labels.length - 1 : level];
    this.panel.querySelector(".air-bands").replaceChildren(...index.labels.map((label, position) => {
      const band = document.createElement("li");
      const lower = index.limits[position - 1];
      const upper = index.limits[position];
      const range = position === 0 ? "de 0 a " + upper
        : upper === undefined ? "acima de " + lower
          : "acima de " + lower + " até " + upper;
      band.textContent = label + ": " + range + " pontos.";
      return band;
    }));
  }
}
