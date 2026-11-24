const assistantActivities = {
  caminhada: /\b(caminhad\w*|caminhar|andar)\b/,
  corrida: /\b(corrida|correr)\b/,
  ciclismo: /\b(ciclismo|pedalar|bicicleta)\b/,
  passeio: /\b(passear|passeio)\b/,
  carro: /\blavar (o )?carro\b/,
};

function answerWeatherQuestion(question, { weather, forecast, today, tomorrow, now, air, planner, format }) {
  const query = assistantQuery(question);
  if (!weather || !forecast) {
    return { text: "Ainda não há dados da cidade. Consulte uma cidade no Painel e envie sua pergunta novamente.", link: "#painel" };
  }
  const activity = Object.keys(assistantActivities).find((key) => assistantActivities[key].test(query));
  const wantsActivity = activity || /\b(atividade\w*|exercicio\w*|ao ar livre)\b/.test(query);
  const future = /\bamanha\b/.test(query);
  const current = /\b(agora|atual|neste momento)\b/.test(query) && !future;
  if (/\b(depois de amanha|proxima semana|ontem|anteontem|segunda|terca|quarta|quinta|sexta|sabado|domingo)\b/.test(query) ||
      /\b\d{1,2}\/\d{1,2}\b/.test(query)) {
    return { text: "Posso consultar as condições atuais e a previsão de hoje ou amanhã. Para outras datas, abra o Calendário.", link: "#calendario" };
  }
  const target = future ? tomorrow : today;
  const when = future ? "Para amanhã" : "Para hoje";
  const { daily, samples } = forecast;
  const dayIndex = target ? daily.time.indexOf(target) : -1;
  const dailyValue = (key) => daily[key]?.[dayIndex];
  const atHour = samples.findLast(({ timestamp }) => timestamp <= now && now - timestamp < 3600);
  const answers = [];
  let link;
  if (/\b(chuv\w*|chover|precipitacao|garoa)\b/.test(query)) {
    const probability = current
      ? samples.find(({ timestamp }) => atHour && timestamp === atHour.timestamp + 3600)?.precipitation_probability
      : dailyValue("precipitation_probability_max");
    answers.push(Number.isFinite(probability)
      ? (current ? "A chance de precipitação na hora em curso é " : when + ", a maior chance horária de precipitação é ") +
        format(probability, "%") + "."
      : "A chance de precipitação está indisponível para esse período.");
  }
  if (/\b(temperatura\w*|calor|frio|maxima|minima|graus)\b/.test(query)) {
    answers.push(current
      ? "Temperatura do ar na leitura atual · " + format(weather.current.temperature_2m, " °C") + "."
      : when + ", mínima de " + format(dailyValue("temperature_2m_min"), " °C") +
        " e máxima de " + format(dailyValue("temperature_2m_max"), " °C") + ".");
  }
  if (/\b(uv|ultravioleta)\b/.test(query)) {
    const uv = describeUv(current ? atHour?.uv_index : dailyValue("uv_index_max"));
    answers.push((current ? "Índice UV nesta hora" : "Índice UV máximo " + (future ? "amanhã" : "hoje")) + " · " + uv.reading + ".");
  }
  if (/\b(vento\w*|ventar|rajada\w*)\b/.test(query)) {
    const winds = samples.filter(({ day }) => target && day === target);
    const max = (key) => {
      const readings = winds.map((sample) => sample[key]).filter(Number.isFinite);
      return readings.length ? Math.max(...readings) : undefined;
    };
    answers.push(current
      ? "Na leitura atual, vento de " + format(weather.current.wind_speed_10m, " km/h") +
        " e rajadas de " + format(weather.current.wind_gusts_10m, " km/h") + "."
      : when + ", maior vento entre as horas disponíveis de " + format(max("wind_speed_10m"), " km/h") +
        " e rajadas de até " + format(max("wind_gusts_10m"), " km/h") + ".");
  }
  if (/\b(umidade|umido|secura)\b/.test(query)) {
    const value = current ? weather.current.relative_humidity_2m : undefined;
    const readings = samples.filter(({ day }) => day === target).map(({ relative_humidity_2m }) => relative_humidity_2m)
      .filter(Number.isFinite);
    answers.push(current ? "Umidade relativa na leitura atual · " + format(value, "%") + "."
      : readings.length ? when + ", a umidade relativa prevista varia de " + format(Math.min(...readings), "%") +
        " a " + format(Math.max(...readings), "%") + " entre as horas disponíveis."
        : "A previsão de umidade relativa está indisponível para esse período.");
  }
  if (/\b(qualidade do ar|iqa|aqi|poluicao|pm2[,.]?5|pm10)\b/.test(query)) {
    if (future || !air || ![air[air.scale], air.pm2_5, air.pm10].some(Number.isFinite)) {
      answers.push(future ? "O assistente consulta apenas a estimativa atual de qualidade do ar."
        : "Ainda não há uma estimativa recente para esta cidade. Abra Qualidade do ar para consultá-la.");
      link = "#qualidade-do-ar";
    } else {
      const date = air.time !== undefined && air.timezone ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short", timeStyle: "short", timeZone: air.timezone,
      }).format(air.time * 1000) : undefined;
      answers.push("Estimativa de qualidade do ar" + (date ? " de " + date : "") + " · " +
        airIndexes[air.scale].name + " " + format(air[air.scale], " pts") +
        ", PM2,5 " + format(air.pm2_5, " µg/m³") + " e PM10 " + format(air.pm10, " µg/m³") + ".");
    }
  }
  if (wantsActivity) {
    const chosen = activity || planner.activity;
    const label = planner.form.querySelector('[name="activity"][value="' + chosen + '"]').labels[0]
      .querySelector(".planner-activity-name").textContent;
    const options = planner.options[chosen];
    const askedTime = Object.keys(plannerTimes).find((key) => key !== "qualquer" && new RegExp("\\b" + assistantQuery(key) + "\\b").test(query));
    if (askedTime && askedTime !== options.time) return {
      text: "A faixa selecionada para " + label.toLowerCase() + " é " + plannerTimes[options.time].label +
        ". Para avaliar " + plannerTimes[askedTime].label.toLowerCase() + ", altere essa preferência no Planejador.",
      link: "#planejador",
    };
    const period = !current && target && plannerDailyResults(samples, now, chosen, options, today, target)
      .find(({ day }) => day === target)?.period;
    if (period) {
      const temperatures = period.samples.map(({ temperature_2m }) => temperature_2m);
      const peak = (key, unit) => {
        const readings = period.samples.map((sample) => sample[key]).filter(Number.isFinite);
        return readings.length ? format(Math.max(...readings), unit) : "indisponível";
      };
      const missing = period.factors.filter(({ missing }) => missing).map(({ label }) => label.toLowerCase());
      answers.push(label + " · " + plannerDateRange(period.first, period.end) + ", no horário local. Adequação estimada de " +
        period.score + " de 100. Faixa selecionada · " + plannerTimes[options.time].label + ".\n" +
        "Temperatura de " + format(Math.min(...temperatures), " °C") + " a " + format(Math.max(...temperatures), " °C") +
        " e chance de chuva de até " + format(period.rain, "%") + ", dentro dos limites escolhidos. Vento máximo · " +
        peak("wind_speed_10m", " km/h") + ". Rajadas · " + peak("wind_gusts_10m", " km/h") + ". UV máximo · " +
        peak("uv_index", "") + "." + (missing.length ? " Há lacunas em " + missing.join(", ") + "." : "") +
        (period.factors.some(({ excluded }) => excluded) ? " O UV fica fora da nota nas horas sem luz." : "") +
        " A previsão pode mudar.");
    } else answers.push(current
      ? "O Planejador avalia janelas completas a partir das próximas horas. Pergunte por um horário hoje ou amanhã."
      : when + ", não encontrei uma janela de " + label.toLowerCase() + " que atenda às preferências com os dados disponíveis.");
    link ??= "#planejador";
  }
  return {
    text: answers.join("\n") ||
      "Posso responder sobre chuva, temperatura, UV, vento, qualidade do ar e horários para atividades. Experimente uma pergunta sugerida.",
    link,
  };
}

