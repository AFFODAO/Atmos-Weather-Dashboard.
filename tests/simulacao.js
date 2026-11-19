const DataReal = Date;
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
  const temperatura = latitude * 10;
  const agora = instante / 1000;
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
  if (cidade.name === "Parcial") return Response.json({
    timezone: "Fuso/Inválido", utc_offset_seconds: deslocamento,
    current: { time: 1e20, temperature_2m: null, weather_code: 97, wind_speed_10m: -3, relative_humidity_2m: 110 },
    daily: { time: [inicio, inicio, 1e20, inicio + 86400], temperature_2m_max: [25, 99, 99, null] },
    hourly: { time: [agora + 7200, agora, 1e20, agora, agora + 3600], temperature_2m: [22, 20, 99, 99, null] },
  });
  const horas = Array.from({ length: 48 }, (_, i) => inicio + i * 3600);
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
      time: dias, weather_code: [0, 61], temperature_2m_max: [temperatura + 5, temperatura + 7],
      temperature_2m_min: [temperatura - 2, temperatura], precipitation_probability_max: [10, 80],
      uv_index_max: [latitude === 0 ? 2 : 8, 11],
      sunrise: [inicio + 6 * 3600, inicio + 30 * 3600],
      sunset: [inicio + 18.5 * 3600, inicio + 42.5 * 3600],
    },
    hourly: {
      time: horas, temperature_2m: horas.map(() => temperatura),
      wind_speed_10m: horas.map(() => 16.09344), weather_code: horas.map(() => 0),
      uv_index: horas.map(() => 3), precipitation_probability: horas.map(() => 25),
      relative_humidity_2m: horas.map(() => 58), cloud_cover: horas.map(() => 35),
    },
  });
};
