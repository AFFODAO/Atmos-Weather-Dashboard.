const DataReal = Date;
if (sessionStorage.getItem("atmos-teste-modo-autonomo") === "sim") {
  Object.defineProperty(navigator, "standalone", { value: true });
}
Object.defineProperty(navigator, "onLine", {
  get: () => sessionStorage.getItem("atmos-teste-sem-rede") !== "sim",
});
let instante = Date.parse("2026-11-18T12:00:00Z");
window.Date = class extends DataReal {
  constructor(...args) { super(...(args.length ? args : [instante])); }
  static now() { return instante; }
};
window.ajustarRelogio = (data) => { instante = Date.parse(data); };
window.errosDoATMOS = [];
window.addEventListener("error", (evento) => window.errosDoATMOS.push(evento.message));
window.addEventListener("unhandledrejection", (evento) => window.errosDoATMOS.push(String(evento.reason)));

const cidades = [
  ["Denver", "Pacific/Kiritimati", 14, "Colorado", "Estados Unidos"],
  ["Recife", "America/Recife", -3, "Pernambuco", "Brasil"],
  ["São Paulo", "America/Sao_Paulo", -3, "São Paulo", "Brasil"],
  ["Recife", "America/Bahia", -3, "Bahia", "Brasil"],
  ["Falha", "America/Recife", -3],
  ["Parcial", "America/Recife", -3],
  ["Vazia", "America/Recife", -3],
  ["Devagar", "America/Recife", -3],
  ["Nova York", "America/New_York", -4, "Nova York", "Estados Unidos"],
  ["Fernando de Noronha", "America/Noronha", -2, "Pernambuco", "Brasil"],
  ["Rio Branco", "America/Rio_Branco", -5, "Acre", "Brasil"],
  ["Manaus", "America/Manaus", -4, "Amazonas", "Brasil"],
  ["Fortaleza", "America/Fortaleza", -3, "Ceará", "Brasil"],
  ["Campo Grande", "America/Campo_Grande", -4, "Mato Grosso do Sul", "Brasil"],
  ["Porto Alegre", "America/Sao_Paulo", -3, "Rio Grande do Sul", "Brasil"],
  ["Porto Velho", "America/Porto_Velho", -4, "Rondônia", "Brasil"],
].map(([name, timezone, offset, admin1, country], index) => ({
  id: index + 1, name, latitude: index, longitude: index,
  timezone, offset, admin1, country,
}));

window.consultas = [];
window.consultasCanceladas = [];
window.pedidosDeMosaico = [];
window.estadoDosMosaicos = "normal";
window.falharTempoNoPonto = false;
window.falharQualidadeDoAr = false;
window.reduzirAvisos = false;
window.resultadoGeolocalizacao = "permitido";
Object.defineProperty(navigator, "geolocation", {
  value: {
    getCurrentPosition(sucesso, erro) {
      setTimeout(() => window.resultadoGeolocalizacao === "permitido"
        ? sucesso({ coords: { latitude: 1, longitude: 1 } }) : erro({ code: 1 }), 5);
    },
  },
});

function aguardarResposta(ms, signal, chave) {
  return new Promise((resolve, reject) => {
    const concluir = () => {
      signal.removeEventListener("abort", cancelar);
      resolve();
    };
    const timer = setTimeout(concluir, ms);
    function cancelar() {
      clearTimeout(timer);
      window.consultasCanceladas.push(chave);
      reject(new DOMException("Consulta cancelada.", "AbortError"));
    }
    if (signal.aborted) cancelar();
    else signal.addEventListener("abort", cancelar, { once: true });
  });
}