function assistantWeatherPayload(question, { weather, forecast, today, now, air, planner }) {
  const { current, location, timezone } = weather;
  const finite = (value) => Number.isFinite(value) ? value : null;
  const iso = (timestamp) => isTimestamp(timestamp)
    ? new Date(timestamp * 1000).toISOString().replace(".000Z", "Z") : null;
  const condition = (sample) => Number.isFinite(sample.weather_code)
    ? describeWeather(sample.weather_code, sample.is_day !== 0)[0] : null;
  const hourly = forecast.samples.filter(({ timestamp }) => timestamp > now - 3600 && timestamp <= now + 86400).slice(0, 24);
  const daily = forecast.daily;
  const activity = Object.keys(assistantActivities).find((key) =>
    assistantActivities[key].test(assistantQuery(question))) || planner.activity;
  const activityLabel = planner.form.querySelector('[name="activity"][value="' + activity + '"]').labels[0]
    .querySelector(".planner-activity-name").textContent;
  const lastDay = today && plannerDay(today, 3);
  const periods = plannerDailyResults(forecast.samples, now, activity, planner.options[activity], today, lastDay);
  return {
    pergunta: question,
    contexto: {
      cidade: location.name.slice(0, 120),
      fuso: timezone ?? null,
      consulta_utc: iso(Math.floor(forecast.loadedAt.getTime() / 1000)),
      hoje_local: today ?? null,
      atual: {
        instante_utc: iso(current.time),
        temperatura_c: finite(current.temperature_2m),
        sensacao_c: finite(current.apparent_temperature),
        umidade_pct: finite(current.relative_humidity_2m),
        vento_kmh: finite(current.wind_speed_10m),
        rajadas_kmh: finite(current.wind_gusts_10m),
        precipitacao_mm: finite(current.precipitation),
        condicao: condition(current),
      },
      horario: hourly.map((sample) => [
        iso(sample.timestamp), finite(sample.temperature_2m), finite(sample.precipitation_probability),
        finite(sample.wind_speed_10m), finite(sample.wind_gusts_10m), finite(sample.uv_index), condition(sample),
      ]),
      diario: daily.time.flatMap((day, index) => day && (!today || day >= today) ? [[
        day, finite(daily.temperature_2m_min[index]), finite(daily.temperature_2m_max[index]),
        finite(daily.precipitation_probability_max[index]), finite(daily.uv_index_max[index]),
        condition({ weather_code: daily.weather_code[index] }),
      ]] : []).slice(0, 7),
      avisos: buildForecastAdvisories(hourly, forecast.currentHour ?? now).slice(0, 6).map(({ title, level, period, reason }) =>
        [title, level, iso(period[0].timestamp), iso(period.at(-1).timestamp), reason.slice(0, 280)]),
      ar: air && [air[air.scale], air.pm2_5, air.pm10].some(Number.isFinite) ? {
        instante_utc: iso(air.time),
        escala: airIndexes[air.scale].name,
        iqa: finite(air[air.scale]),
        pm25_ug_m3: finite(air.pm2_5),
        pm10_ug_m3: finite(air.pm10),
      } : null,
      atividades: periods.flatMap(({ period }) => period
        ? [[activityLabel, iso(period.first.timestamp), iso(period.end.timestamp), period.score]] : []),
    },
  };
}

