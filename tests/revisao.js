const pausa = (ms) => new Promise((resolver) => setTimeout(resolver, ms));

function tecla(seletor, key) {
  buscar(seletor).dispatchEvent(new (janela().KeyboardEvent)("keydown", { key, bubbles: true, cancelable: true }));
}

function digitar(seletor, valor) {
  const campo = buscar(seletor);
  campo.focus();
  campo.value = valor;
  campo.dispatchEvent(new (janela().Event)("input", { bubbles: true }));
}

async function consultar(cidade, estado = "ready") {
  enviar(".topbar .search", cidade);
  await esperar(() => buscar(".weather-status").dataset.state === estado, "Estado incorreto ao consultar " + cidade);
  if (estado === "ready") exigir(texto(".city") === cidade, "Cidade incorreta após a busca.");
}

function verificarLargura(largura) {
  const raiz = quadro.contentDocument.documentElement;
  exigir(janela().innerWidth === largura && raiz.scrollWidth <= janela().innerWidth,
    "A página tem rolagem horizontal em " + largura + " px, na seção " + janela().location.hash + ".");
}

async function testarRevisao() {
  localStorage.clear();
  quadro.style.width = "1280px";
  await abrir();
  verificarLargura(1280);
  digitar("#city-search", "Rec");
  tecla("#city-search", "ArrowDown");
  await esperar(() => janela().consultas.includes("Rec"), "A seta deve iniciar a consulta.");
  buscar(".topbar .search").requestSubmit();
  await esperar(() => texto(".city") === "Recife", "A busca por uma cidade brasileira deve carregar o painel.");
  exigir(janela().consultas.filter((consulta) => consulta === "Rec").length === 1,
    "Enviar enquanto as sugestões carregam deve reutilizar a requisição.");
  exigir(texto(".region").includes("Pernambuco"), "Identifique o primeiro Recife pela região.");
  clicar(".favorite-toggle");

  digitar("#city-search", "Rec");
  tecla("#city-search", "ArrowUp");
  await esperar(() => Boolean(buscar("#city-search").getAttribute("aria-activedescendant")), "A seta deve destacar uma opção.");
  exigir(buscar("#city-suggestions").children.length === 2, "Resultados duplicados e coordenadas inválidas devem ser descartados.");
  exigir(texto('#city-suggestions [aria-selected="true"]').includes("Bahia"), "Diferencie as cidades homônimas.");
  buscar(".topbar .search").requestSubmit();
  await esperar(() => texto(".region").includes("Bahia"), "A seleção pelo teclado deve consultar Recife, Bahia.");
  clicar(".favorite-toggle");
  exigir(buscar(".favorite-list").children.length === 2 && buscar(".history-list").children.length === 2,
    "Cidades homônimas devem ser armazenadas por ID.");
  clicar(".favorite-toggle");
  exigir(buscar(".favorite-list").children.length === 1, "Remova apenas o favorito selecionado.");
  await consultar("Recife");
  exigir(buscar(".history-list").children.length === 2 && texto(".history-list li").includes("Pernambuco"),
    "Buscas repetidas devem mover a cidade existente para o topo.");
  clicar(".refresh-button");
  await esperar(() => !buscar(".refresh-button").disabled, "A atualização deve retornar ao estado disponível.");
  exigir(buscar(".history-list").children.length === 2, "Atualizar a previsão deve preservar o histórico.");

  digitar("#city-search", "Dev");
  tecla("#city-search", "ArrowDown");
  await esperar(() => janela().consultas.includes("Dev"), "Inicie a consulta lenta de sugestões.");
  tecla("#city-search", "Escape");
  exigir(buscar("#city-search").getAttribute("aria-expanded") === "false", "Escape deve fechar a lista.");
  await esperar(() => janela().consultasCanceladas.includes("Dev"), "Escape deve cancelar a consulta sem consumidores.");
  await consultar("Local inexistente", "empty");
  exigir(texto(".weather-status").includes("Cidade não encontrada.") && texto(".city") === "Recife",
    "Uma busca inválida deve preservar a previsão carregada.");
  await consultar("Rede indisponível", "error");
  await consultar("Falha", "error");
  exigir(texto(".city") === "Recife" && buscar(".skeleton").hidden, "Falhas devem preservar os últimos dados.");
  await consultar("Vazia", "empty");
  exigir(texto(".city") === "Recife", "Uma resposta sem leituras deve preservar a previsão anterior.");

  enviar(".topbar .search", "Devagar");
  await esperar(() => janela().consultas.includes("api.open-meteo.com:7"), "Inicie a previsão lenta.");
  await consultar("Parcial");
  await esperar(() => janela().consultasCanceladas.includes("api.open-meteo.com:7"), "A nova previsão deve cancelar a anterior.");
  await pausa(400);
  exigir(texto(".city") === "Parcial" && texto(".description") === "Trovoadas fortes",
    "A resposta antiga deve ser ignorada e o código WMO 97 deve ser exibido.");
  exigir(texto(".wind") === "Indisponível" && texto(".humidity") === "Indisponível" &&
    texto(".observation-time").includes("indisponível"), "Leituras e horários inválidos devem ser tratados.");
  exigir(texto(".current-date").includes("09:00"), "Use o fuso válido da cidade quando o fuso da resposta for inválido.");
  exigir(buscar(".hourly-list").children.length === 2 && buscar(".forecast-list").children.length === 1 &&
    texto(".forecast-range") === "1 dia disponível", "Exiba somente horários e datas válidos com leituras.");
  exigir(texto(".hourly-list li:first-child strong") === "20 °C" && texto(".hourly-list li:last-child strong") === "22 °C",
    "Ordene as horas sem perder a correspondência com suas medidas.");
  clicar(".forecast-list button");
  await esperar(() => quadro.contentDocument.activeElement.id === "detalhes-calendario",
    "O resumo semanal deve abrir o calendário e focar o dia escolhido.");
  await navegar("graficos");
  const controle = buscar("#graficos .chart-hour");
  controle.value = "1";
  controle.dispatchEvent(new (janela().Event)("input"));
  exigir(texto("#graficos .chart-reading").includes("11:00") && texto("#graficos .chart-reading").includes("22 °C"),
    "O gráfico deve corresponder à hora e à unidade selecionadas.");
  exigir(janela().eval("chart.samples[1].timestamp - chart.samples[0].timestamp") === 7200, "Preserve a lacuna de duas horas no eixo.");
  clicar(".chart-reset");
  exigir(quadro.contentDocument.activeElement === controle, "Voltar às próximas horas deve manter o foco no gráfico.");

  await consultar("Recife");
  janela().resultadoGeolocalizacao = "negado";
  clicar(".location-button");
  await esperar(() => buscar(".weather-status").dataset.state === "error", "Trate a geolocalização negada.");
  exigir(texto(".weather-status").includes("permissão"), "Informe a falha da geolocalização.");
  janela().resultadoGeolocalizacao = "permitido";
  clicar(".location-button");
  await esperar(() => texto(".city") === "Minha localização", "Consulte as coordenadas fornecidas pelo navegador.");
  exigir(buscar(".favorite-toggle").hidden, "Favoritos exigem uma cidade identificada.");

  await navegar("comparar");
  const a = ".compare-city:nth-child(1) .compare-search";
  const b = ".compare-city:nth-child(2) .compare-search";
  enviar(a, "Recife");
  await esperar(() => texto(".compare-city:nth-child(1) h3") === "Recife", "Carregue a primeira cidade para comparar.");
  enviar(b, "Recife");
  await esperar(() => texto(".compare-city:nth-child(2) .compare-status").includes("já está"), "Impeça selecionar a mesma cidade duas vezes.");
  enviar(b, "Denver");
  await esperar(() => !buscar(".compare-charts").hidden, "Compare duas cidades em fusos diferentes.");
  exigir(texto(".compare-city:nth-child(1) .compare-date").includes("18/11/2026") &&
    texto(".compare-city:nth-child(2) .compare-date").includes("19/11/2026"), "Use o dia local de cada cidade.");
  exigir(texto(".difference-context").includes("datas locais distintas"), "Evite comparar os resumos diários de datas diferentes.");
  exigir(texto(".compare-charts .chart-reading").includes("GMT-3") && texto(".compare-charts .chart-reading").includes("GMT+14"),
    "Mostre o deslocamento de cada leitura comparada.");
  clicar(".compare-swap");
  exigir(texto(".compare-city:nth-child(1) h3") === "Denver", "Troque os lados da comparação.");

  await navegar("qualidade-do-ar");
  await esperar(() => !buscar(".air-data").hidden, "Carregue a qualidade do ar.");
  mudar("#air-scale", "european_aqi");
  exigir(texto(".air-index") === "20,2 pts" && texto(".air-category") === "Razoável" &&
    texto(".air-pm25") === "Indisponível", "Classifique pelo valor válido na escala escolhida.");
  mudar("#air-chart-metric", "pm10");
  exigir(texto("#air-chart-reading").includes("10 µg/m³"), "Ordene as amostras e aplique as unidades do material particulado.");
  const chamadasDoAr = janela().consultas.filter((consulta) => consulta.startsWith("air-quality")).length;
  await navegar("painel");
  await navegar("qualidade-do-ar");
  exigir(janela().consultas.filter((consulta) => consulta.startsWith("air-quality")).length === chamadasDoAr,
    "Reabrir a qualidade do ar deve reutilizar a estimativa recente.");
  janela().falharQualidadeDoAr = true;
  await consultar("São Paulo");
  await esperar(() => !buscar(".air-retry").hidden, "Ofereça nova tentativa quando a qualidade do ar falhar.");
  janela().falharQualidadeDoAr = false;
  clicar(".air-retry");
  await esperar(() => !buscar(".air-data").hidden, "A nova tentativa deve recuperar a qualidade do ar.");

  await navegar("painel");
  janela().ajustarRelogio("2026-11-01T04:00:00Z");
  await consultar("Nova York");
  const horasRepetidas = Array.from(quadro.contentDocument.querySelectorAll(".hourly-list time"))
    .filter((hora) => hora.textContent.startsWith("01:00"));
  exigir(horasRepetidas.length === 2 && horasRepetidas[0].textContent !== horasRepetidas[1].textContent,
    "Diferencie as duas ocorrências de 01:00 na mudança de horário de verão.");
  clicar(".forecast-list [data-day='2026-11-01']");
  janela().ajustarRelogio("2026-11-02T06:00:00Z");
  janela().eval("displayDailyMetrics(new Date())");
  exigir(!buscar(".forecast-list [data-day='2026-11-01']") && buscar("#detalhes-calendario").hidden &&
    buscar('.calendar-days [aria-current="date"]').dataset.day === "2026-11-02", "Atualize as datas na virada do dia local.");

  quadro.style.width = "320px";
  await esperar(() => buscar(".layout").classList.contains("menu-collapsed"), "O menu móvel deve recolher.");
  janela().eval('loadLeaflet.pending = Promise.reject(new Error("CDN indisponível.")); loadLeaflet.pending.catch(() => {})');
  await navegar("mapas");
  await esperar(() => !buscar(".map-retry").hidden, "Mostre a opção de tentar abrir o mapa novamente.");
  janela().eval('loadLeaflet.pending = Promise.resolve(undefined)');
  clicar(".map-retry");
  await esperar(() => !buscar(".map-retry").hidden, "O botão de nova tentativa deve reconsultar a biblioteca.");
  for (const secao of ["painel", "graficos", "favoritos", "comparar", "mapas", "qualidade-do-ar", "calendario", "configuracoes"]) {
    await navegar(secao);
    verificarLargura(320);
  }
  clicar(".skip-link");
  exigir(janela().location.hash === "#configuracoes" && quadro.contentDocument.activeElement.id === "configuracoes",
    "O atalho de conteúdo deve manter a seção aberta.");
  clicar(".sidebar-toggle");
  buscar('nav a[href="#configuracoes"]').focus();
  tecla('nav a[href="#configuracoes"]', "Escape");
  exigir(quadro.contentDocument.activeElement.classList.contains("sidebar-toggle"), "Escape deve devolver o foco ao menu.");
  await navegar("configuracoes");
  exigir(quadro.contentDocument.activeElement.id === "configuracoes", "Reabrir a mesma seção deve restaurar o foco.");

  const gravados = JSON.parse(localStorage.getItem("atmos-cidades"));
  gravados.favorites = [gravados.favorites[0], gravados.favorites[0], { id: 29, name: "Inválida", latitude: 91, longitude: 91 }];
  gravados.history = [...gravados.history, gravados.history[0]];
  localStorage.setItem("atmos-cidades", JSON.stringify(gravados));
  await abrir("#configuracoes");
  exigir(texto(".city") === "Nova York" && buscar(".favorite-list").children.length === 1 &&
    buscar(".history-list").children.length === gravados.history.length - 1, "Valide e deduplique os dados ao recarregar.");
  janela().eval('Storage.prototype.setItem = () => { throw new DOMException("Armazenamento indisponível.", "QuotaExceededError"); }');
  mudar("#temperature-unit", "fahrenheit");
  exigir(texto(".settings-feedback").includes("nesta visita") && texto(".temp").includes("°F"),
    "A troca de unidade deve funcionar mesmo quando o armazenamento falha.");
  exigir(janela().errosDoATMOS.length === 0, "O navegador registrou erros: " + janela().errosDoATMOS.join(" · "));
  resultado.textContent = "Regressão do ATMOS em 1.280, 350 e 320 px.";
}

