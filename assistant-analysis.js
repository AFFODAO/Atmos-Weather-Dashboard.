function assistantQuery(question) {
  return question.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function assistantIntent(query) {
  if (/\b(evolucao|historico|consultas anteriores|entre consultas|mudou a previsao|previsao mudou)\b/.test(query)) return "history";
  if (/\b(duas cidades|comparar cidades)\b/.test(query) ||
      (/\bcompar\w*\b/.test(query) && /\bcidades?\b/.test(query))) return "comparison";
  if (/\b(ensemble|conjunto de previsoes|incerteza|confiavel|confianca|certeza)\b/.test(query)) return "uncertainty";
  if (/\b(24\s*(h|horas)|resumo|variacao de temperatura|mudanca de temperatura)\b/.test(query)) return "summary";
  if (Object.values(assistantActivities).some((pattern) => pattern.test(query)) ||
      /\b(atividade\w*|exercicio\w*|ao ar livre)\b/.test(query)) return "activity";
}

function assistantNextDay({ forecast, now, air, format }) {
  const samples = forecast.samples.filter(({ timestamp }) => timestamp > now && timestamp <= now + 86400);
  const values = (key) => samples.filter((sample) => Number.isFinite(sample[key]));
  const highest = (key) => values(key).reduce((peak, item) => !peak || item[key] > peak[key] ? item : peak, undefined);
  const lowest = (key) => values(key).reduce((low, item) => !low || item[key] < low[key] ? item : low, undefined);
  if (!samples.length) return { text: "Não há previsão horária disponível nas próximas 24 horas.", link: "#graficos" };
  const range = (key, unit) => {
    const low = lowest(key);
    const high = highest(key);
    return low ? format(low[key], unit) + " a " + format(high[key], unit) : "indisponível";
  };
  const changes = buildWeatherInsights(forecast.daily, -1, samples).entries;
  const temperature = changes.find(({ icon }) => icon === "↕");
  const rain = highest("precipitation_probability");
  const rainPeriod = consecutiveForecastPeriods(samples, (sample) =>
    sample.precipitation_probability >= insightRules.rain).find((period) => period.includes(rain));
  const uv = highest("uv_index");
  const describePeak = (key, unit) => {
    const peak = highest(key);
    return peak ? format(peak[key], unit) + " em " + peak.label : "indisponível";
  };
  const airValue = air?.[air.scale];
  const airScale = air && airIndexes[air.scale];
  const airBand = airScale?.limits.findIndex((limit) => airValue <= limit);
  const windPeak = highest("wind_speed_10m");
  const windNote = windPeak?.wind_speed_10m >= insightRules.wind ? " O pico atinge o critério de vento forte do ATMOS." : "";
  return {
    text: [
      "Próximas 24 horas · " + samples.length + " leituras horárias disponíveis, no horário local.",
      "Temperatura prevista · " + range("temperature_2m", " °C") + "." + (temperature
        ? " " + temperature.title + " entre " + forecastTimeRange(temperature.period) + ". " +
          format(temperature.period[0].temperature_2m, " °C") + " → " + format(temperature.period[1].temperature_2m, " °C") + "."
        : ""),
      rain ? "Maior chance de chuva · " + format(rain.precipitation_probability, "%") + " na hora que termina em " +
        rain.label + "." + (rainPeriod && rainPeriod.length > 1
          ? " Chances de pelo menos " + insightRules.rain + "% nas horas com término de " + forecastTimeRange(rainPeriod) + "." : "")
        : "Chance de chuva · indisponível.",
      "Vento máximo · " + describePeak("wind_speed_10m", " km/h") + ". Rajadas · " + describePeak("wind_gusts_10m", " km/h") + "." + windNote,
      "Umidade relativa · " + range("relative_humidity_2m", "%") + ". UV máximo · " +
        (uv ? describeUv(uv.uv_index).reading + " em " + uv.label : "indisponível") + ".",
      "Qualidade do ar · " + (Number.isFinite(airValue)
        ? "estimativa recente de " + format(airValue, " pts") + " na escala " + airScale.name + " (" +
          airScale.labels[airBand < 0 ? airScale.labels.length - 1 : airBand] + ")."
        : "sem estimativa recente na escala selecionada."),
    ].join("\n"),
    link: "#graficos",
  };
}

function assistantHistory(query, { weather, today, tomorrow, history, format }) {
  const explicit = query.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
  if (!explicit && /\b(depois de amanha|ontem|anteontem|\d{1,2}\/\d{1,2})\b/.test(query)) {
    return { text: "Informe a data-alvo do histórico no formato AAAA-MM-DD.", link: "#graficos" };
  }
  const selected = Number(history.city.value) === weather.location.id ? history.target.value : undefined;
  const target = explicit || (/\bamanha\b/.test(query) ? tomorrow : /\bhoje\b/.test(query) ? today : selected || today);
  const date = historyTargetDate(target);
  if (!date) return { text: "Informe uma data-alvo válida no formato AAAA-MM-DD.", link: "#graficos" };
  const records = history.store.recordsFor(weather.location.id, target);
  const first = records[0];
  const last = records.at(-1);
  const heading = "Previsão para " + forecastHistoryDate.format(date) + ". ";
  if (records.length < 2) return {
    text: heading + (first ? "Só há uma consulta registrada em " + history.recordLabel(first) + "."
      : "Ainda não há previsões guardadas para esta cidade e data."), link: "#graficos",
  };
  const differences = comparisonMetrics.daily.filter(([key]) => key !== "uv_index_max").map(([key, label, unit]) => {
    const delta = Number.isFinite(last[key]) && Number.isFinite(first[key]) ? last[key] - first[key] : undefined;
    return label + " · " + format(first[key], unit) + " → " + format(last[key], unit) +
      (delta === undefined ? " (diferença indisponível)." : " (" + format(delta, unit === "%" ? " p.p." : unit, true) + ").");
  });
  return {
    text: heading + "Primeira consulta guardada em " + history.recordLabel(first) + ", mais recente em " +
      history.recordLabel(last) + ".\n" + differences.join("\n") + "\nOs registros mostram mudanças na previsão.",
    link: "#graficos",
  };
}

function assistantComparison({ cities, format }) {
  if (!cities.every(({ forecast }) => forecast)) return {
    text: "Carregue duas cidades na página Comparar para consultar as diferenças disponíveis.", link: "#comparar",
  };
  const [a, b] = cities.map(({ forecast, requestedAt }) => comparisonPeriod(forecast, requestedAt));
  const comparable = comparisonAlignment(a, b);
  const places = cities.map(({ location }) => [location.name, cityRegion(location)].filter(Boolean).join(" · "));
  const reference = (period) => period.observed.label ? period.observed.label + " às " + period.observed.time : "horário indisponível";
  const lines = [
    "Diferenças de " + places[1] + " em relação a " + places[0] + ".",
    "Condições atuais · " + reference(a) + " e " + reference(b) +
      (comparable.current ? ", no mesmo instante." : ". Horários distintos ou indisponíveis impedem o cálculo."),
    "Previsão diária · " + (a.today.label || "data indisponível") + " e " + (b.today.label || "data indisponível") +
      (comparable.daily ? ", na mesma data local." : ". As datas locais impedem o cálculo."),
  ];
  for (const [group, metrics] of Object.entries(comparisonMetrics)) {
    const readings = metrics.flatMap(([key, label, unit]) => {
      const first = a[group]?.[key];
      const second = b[group]?.[key];
      if (!Number.isFinite(first) && !Number.isFinite(second)) return [];
      const delta = comparable[group] && Number.isFinite(first) && Number.isFinite(second)
        ? " (" + format(second - first, unit === "%" ? " p.p." : unit, true) + ")" : "";
      return [label + " " + format(first, unit) + " → " + format(second, unit) + delta];
    });
    if (readings.length) lines.push((group === "current" ? "Estimativas atuais" : "Previsão diária") + " · " + readings.join("; ") + ".");
  }
  return { text: lines.join("\n"), link: "#comparar" };
}

function assistantEnsembleRange(data, now) {
  const hourly = data?.hourly;
  if (!hourly || !Array.isArray(hourly.time)) return undefined;
  const series = Object.keys(hourly).filter((key) => /^temperature_2m(?:_member\d+)?$/.test(key) &&
    Array.isArray(hourly[key]) && data.hourly_units?.[key] === "°C");
  let widest;
  for (const { time, index } of timestampEntries(hourly.time)) {
    if (time <= now || time > now + 86400) continue;
    const values = series.map((key) => forecastValue("temperature_2m", hourly[key][index])).filter(Number.isFinite);
    if (values.length < 2) continue;
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (!widest || max - min > widest.max - widest.min) widest = { time, min, max, count: values.length };
  }
  return widest;
}

async function assistantUncertainty(query, { weather, now, fetchJson, format }, signal) {
  const explanation = "A previsão pode mudar com novas rodadas do modelo. A chance de chuva se refere à ocorrência de precipitação no período indicado. A dispersão entre membros de um conjunto mostra cenários do modelo.";
  if (!/\b(ensemble|conjunto de previsoes)\b/.test(query)) return {
    text: explanation + " Pergunte pela dispersão do conjunto de previsões para consultar os membros disponíveis.", link: "#graficos",
  };
  const unavailable = { text: "O conjunto não retornou leituras de temperatura suficientes para esta cidade. " + explanation, link: "#graficos" };
  const { location, timezone } = weather;
  if (!timezone || !isCity(location)) return unavailable;
  try {
    const data = await fetchJson("https://ensemble-api.open-meteo.com/v1/ensemble", {
      latitude: location.latitude, longitude: location.longitude, hourly: "temperature_2m", forecast_hours: 25,
      temperature_unit: "celsius", timeformat: "unixtime", models: "ncep_gefs_seamless",
    }, signal);
    const range = assistantEnsembleRange(data, now);
    if (!range) return unavailable;
    const hour = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: timezone })
      .format(range.time * 1000);
    return {
      text: "Maior dispersão de temperatura nas próximas 24 horas no conjunto GEFS da Open-Meteo · " +
        format(range.min, " °C") + " a " + format(range.max, " °C") + " em " + hour + ", no horário local (" +
        range.count + " membros com leitura). É a faixa dos cenários retornados para esse instante. " + explanation,
      link: "#graficos",
    };
  } catch {
    return { text: "Não foi possível consultar o conjunto da Open-Meteo. " + explanation, link: "#graficos" };
  }
}