function assistantHttpsEndpoint(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash ? url.href : undefined;
  } catch {
    return undefined;
  }
}

class WeatherAssistant {
  constructor(panel, context) {
    this.panel = panel;
    this.context = context;
    this.form = panel.querySelector("form");
    this.input = this.form.elements.question;
    this.send = panel.querySelector(".assistant-send");
    this.status = panel.querySelector(".assistant-status");
    this.error = panel.querySelector(".assistant-error");
    this.log = panel.querySelector(".assistant-log");
    this.empty = this.log.querySelector(".assistant-empty");
    this.clear = panel.querySelector(".assistant-clear");
    this.quick = panel.querySelector(".assistant-context-questions");
    this.mode = panel.querySelector(".assistant-mode input");
    this.endpoint = assistantHttpsEndpoint(atmosAssistantEndpoint);
    this.mode.checked = false;
    this.mode.parentElement.hidden = !this.endpoint;
    this.suggestions = [...panel.querySelectorAll(".assistant-suggestions button")];
    this.form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.submit(this.input.value);
    });
    this.input.addEventListener("input", () => this.setError(""));
    this.clear.addEventListener("click", () => {
      this.cancel("Conversa limpa.");
      this.log.replaceChildren(this.empty);
      this.clear.disabled = true;
      this.setError("");
      this.input.focus();
    });
    this.quick.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (button) this.submit(button.textContent);
    });
    for (const button of this.suggestions) {
      button.addEventListener("click", () => this.submit(button.textContent));
    }
  }

  updateLocation(location) {
    if (this.pending) this.cancel("Os dados da cidade mudaram. Envie a pergunta novamente.");
    this.panel.querySelector(".assistant-location").textContent =
      [location.name, cityRegion(location)].filter(Boolean).join(" · ");
  }

  refreshQuestions() {
    const { weather, history, cities } = this.context();
    const labels = weather ? ["Resumo das próximas 24 horas", "Como interpretar a incerteza da previsão?"] : [];
    if (weather && history.store.records.some(({ cityId }) => cityId === weather.location.id)) {
      labels.push("Como a previsão mudou entre consultas?");
    }
    if (cities.every(({ forecast }) => forecast)) labels.push("Compare as duas cidades selecionadas");
    if (this.quick.children.length === labels.length &&
        labels.every((label, index) => this.quick.children[index].textContent === label)) return;
    this.quick.replaceChildren(...labels.map((label) => {
      const button = document.createElement("button");
      button.className = "control";
      button.type = "button";
      button.textContent = label;
      if (this.pending) button.setAttribute("aria-disabled", "true");
      return button;
    }));
  }

  cancel(message) {
    this.pending?.abort();
    this.finish(message);
  }

  finish(message = "") {
    this.pending = undefined;
    this.status.textContent = message;
    for (const button of this.panel.querySelectorAll("button[aria-disabled]")) button.removeAttribute("aria-disabled");
  }

  setError(message) {
    this.error.textContent = message;
    this.input.setAttribute("aria-invalid", String(Boolean(message)));
  }

  submit(value) {
    if (this.pending) return;
    const question = value.trim();
    if (!question) {
      this.setError("Digite uma pergunta antes de enviar.");
      this.input.focus();
      return;
    }
    this.setError("");
    const context = this.context();
    this.append("Você", question);
    if (value === this.input.value) this.input.value = "";
    const job = new AbortController();
    this.pending = job;
    for (const button of [this.send, ...this.suggestions, ...this.quick.children]) button.setAttribute("aria-disabled", "true");
    this.status.textContent = "Analisando os dados disponíveis…";
    const query = assistantQuery(question);
    const intent = assistantIntent(query);
    const useGenerative = Boolean(!intent && this.endpoint && this.mode.checked && context.weather && context.forecast);
    requestAnimationFrame(() => setTimeout(async () => {
      if (job.signal.aborted) return;
      try {
        let reply;
        if (intent === "comparison") reply = assistantComparison(context);
        else if (context.weather && intent === "summary") reply = assistantNextDay(context);
        else if (context.weather && intent === "history") reply = assistantHistory(query, context);
        else if (context.weather && intent === "uncertainty") reply = await assistantUncertainty(query, context, job.signal);
        else if (useGenerative) {
          try {
            const response = await fetch(this.endpoint, {
              method: "POST", credentials: "omit", redirect: "error",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(assistantWeatherPayload(question, context)),
              signal: AbortSignal.any([job.signal, AbortSignal.timeout(14000)]),
            });
            if (!response.ok) throw new Error();
            const result = await response.json();
            if (typeof result.resposta !== "string" || !result.resposta.trim() || result.resposta.length > 1600) throw new Error();
            reply = { text: result.resposta.trim() };
          } catch {
            if (job.signal.aborted) return;
            const local = answerWeatherQuestion(question, context);
            reply = { ...local, text: "IA generativa indisponível. Resposta local:\n" + local.text };
          }
        } else {
          reply = answerWeatherQuestion(question, context);
        }
        if (job.signal.aborted) return;
        if (context.weather && this.context().weather !== context.weather) {
          this.finish("Os dados da cidade mudaram. Envie a pergunta novamente.");
          return;
        }
        const place = context.weather?.location.name;
        this.append(place ? "ATMOS AI · " + place : "ATMOS AI", reply.text, reply.link);
      } catch {
        if (!job.signal.aborted) this.append("ATMOS AI", "Não foi possível interpretar os dados desta pergunta. Tente outra pergunta sugerida.");
      } finally {
        if (this.pending === job) this.finish();
      }
    }, 0));
  }

  append(author, text, href) {
    this.log.querySelector(".assistant-empty")?.remove();
    while (author === "Você" && this.log.children.length > 22) {
      this.log.firstElementChild.remove();
      if (!this.log.firstElementChild?.classList.contains("assistant-user")) this.log.firstElementChild?.remove();
    }
    const message = document.createElement("article");
    message.className = author === "Você" ? "assistant-message assistant-user" : "assistant-message";
    const label = document.createElement("strong");
    label.textContent = author;
    const body = document.createElement("p");
    body.textContent = text;
    message.append(label, body);
    if (href) {
      const link = document.createElement("a");
      link.href = href;
      link.textContent = {
        "#painel": "Abrir Painel", "#calendario": "Abrir Calendário",
        "#planejador": "Abrir Planejador", "#qualidade-do-ar": "Abrir Qualidade do ar",
        "#graficos": "Abrir Gráficos", "#comparar": "Abrir Comparar",
      }[href];
      message.append(link);
    }
    this.log.append(message);
    this.clear.disabled = false;
    this.log.scrollTop = this.log.scrollHeight;
  }
}
