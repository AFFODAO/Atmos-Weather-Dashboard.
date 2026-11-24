const forecastHistoryPolicy = {
  key: "atmos-historico-previsoes",
  version: 1,
  interval: 3 * 3600,
  retention: 30 * 86400,
  limit: 500,
};
const forecastHistoryUnits = {
  temperature_2m_max: "°C",
  temperature_2m_min: "°C",
  precipitation_probability_max: "%",
};
const forecastHistoryDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "UTC" });

function historyTargetDate(day) {
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return undefined;
  const date = new Date(day + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day ? date : undefined;
}

function historyReadings(data) {
  const readings = Object.fromEntries(Object.keys(forecastHistoryUnits).map((key) => [key, forecastValue(key, data?.[key])]));
  if (readings.temperature_2m_min > readings.temperature_2m_max) {
    readings.temperature_2m_min = undefined;
    readings.temperature_2m_max = undefined;
  }
  return readings;
}

function validatedForecastSnapshot(record, zones) {
  if (!Number.isSafeInteger(record?.cityId) || record.cityId <= 0 ||
      typeof record.name !== "string" || !record.name.trim() ||
      !historyTargetDate(record.target) || !isTimestamp(record.recordedAt)) return undefined;
  if (typeof record.timezone !== "string" || record.timezone.length > 100) return undefined;
  if (!zones.has(record.timezone)) zones.set(record.timezone, validTimeZone(record.timezone));
  const timezone = zones.get(record.timezone);
  const readings = historyReadings(record);
  if (!timezone || !Object.values(readings).some(Number.isFinite)) return undefined;
  const offset = record.utcOffset;
  return {
    cityId: record.cityId,
    name: record.name.trim().slice(0, 120),
    region: typeof record.region === "string" ? record.region.trim().slice(0, 160) : "",
    timezone,
    target: record.target,
    recordedAt: record.recordedAt,
    ...(Number.isInteger(offset) && Math.abs(offset) < 86400 ? { utcOffset: offset } : {}),
    ...readings,
  };
}

function retainedForecastSnapshots(records, now) {
  const seen = new Set();
  return records.filter(({ recordedAt }) => recordedAt >= now - forecastHistoryPolicy.retention)
    .sort((a, b) => b.recordedAt - a.recordedAt)
    .filter(({ cityId, target, recordedAt }) => {
      const key = [cityId, target, recordedAt].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, forecastHistoryPolicy.limit);
}

class ForecastHistoryStore {
  constructor() {
    this.records = [];
    this.mode = "local";
    this.reload();
  }

  recordsFor(cityId, target) {
    return this.records.filter((record) => record.cityId === cityId && record.target === target).reverse();
  }

  reload() {
    let raw;
    try {
      raw = localStorage.getItem(forecastHistoryPolicy.key);
    } catch {
      this.mode = "session";
      return;
    }
    let stored;
    try {
      stored = JSON.parse(raw);
    } catch {
      stored = undefined;
    }
    if (stored && Object.hasOwn(stored, "version") && stored.version !== forecastHistoryPolicy.version) {
      this.records = [];
      this.mode = "unsupported";
      return;
    }
    this.mode = "local";
    const zones = new Map();
    const valid = Array.isArray(stored?.records) && stored.version === forecastHistoryPolicy.version
      ? stored.records.map((record) => validatedForecastSnapshot(record, zones)).filter(Boolean) : [];
    this.records = retainedForecastSnapshots(valid, Math.floor(Date.now() / 1000));
    if (valid.length !== this.records.length || (Array.isArray(stored?.records) && stored.records.length !== valid.length)) {
      this.write();
    }
  }

  write() {
    if (this.mode === "unsupported") return;
    try {
      localStorage.setItem(forecastHistoryPolicy.key, JSON.stringify({
        version: forecastHistoryPolicy.version, records: this.records,
      }));
      this.mode = "local";
    } catch {
      this.mode = "session";
    }
  }

  record(city, daily, timezone, utcOffset, recordedAt) {
    if (!isCity(city) || !timezone || !isTimestamp(recordedAt) || this.mode === "unsupported") return false;
    const latest = new Map();
    for (const record of this.records) {
      if (record.recordedAt >= recordedAt - forecastHistoryPolicy.retention &&
          record.cityId === city.id && !latest.has(record.target)) latest.set(record.target, record);
    }
    const zones = new Map();
    const added = [];
    for (const [index, target] of daily.time.entries()) {
      const previous = latest.get(target);
      if (previous && recordedAt - previous.recordedAt < forecastHistoryPolicy.interval) continue;
      const snapshot = validatedForecastSnapshot({
        cityId: city.id, name: city.name, region: cityRegion(city), timezone, utcOffset, target, recordedAt,
        ...Object.fromEntries(Object.keys(forecastHistoryUnits).map((key) => [key, daily[key]?.[index]])),
      }, zones);
      if (!snapshot) continue;
      if (previous && snapshot.timezone === previous.timezone && snapshot.utcOffset === previous.utcOffset &&
          Object.keys(forecastHistoryUnits).every((key) => snapshot[key] === previous[key])) continue;
      latest.set(target, snapshot);
      added.push(snapshot);
    }
    const next = retainedForecastSnapshots([...added, ...this.records], recordedAt);
    if (!added.length && next.length === this.records.length) return false;
    this.records = next;
    this.write();
    return true;
  }

  clear() {
    const accessible = this.mode;
    this.records = [];
    try {
      localStorage.removeItem(forecastHistoryPolicy.key);
      this.mode = "local";
      return true;
    } catch {
      this.mode = accessible === "unsupported" ? "unsupported" : "session";
      return false;
    }
  }
}

class ForecastHistoryView {
  constructor(panel, formatReading) {
    this.panel = panel;
    this.formatReading = formatReading;
    this.store = new ForecastHistoryStore();
    this.city = panel.querySelector("#forecast-history-city");
    this.target = panel.querySelector("#forecast-history-target");
    this.clearButton = panel.querySelector(".forecast-history-clear");
    this.status = panel.querySelector(".forecast-history-status");
    this.notice = panel.querySelector(".forecast-history-storage");
    this.comparison = panel.querySelector(".forecast-history-comparison");
    this.chart = new ForecastChart(panel.querySelector(".forecast-history-chart"), formatReading, {
      irregular: true,
      rangeLabel: "registro",
      descriptions: {
        temperature_2m_max: "Temperatura máxima prevista para a data-alvo em cada consulta registrada.",
        temperature_2m_min: "Temperatura mínima prevista para a data-alvo em cada consulta registrada.",
        precipitation_probability_max: "Maior chance horária de precipitação prevista para a data-alvo em cada consulta registrada.",
      },
    });
    this.city.addEventListener("change", () => this.renderTargets());
    this.target.addEventListener("change", () => this.renderComparison());
    const dialog = panel.querySelector("dialog");
    this.clearButton.addEventListener("click", () => {
      dialog.returnValue = "";
      dialog.showModal();
    });
    dialog.addEventListener("close", () => {
      if (dialog.returnValue !== "limpar") return;
      const cleared = this.store.clear();
      this.render();
      this.status.textContent = cleared ? "Histórico de previsões apagado."
        : "Histórico desta visita apagado. O navegador não permitiu remover os registros armazenados.";
      this.status.focus();
    });
    window.addEventListener("storage", (event) => {
      if (event.key !== forecastHistoryPolicy.key && event.key !== null) return;
      this.store.reload();
      this.render();
    });
    this.render();
  }

  record(city, daily, timezone, offset, now) {
    if (this.store.record(city, daily, timezone, offset, Math.floor(now.getTime() / 1000))) this.render();
  }

  render() {
    const selected = this.city.value;
    const cities = new Map();
    for (const record of this.store.records) {
      if (!cities.has(record.cityId)) cities.set(record.cityId, record);
    }
    this.city.replaceChildren(...[...cities.values()].map(({ cityId, name, region }) =>
      new Option([name, region].filter(Boolean).join(" · "), cityId)));
    if (cities.has(Number(selected))) this.city.value = selected;
    this.city.disabled = !cities.size;
    this.clearButton.disabled = !cities.size && this.store.mode !== "unsupported";
    this.notice.textContent = this.store.mode === "session"
      ? "O navegador não conseguiu salvar o histórico. Novos registros podem ficar disponíveis apenas nesta visita."
      : this.store.mode === "unsupported" ? "O histórico salvo usa uma versão incompatível e foi preservado. Apague-o para iniciar outro." : "";
    this.renderTargets();
  }

  renderTargets() {
    const selected = this.target.value;
    const targets = [...new Set(this.store.records.filter(({ cityId }) => cityId === Number(this.city.value))
      .map(({ target }) => target))].sort();
    this.target.replaceChildren(...targets.map((target) => new Option(forecastHistoryDate.format(historyTargetDate(target)), target)));
    if (targets.includes(selected)) this.target.value = selected;
    this.target.disabled = !targets.length;
    this.renderComparison();
  }

  renderComparison() {
    const records = this.store.recordsFor(Number(this.city.value), this.target.value);
    this.status.textContent = !records.length
      ? "Ainda não há previsões registradas. Consulte uma cidade com previsão diária disponível."
      : records.length === 1 ? "Há um registro para esta data. A comparação aparece após outra previsão diferente ser registrada."
        : records.length + " registros para esta data.";
    this.comparison.hidden = !records.length;
    this.panel.querySelector(".forecast-history-chart").hidden = !records.length;
    const samples = records.map((record) => {
      const date = new Date(record.recordedAt * 1000);
      const time = new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit", month: "2-digit", timeZone: record.timezone,
      }).format(date);
      return { ...record, timestamp: record.recordedAt, time, label: this.recordLabel(record) };
    });
    this.chart.setSamples(samples, "Registros no fuso da cidade");
    this.renderSummary();
  }

  recordLabel(record) {
    return new Intl.DateTimeFormat("pt-BR", {
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
      hourCycle: "h23", timeZone: record.timezone, timeZoneName: "shortOffset",
    }).format(record.recordedAt * 1000) + " (" + record.timezone + ")";
  }

  renderSummary() {
    const first = this.chart.samples[0];
    if (!first) return;
    const last = this.chart.samples.at(-1);
    this.panel.querySelector(".forecast-history-original").textContent = this.recordLabel(first);
    this.panel.querySelector(".forecast-history-latest").textContent = first === last
      ? "Aguardando outro registro" : this.recordLabel(last);
    for (const [key, unit] of Object.entries(forecastHistoryUnits)) {
      const row = this.comparison.querySelector('[data-metric="' + key + '"]');
      const suffix = unit === "%" ? "%" : " " + readingUnit(unit);
      const reading = (record) => this.formatReading(convertReading(record[key], unit), suffix);
      row.querySelector(".history-original-value").textContent = reading(first);
      row.querySelector(".history-latest-value").textContent = first === last ? "—" : reading(last);
      const delta = last[key] - first[key];
      row.querySelector(".history-difference").textContent = first === last || !Number.isFinite(delta) ? "Indisponível"
        : delta === 0 ? "Sem alteração"
          : (delta > 0 ? "Aumento de " : "Queda de ") + this.formatReading(
            convertReading(Math.abs(delta), unit, true), unit === "%" ? " p.p." : suffix);
    }
  }

  refreshUnits() {
    this.chart.refresh();
    this.renderSummary();
  }
}