window.fetch = async (url, { signal } = {}) => {
  const { hostname, searchParams } = new URL(url);
  if (hostname === "tile.openstreetmap.org") {
    window.pedidosDeMosaico.push(String(url));
    if (window.estadoDosMosaicos === "sem rede") throw new TypeError("Rede de mosaicos indisponível.");
    const status = window.estadoDosMosaicos === "bloqueado" ? 403 : window.estadoDosMosaicos === "limitado" ? 429 : 200;
    const imagem = '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#d1cbe5"/></svg>';
    return new Response(imagem, { status, headers: { "Content-Type": "image/svg+xml", "Retry-After": "90" } });
  }
  if (window.falharTempoNoPonto && searchParams.get("current")?.split(",").length === 5) {
    return Response.json({ error: true }, { status: 503 });
  }
  const chave = searchParams.get("name") ?? hostname + ":" + searchParams.get("latitude");
  window.consultas.push(chave);
  if (hostname.startsWith("geocoding")) {
    const nome = chave.toLowerCase();
    if (nome === "rec" || nome === "dev") await aguardarResposta(350, signal, chave);
    if (nome === "rede indisponível") throw new TypeError("Falha de conexão simulada.");
    const resultados = cidades.filter((cidade) => cidade.name.toLowerCase().includes(nome));
    if (nome === "rec" && resultados.length) resultados.push(resultados[0], { id: 999, name: "Inválida", latitude: 91, longitude: 0 });
    return Response.json({ results: resultados });
  }
  const latitude = Number(searchParams.get("latitude"));
  const cidade = cidades[latitude] ?? cidades[1];
  const chuvaNosInsights = cidade.name === "Manaus";
  const tempoAbertoNosInsights = cidade.name === "Fortaleza";
  const temperatura = chuvaNosInsights || tempoAbertoNosInsights ? 24 : latitude * 10;
  const agora = Math.floor(instante / 1000);
  const deslocamento = cidade.offset * 3600;
  const inicio = Math.floor((agora + deslocamento) / 86400) * 86400 - deslocamento;

  if (hostname.startsWith("air-quality")) {
    if (window.falharQualidadeDoAr) return Response.json({ error: true }, { status: 503 });
    return Response.json({
      timezone: cidade.timezone,
      current: { time: agora, us_aqi: 60, european_aqi: 20.2, pm2_5: -3, pm10: 11 },
      hourly: {
        time: [agora - 3600, 1e20, agora - 7200, agora - 3600, agora + 3600],
        pm10: [12, 0, 10, 99, 88], us_aqi: [60, 0, 58, 99, 88],
      },
    });
  }
  if (cidade.name === "Falha") return Response.json({ error: true }, { status: 503 });
  if (cidade.name === "Devagar") await aguardarResposta(350, signal, chave);
  if (cidade.name === "Vazia") return Response.json({
    current: { time: agora, interval: 900, is_day: 1 },
    hourly: { time: [inicio], temperature_2m: [null] },
  });
  if (cidade.name === "Campo Grande") return Response.json({
    timezone: cidade.timezone, utc_offset_seconds: deslocamento,
    current: { time: agora, temperature_2m: 23 },
  });
  if (cidade.name === "Parcial") return Response.json({
    timezone: "Fuso/Inválido", utc_offset_seconds: deslocamento,
    current: { time: 1e20, temperature_2m: null, weather_code: 97, wind_speed_10m: -3, relative_humidity_2m: 110 },
    daily: { time: [inicio, inicio, 1e20, inicio + 86400], temperature_2m_max: [25, 99, 99, null] },
    hourly: { time: [agora + 7200, agora, 1e20, agora, agora + 3600], temperature_2m: [22, 20, 99, 99, null] },
  });
  const cenarioPlanejador = ["Porto Alegre", "Porto Velho"].includes(cidade.name);
  const horas = Array.from({ length: cenarioPlanejador ? 96 : 48 }, (_, i) => inicio + i * 3600);
  const previsaoPlanejador = cenarioPlanejador ? {
    temperature_2m: horas.map((_, i) => [8, 9].includes(i) ? 23 : [56, 57, 60, 61, 62].includes(i) ? 21 : 34),
    precipitation_probability: horas.map((_, i) => [9, 10].includes(i) ? 20 : 0),
    wind_speed_10m: horas.map((_, i) => [8, 9].includes(i) ? 22 : 5),
    wind_gusts_10m: horas.map((_, i) => [8, 9].includes(i) ? 33 : [60, 61].includes(i) ? null : 10),
    uv_index: horas.map((_, i) => [60, 61].includes(i) ? null : 1),
    precipitation: horas.map((_, i) => i === 63 ? 15 : 0),
  } : {};
  const leiturasHorarias = (padrao, destaque, parcial = padrao) => horas.map((_, i) =>
    cidade.name === "Rio Branco" && i === 22 ? destaque : cidade.name === "Rio Branco" && i === 23 ? parcial : padrao);
  const previsaoInsights = chuvaNosInsights || tempoAbertoNosInsights ? {
    temperature_2m: horas.map((_, i) => chuvaNosInsights ? i === 23 ? 18 : i === 35 ? 27 : 22 : 24),
    precipitation_probability: horas.map((_, i) => chuvaNosInsights ? i === 23 ? 70 : i === 24 ? 85 : 35 : 0),
    wind_speed_10m: horas.map((_, i) => chuvaNosInsights && !window.reduzirAvisos && i === 23 ? 48 : 10),
    uv_index: horas.map((_, i) => chuvaNosInsights && !window.reduzirAvisos && i === 35 ? 9 : 1),
    weather_code: horas.map((_, i) => chuvaNosInsights && (i === 23 || i === 24) ? 61 :
      chuvaNosInsights && !window.reduzirAvisos && (i === 27 || i === 28) ? 96 : 0),
    wind_gusts_10m: horas.map((_, i) => chuvaNosInsights && !window.reduzirAvisos ? i === 23 ? 55 : i === 24 ? 75 : 20 : 20),
    precipitation: horas.map((_, i) => chuvaNosInsights && !window.reduzirAvisos ? i === 23 ? 10 : i === 24 ? 25 : 0 : 0),
    is_day: horas.map((_, i) => i % 24 >= 6 && i % 24 <= 18 ? 1 : 0),
  } : {};
  const dias = searchParams.get("forecast_days") === "1" ? [inicio] : [inicio, inicio + 86400];
  return Response.json({
    timezone: cidade.timezone, utc_offset_seconds: deslocamento,
    current: {
      time: agora, temperature_2m: temperatura, apparent_temperature: temperatura + 1,
      wind_speed_10m: 16.09344, wind_gusts_10m: 32.18688, weather_code: 0,
      relative_humidity_2m: 58, wind_direction_10m: 90, cloud_cover: 35,
      surface_pressure: 1008, precipitation: 0.6, interval: 900,
    },
    daily: {
      time: dias, weather_code: chuvaNosInsights ? [61, 61] : tempoAbertoNosInsights ? [0, 0] : [0, 61],
      temperature_2m_max: [temperatura + 5 + (window.variacaoPrevisao ?? 0), temperatura + 7],
      temperature_2m_min: [cidade.name === "Rio Branco" ? 0 : temperatura - 2 - (window.variacaoPrevisao ?? 0), temperatura],
      precipitation_probability_max: chuvaNosInsights ? [70, 85] : tempoAbertoNosInsights ? [0, 0]
        : [cidade.name === "Rio Branco" ? 0 : 10 + 2 * (window.variacaoPrevisao ?? 0), 80],
      uv_index_max: chuvaNosInsights ? [1, 9] : tempoAbertoNosInsights ? [1, 1]
        : [cidade.name === "Rio Branco" ? 0 : latitude === 0 ? 2 : 8, 11],
      sunrise: [inicio + 6 * 3600, inicio + 30 * 3600],
      sunset: [inicio + 18.5 * 3600, inicio + 42.5 * 3600],
    },
    hourly: {
      time: horas, temperature_2m: leiturasHorarias(temperatura, 24.5),
      wind_speed_10m: leiturasHorarias(16.09344, 9), weather_code: leiturasHorarias(0, 61),
      uv_index: leiturasHorarias(3, 0, null), precipitation_probability: leiturasHorarias(25, 83),
      relative_humidity_2m: leiturasHorarias(58, 92, null), cloud_cover: leiturasHorarias(35, 95),
      ...previsaoInsights,
      ...previsaoPlanejador,
    },
  });
};