async function testarServicosReais() {
  quadro.style.width = "1280px";
  const pronto = new Promise((resolver) => quadro.addEventListener("load", resolver, { once: true }));
  quadro.src = "../#painel";
  await pronto;
  enviar(".topbar .search", "Recife");
  await esperar(() => !buscar(".weather").hidden && texto(".city") === "Recife",
    "A previsão real de Recife não abriu no Chrome.", 480);
  exigir(texto(".region").includes("Pernambuco") && buscar(".hourly-list").children.length > 0 &&
    buscar(".forecast-list").children.length > 0, "A resposta real deve incluir Recife, Pernambuco, e os períodos previstos.");
  await navegar("graficos");
  for (const [metrica, unidade] of [
    ["temperature_2m", "°C"],
    ["relative_humidity_2m", "%"],
    ["wind_speed_10m", "km/h"],
    ["precipitation_probability", "%"],
    ["cloud_cover", "%"],
  ]) {
    mudar("#chart-metric", metrica);
    exigir(!buscar("#graficos .chart-content").hidden && texto("#chart-reading").includes(unidade),
      "Confira a métrica e a unidade na página Gráficos.");
  }
  const a = ".compare-city:nth-child(1) .compare-search";
  const b = ".compare-city:nth-child(2) .compare-search";
  await navegar("comparar");
  enviar(a, "Recife");
  enviar(b, "Tóquio");
  await esperar(() => !buscar(".compare-charts").hidden, "A comparação real entre Recife e Tóquio não carregou.", 480);
  await navegar("qualidade-do-ar");
  await esperar(() => !buscar(".air-data").hidden, "A resposta real de qualidade do ar não carregou.", 480);
  await navegar("mapas");
  await esperar(() => !buscar(".map-grid").hidden && Boolean(buscar(".leaflet-tile-loaded")),
    "O Leaflet ou os mosaicos do OpenStreetMap não carregaram.", 480);
  exigir(buscar(".leaflet-tile-loaded").naturalWidth > 0 &&
    janela().performance.getEntriesByType("resource").some(({ name }) => name.startsWith("https://tile.openstreetmap.org/")),
  "Confirme que uma imagem real do OpenStreetMap foi carregada e decodificada.");
  exigir(Boolean(buscar('.leaflet-control-attribution a[href*="leafletjs.com"]')) &&
    Boolean(buscar('.leaflet-control-attribution a[href*="openstreetmap.org"]')), "Atribua o mapa a suas fontes.");
  clicar(".map-center");
  clicar(".map-inspect");
  await esperar(() => !buscar(".map-point-data").hidden, "A consulta real do centro do mapa não carregou.", 480);
  exigir(texto(".map-point-time").includes("horário local"), "Mostre a data e hora reais no fuso do ponto.");
  verificarLargura(1280);
  quadro.style.width = "320px";
  await esperar(() => janela().innerWidth === 320, "O mapa deve acompanhar a mudança de largura.");
  verificarLargura(320);
  await testarInteracoesDoMapa();
  resultado.textContent = "Serviços reais e mosaicos OpenStreetMap. Interações Leaflet, falhas e recuperação com mosaicos simulados.";
}

