const offlineForecastKey = "atmos-previsao-salva";
const offlineForecastAge = 48 * 3600 * 1000;
const offlineForecastSize = 96 * 1024;

function saveOfflineForecast(location, forecast, loadedAt) {
  if (!isCity(location)) return;
  const { id, name, latitude, longitude, admin1, admin2, country, timezone } = location;
  try {
    const data = JSON.stringify({
      version: 1, city: { id, name, latitude, longitude, admin1, admin2, country, timezone },
      storedAt: loadedAt.getTime(), forecast,
    });
    if (new TextEncoder().encode(data).byteLength <= offlineForecastSize) localStorage.setItem(offlineForecastKey, data);
  } catch {
    // Uma falha de armazenamento nunca impede o uso da previsão recebida.
  }
}

function readOfflineForecast(match) {
  try {
    const raw = localStorage.getItem(offlineForecastKey);
    if (!raw || raw.length > offlineForecastSize || new TextEncoder().encode(raw).byteLength > offlineForecastSize) return;
    const data = JSON.parse(raw);
    if (data?.version !== 1 || !isCity(data.city) || !Number.isSafeInteger(data.storedAt)) return;
    const age = Date.now() - data.storedAt;
    if (age < 0 || age >= offlineForecastAge) return;
    if (typeof match === "string") {
      const name = (value) => value.trim().normalize("NFC").toLocaleLowerCase("pt-BR");
      if (name(match) !== name(data.city.name)) return;
    } else if (match && (!isCity(match) || match.id !== data.city.id)) return;
    if (!data.forecast || typeof data.forecast !== "object") return;
    const forecast = normalizeForecast(data.forecast, data.city);
    if (forecast.available) return { city: data.city, forecast, loadedAt: new Date(data.storedAt) };
  } catch {
    // Dados ausentes, inválidos ou inacessíveis equivalem a uma cópia indisponível.
  }
}