async function testarInteracoesDoMapa() {
  localStorage.clear();
  quadro.style.width = "1280px";
  await abrir();
  await consultar("Recife");
  await navegar("mapas");
  const mapa = (codigo) => janela().eval(codigo);
  const mosaicoVisivel = () => buscar(".leaflet-tile-loaded")?.naturalWidth > 0;
  await esperar(mosaicoVisivel, "O mapa deve inicializar com o marcador e o mosaico.", 480);
  exigir(mapa("weatherMap.cityMarker.getLatLng().lat") === 1, "Centralize o mapa na cidade salva.");
  mapa("window.instanciaTestadaDoMapa = weatherMap.map");

  const zoom = mapa("weatherMap.map.getZoom()");
  mapa("weatherMap.map.once('zoomend', () => { window.zoomConcluido = true; })");
  clicar(".leaflet-control-zoom-in");
  await esperar(() => janela().zoomConcluido && mapa("weatherMap.map.getZoom()") === zoom + 1 && mosaicoVisivel(),
    "O botão deve aumentar o zoom.");
  const centro = mapa("weatherMap.map.getCenter().lng");
  const area = buscar(".map-canvas");
  const retangulo = area.getBoundingClientRect();
  const x = Math.round(retangulo.left + retangulo.width / 2);
  const y = Math.round(retangulo.top + retangulo.height / 2);
  const eventoDoMouse = (alvo, tipo, distancia) => {
    const evento = new (janela().MouseEvent)(tipo, {
      bubbles: true, clientX: x + distancia, clientY: y, button: 0, buttons: tipo === "mouseup" ? 0 : 1,
    });
    Object.defineProperty(evento, "which", { value: 1 });
    alvo.dispatchEvent(evento);
  };
  eventoDoMouse(area, "mousedown", 0);
  eventoDoMouse(area, "mousemove", 12);
  await pausa(30);
  eventoDoMouse(area, "mousemove", 84);
  await pausa(60);
  eventoDoMouse(area, "mouseup", 84);
  await esperar(() => mapa("weatherMap.map.getCenter().lng") !== centro, "Arrastar deve mover o mapa.");
  clicar(".map-center");
  exigir(mapa("weatherMap.map.getCenter().equals(weatherMap.cityMarker.getLatLng())"), "Recentralize no marcador da cidade.");

  mapa("weatherMap.map.fire('click', { latlng: L.latLng(1.25, 1.5) })");
  await esperar(() => !buscar(".map-point-data").hidden, "Selecionar um ponto deve consultar o tempo.");
  exigir(texto(".map-point-coordinates").includes("1,25°") && texto(".map-point-time").includes("09:00") &&
    texto(".map-point-values").includes("58%") && texto(".map-point-values").includes("km/h"), "Informe coordenadas, hora local e leituras.");
  exigir(mapa("weatherMap.pointMarker.getLatLng().equals(L.latLng(1.25, 1.5))"), "Posicione o marcador no ponto selecionado.");

  janela().estadoDosMosaicos = "bloqueado";
  await consultar("São Paulo");
  await esperar(() => texto(".map-status").includes("recusou"), "Exiba uma mensagem de acesso recusado.");
  exigir(!buscar(".leaflet-tile") && !buscar(".map-retry").hidden && buscar(".map-city-marker") &&
    mapa("weatherMap.cityMarker.getLatLng().lat") === 2, "Remova os mosaicos bloqueados e preserve o marcador da nova cidade.");
  const pedidos = janela().pedidosDeMosaico.length;
  clicar(".leaflet-control-zoom-out");
  await navegar("painel");
  await navegar("mapas");
  exigir(janela().pedidosDeMosaico.length === pedidos && mapa("weatherMap.map === window.instanciaTestadaDoMapa"),
    "Mantenha uma instância e não repita a requisição bloqueada automaticamente.");
  clicar(".map-inspect");
  await esperar(() => !buscar(".map-point-data").hidden, "A consulta do tempo deve funcionar sem os mosaicos.");

  janela().falharTempoNoPonto = true;
  clicar(".map-inspect");
  await esperar(() => texto(".map-point-status").includes("Não foi possível"), "Informe falhas da consulta de tempo.");
  exigir(!buscar(".map-point-coordinates").hidden && buscar(".map-point-data").hidden, "Preserve as coordenadas e oculte leituras inválidas.");
  janela().falharTempoNoPonto = false;
  janela().estadoDosMosaicos = "limitado";
  clicar(".map-retry");
  await esperar(() => texto(".map-status").includes("limitou"), "Informe o limite de consultas.");
  const pedidosLimitados = janela().pedidosDeMosaico.length;
  clicar(".map-retry");
  exigir(janela().pedidosDeMosaico.length === pedidosLimitados, "Respeite o tempo de espera antes de reenviar.");
  janela().ajustarRelogio("2026-11-18T12:02:00Z");
  janela().estadoDosMosaicos = "sem rede";
  clicar(".map-retry");
  await esperar(() => texto(".map-status").includes("indisponíveis"), "Exiba falha de rede com opção de nova tentativa.");
  janela().estadoDosMosaicos = "normal";
  clicar(".map-retry");
  await esperar(mosaicoVisivel, "O botão deve recuperar os mosaicos quando o serviço volta.");
  quadro.style.width = "320px";
  await esperar(() => janela().innerWidth === 320 &&
    mapa("weatherMap.map.getSize().x === weatherMap.canvas.clientWidth"), "Redimensione o Leaflet na página ativa.");
  verificarLargura(320);
  exigir(mapa("weatherMap.map === window.instanciaTestadaDoMapa") && buscar(".map-city-marker").getClientRects().length > 0,
    "Mantenha a instância e o marcador após o redimensionamento.");
  exigir(janela().errosDoATMOS.length === 0, "Erros do mapa: " + janela().errosDoATMOS.join(" · "));
}

async function testarNavegacao() {
  localStorage.clear();
  quadro.style.width = "1280px";
  await abrir("#painel");
  await consultar("Recife");
  clicar(".favorite-toggle");
  janela().eval('loadLeaflet.pending = Promise.resolve(undefined)');
  const paginas = ["painel", "graficos", "favoritos", "comparar", "mapas", "qualidade-do-ar", "calendario", "configuracoes"];
  for (const largura of [1280, 320]) {
    quadro.style.width = largura + "px";
    await esperar(() => janela().innerWidth === largura, "Atualize a largura testada.");
    for (const pagina of paginas) {
      await navegar(pagina);
      const visiveis = quadro.contentDocument.querySelectorAll("[data-page]:not([hidden])");
      exigir(visiveis.length === 1 && visiveis[0].id === pagina, "Mostre apenas a página ativa.");
      exigir(buscar('nav a[aria-current="page"]').hash === "#" + pagina, "Destaque a página ativa.");
      for (const seletor of [".topbar .search", ".location-button", ".refresh-button", ".theme-button"]) {
        exigir(buscar(seletor).getClientRects().length > 0, "Mantenha os controles globais na página " + pagina + ".");
      }
      verificarLargura(largura);
    }
    await navegar("painel");
    janela().scrollTo(0, 480);
    await esperar(() => janela().scrollY > 100, "Role o documento para testar a barra lateral.");
    const barra = buscar(".sidebar").getBoundingClientRect();
    exigir(barra.top >= 0 && barra.top <= 24 && barra.bottom <= janela().innerHeight, "Mantenha a barra no campo visível.");
    if (largura > 720) {
      exigir(barra.right <= buscar("main").getBoundingClientRect().left, "A barra lateral não deve sobrepor o conteúdo.");
    }
    const estavaExpandido = buscar(".sidebar-toggle").getAttribute("aria-expanded");
    clicar(".sidebar-toggle");
    exigir(buscar(".sidebar-toggle").getAttribute("aria-expanded") !== estavaExpandido, "Alterne a expansão do menu.");
    clicar(".sidebar-toggle");
    exigir(buscar(".sidebar-toggle").getAttribute("aria-expanded") === estavaExpandido, "Restaure o estado do menu.");
    await navegar("graficos");
    exigir(janela().scrollY === 0 && texto(".charts-location").includes("Recife"), "Volte ao topo e preserve a cidade nos gráficos.");
    await navegar("favoritos");
    janela().history.back();
    await esperar(() => !buscar("#graficos").hidden, "O botão Voltar deve reabrir Gráficos.");
    exigir(janela().scrollY === 0 && quadro.contentDocument.activeElement.id === "graficos", "Restaure o topo e o foco ao voltar.");
    janela().history.forward();
    await esperar(() => !buscar("#favoritos").hidden, "O botão Avançar deve reabrir Favoritos.");
    exigir(janela().scrollY === 0 && quadro.contentDocument.activeElement.id === "favoritos", "Restaure o topo e o foco ao avançar.");
    await navegar("calendario");
    exigir(texto(".calendar-location").includes("Recife"), "Preserve a cidade no calendário.");
    await navegar("painel");
    exigir(texto(".city") === "Recife", "Preserve a cidade no painel.");
  }
  quadro.style.height = "340px";
  await esperar(() => janela().innerHeight === 340, "Reduza a altura da janela de teste.");
  clicar(".sidebar-toggle");
  exigir(buscar("#menu").scrollHeight > buscar("#menu").clientHeight, "Permita rolar o menu em telas baixas.");
  buscar('nav a[href="#configuracoes"]').focus();
  tecla('nav a[href="#configuracoes"]', "Escape");
  exigir(buscar("#menu").getClientRects().length === 0 && quadro.contentDocument.activeElement === buscar(".sidebar-toggle"),
    "Escape deve fechar o menu móvel e restaurar o foco.");
  await navegar("favoritos");
  clicar(".favorite-remove");
  exigir(buscar(".favorite-list").children.length === 0 && !buscar("#favoritos").hidden &&
    quadro.contentDocument.activeElement.id === "favoritos", "Permita remover um favorito sem sair da página.");
  exigir(JSON.parse(localStorage.getItem("atmos-cidades")).favorites.length === 0, "Persista a remoção do favorito.");
  await abrir("#graficos");
  exigir(!buscar("#graficos").hidden && buscar("#painel").hidden && texto(".charts-location").includes("Recife"),
    "Um link direto para Gráficos deve carregar apenas essa página com a cidade salva.");
  resultado.textContent += " Oito páginas independentes, barra lateral visível durante a rolagem e histórico de navegação.";
}

async function testarContexto() {
  localStorage.clear();
  quadro.style.height = "700px";
  await abrir("#painel");
  exigir(texto(".temperature-label") === "Temperatura do ar" && texto(".feels-like").includes("Sensação térmica"),
    "Diferencie a temperatura do ar da sensação térmica.");
  const ajuda = (id) => {
    const painel = buscar("#explicacao-" + id);
    return { painel, botao: buscar('[aria-controls="' + painel.id + '"]') };
  };
  const temperatura = ajuda("temperatura");
  const umidade = ajuda("humidity");
  const vento = ajuda("wind");
  const horario = ajuda("horaria");
  const semanal = ajuda("semanal");
  const recolhida = ({ painel, botao }) => painel.inert && botao.getAttribute("aria-expanded") === "false";
  const expandida = ({ painel, botao }) => !painel.inert && botao.getAttribute("aria-expanded") === "true";
  for (const item of quadro.contentDocument.querySelectorAll(".weather .explanation-toggle")) {
    const painel = buscar("#" + item.getAttribute("aria-controls"));
    exigir(item.tagName === "BUTTON" && item.tabIndex === 0 && painel &&
      recolhida({ painel, botao: item }) && painel.getBoundingClientRect().height === 0,
    "Disponibilize um botão de teclado e recolha a explicação inicialmente.");
  }
  temperatura.botao.focus();
  temperatura.botao.click();
  exigir(expandida(temperatura) && temperatura.painel.textContent.includes("radiação solar") &&
    quadro.contentDocument.activeElement === temperatura.botao, "Abra a explicação mantendo o foco.");
  temperatura.botao.click();
  exigir(recolhida(temperatura), "A explicação pode ser recolhida.");
  const cartaoUmidade = umidade.botao.closest(".metric");
  const cartaoVento = vento.botao.closest(".metric");
  const alturaUmidade = cartaoUmidade.getBoundingClientRect().height;
  const alturaVento = cartaoVento.getBoundingClientRect().height;
  umidade.botao.click();
  await esperar(() => umidade.painel.getBoundingClientRect().height > 0, "Mostre o conteúdo da explicação aberta.");
  exigir(cartaoVento.getBoundingClientRect().height === alturaVento,
    "Abrir um cartão não deve aumentar a altura do cartão vizinho.");
  vento.botao.click();
  exigir(expandida(umidade) && expandida(vento) && recolhida(horario) && recolhida(semanal),
    "Expanda cada cartão independentemente das outras explicações.");
  vento.botao.click();
  exigir(expandida(umidade) && recolhida(vento), "Recolha apenas a explicação acionada.");
  const leituras = [".temp", ".humidity", ".wind", ".cloud-cover", ".surface-pressure",
    ".precipitation", ".uv-index", ".sunrise", ".sunset", ".temperature-max", ".temperature-min"];
  await navegar("configuracoes");
  mudar("#theme-preference", "dark");
  await navegar("painel");
  for (const tema of ["dark", "light"]) {
    exigir(buscar("html").dataset.theme === tema, "Aplique o tema " + tema + ".");
    for (const largura of [1280, 350, 320]) {
      quadro.style.width = largura + "px";
      await esperar(() => janela().innerWidth === largura, "Redimensione o painel.");
      verificarLargura(largura);
      for (const seletor of leituras) {
        const leitura = buscar(seletor);
        exigir(leitura.getBoundingClientRect().height > 0 && /\d/.test(leitura.textContent) &&
          !leitura.closest(".explanation-panel"), "Mantenha visível a leitura de " + seletor + ".");
      }
      for (const cartao of quadro.contentDocument.querySelectorAll(".weather .metric")) {
        exigir(cartao.scrollWidth <= cartao.clientWidth, "Acomode o conteúdo dentro do cartão.");
      }
    }
    if (tema === "dark") clicar(".theme-button");
  }
  for (const [leitura, valor, descricao] of [
    [".humidity", "58%", "saturação"],
    [".wind", "16,1 km/h", "de onde"],
    [".cloud-cover", "35%", "céu coberta"],
    [".precipitation-amount", "0,6 mm", "acumulada"],
    [".surface-pressure", "1.008 hPa", "hectopascais"],
    [".precipitation", "10%", "Maior chance horária"],
  ]) {
    const leituraAtual = buscar(leitura);
    exigir(leituraAtual.textContent.replace(/\s/g, "") === valor.replace(/\s/g, "") &&
      leituraAtual.closest(".metric").querySelector(".metric-context").textContent.includes(descricao),
    "Confira a leitura, a unidade e a explicação de " + leitura + ".");
  }
  exigir(texto(".precipitation-interval").includes("15 min") && texto(".wind-direction").includes("90°"),
    "Identifique o intervalo do acumulado e a direção em graus.");
  exigir(texto(".uv-index") === "2 Baixo" && buscar(".uv-guidance").hidden, "Use a faixa baixa quando o índice for 2.");
  await consultar("Recife");
  exigir(expandida(umidade) && texto(".humidity") === "58%", "Atualize os dados sem recolher o cartão aberto.");
  umidade.botao.click();
  await esperar(() => umidade.painel.getBoundingClientRect().height === 0, "Recolha todo o espaço da explicação.");
  exigir(cartaoUmidade.getBoundingClientRect().height <= alturaUmidade,
    "Restaure a altura compacta depois de recolher a explicação.");
  exigir(texto(".uv-index") === "8 Muito alto" && texto(".uv-hourly") === "3 · Moderado" &&
    texto(".uv-guidance").includes("perto do meio-dia"), "Atualize a classificação e a orientação ao trocar de cidade.");
  for (const [valor, faixa] of [[0, "Baixo"], [3, "Moderado"], [6, "Alto"], [8, "Muito alto"], [11, "Extremo"]]) {
    exigir(janela().eval("describeUv(" + valor + ").reading").endsWith(faixa), "Confira o limite da faixa " + faixa + ".");
  }
  exigir(texto(".sunrise") === "06:00" && texto(".sunset") === "18:30" && texto(".daylight-duration") === "12 h 30 min",
    "Mostre horas locais e calcule a duração entre os dois instantes.");
  clicar(".forecast-list button");
  await esperar(() => !buscar("#calendario").hidden, "Abra o calendário pela previsão semanal.");
  exigir(texto(".calendar-availability").includes("indisponível") && texto(".forecast-detail-extra").includes("12 h 30 min"),
    "Explique a disponibilidade e mostre os dados do dia selecionado.");
  await navegar("graficos");
  mudar("#chart-metric", "precipitation_probability");
  const faixa = buscar("#graficos .chart-hour");
  faixa.focus();
  faixa.value = "1";
  faixa.dispatchEvent(new (janela().Event)("input"));
  exigir(texto("#chart-context").includes("0,1 mm") && texto("#graficos .chart-period").includes("Previsão do modelo") &&
    faixa.getAttribute("aria-valuetext") === texto("#chart-reading") && texto("#chart-reading").includes("25%"),
    "A leitura do gráfico deve informar valor, horário e unidade também pelo controle acessível.");
  await navegar("configuracoes");
  mudar("#temperature-unit", "fahrenheit");
  mudar("#wind-unit", "mph");
  await navegar("graficos");
  mudar("#chart-metric", "temperature_2m");
  exigir(texto("#graficos .chart-metric-title").includes("°F") && texto("#chart-reading").includes("50 °F"),
    "A unidade do título e da leitura deve mudar para Fahrenheit.");
  mudar("#chart-metric", "wind_speed_10m");
  exigir(texto("#graficos .chart-metric-title").includes("mph") && texto("#chart-reading").includes("10 mph"),
    "A unidade do título e da leitura deve mudar para mph.");
  await navegar("qualidade-do-ar");
  await esperar(() => !buscar(".air-data").hidden, "Carregue a escala de qualidade do ar.");
  const indiceAr = ajuda("air-index");
  indiceAr.botao.click();
  exigir(expandida(indiceAr) && recolhida(ajuda("air-pm10")) && texto(".air-bands").includes("acima de 300"),
    "Exiba as faixas dos EUA de forma independente das outras leituras do ar.");
  mudar("#air-scale", "european_aqi");
  exigir(expandida(indiceAr) && texto(".air-bands").includes("acima de 100") && texto(".air-category") === "Razoável" &&
    texto(".air-pm10") === "11 µg/m³" && texto(".air-index").includes("pts"), "Diferencie categorias, pontos e concentrações.");
  mudar("#air-chart-metric", "pm10");
  exigir(texto("#air-chart-context").includes("10 µm") && texto(".air-chart .chart-period").includes("Últimas 24 horas"),
    "Explique a métrica e o período histórico de qualidade do ar.");
  verificarLargura(320);
  janela().ajustarRelogio("2026-11-19T02:30:00.456Z");
  for (const [cidade, dia, chuva, uv, maxima, minima] of [
    ["Fernando de Noronha", "2026-11-19", "10%", "8 Muito alto", "203 °F", "190,4 °F"],
    ["Rio Branco", "2026-11-18", "0%", "0 Baixo", "221 °F", "32 °F"],
  ]) {
    await consultar(cidade);
    exigir(janela().eval("displayedForecast.today") === dia, "Use a data local de " + cidade + " com milissegundos.");
    exigir(texto(".precipitation") === chuva && texto(".uv-index") === uv &&
      texto(".uv-hourly") === "3 · Moderado", "Mostre chuva e UV diário e horário de " + cidade + ".");
    exigir(texto(".sunrise") === "06:00" && texto(".sunset") === "18:30" &&
      texto(".daylight-duration") === "12 h 30 min", "Mostre os horários solares locais de " + cidade + ".");
    exigir(texto(".temperature-max") === maxima && texto(".temperature-min") === minima,
      "Converta as temperaturas do dia local de " + cidade + " para Fahrenheit.");
  }
  janela().ajustarRelogio("2026-11-19T05:00:00.456Z");
  janela().eval("displayDailyMetrics(new Date())");
  exigir(janela().eval("displayedForecast.today") === "2026-11-19" && texto(".precipitation") === "80%" &&
    texto(".uv-index") === "11 Extremo" && texto(".temperature-max") === "224,6 °F" &&
    texto(".temperature-min") === "212 °F", "Na virada local, mostre os valores alinhados à segunda data da previsão.");
  await consultar("Parcial");
  exigir(texto(".uv-index") === "Indisponível" && buscar(".uv-guidance").hidden &&
    texto(".precipitation") === "Indisponível" && texto(".sunrise") === "Indisponível" &&
    texto(".sunset") === "Indisponível" && texto(".daylight-duration") === "Indisponível" &&
    texto(".temperature-max") === "77 °F" && texto(".temperature-min") === "Indisponível",
    "Em uma previsão parcial, preserve a máxima e sinalize somente as leituras ausentes.");
  exigir(janela().errosDoATMOS.length === 0, "O navegador deve concluir a etapa sem erros.");
  resultado.textContent += " Contexto meteorológico, classificações, unidades e detalhes expansíveis.";
}
