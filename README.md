# ATMOS Weather Dashboard

O ATMOS é um painel meteorológico em português brasileiro desenvolvido como projeto escolar. Consulte as condições atuais, planeje os próximos dias e compare cidades em uma interface que se adapta a computadores e celulares. As horas e datas são exibidas de acordo com o fuso da cidade consultada.

## Projeto original e licença

O ATMOS adapta o projeto **Simple Weather App Tutorial**, de **Jonah Lawrence (DenverCoder1)**. A versão original deste histórico consultava o tempo atual com a OpenWeatherMap. O ATMOS migrou para a Open-Meteo e ampliou a interface e os dados apresentados. [Repositório original](https://github.com/DenverCoder1/weather-app-tutorial) · [Perfil do autor](https://github.com/DenverCoder1)

O projeto mantém a licença MIT e o aviso original **Copyright (c) 2020 DenverCoder1**. [Texto integral da licença](LICENSE)

## Tecnologias e serviços

- HTML, CSS e JavaScript nativo. Os gráficos usam Canvas e as preferências usam `localStorage`. A aplicação é estática e dispensa instalação de pacotes ou compilação.
- Previsão, busca de cidades e qualidade do ar consultadas pelas APIs públicas da Open-Meteo via HTTPS, sem chave para o uso não comercial deste projeto. A geocodificação usa dados do GeoNames e a qualidade do ar usa estimativas do Copernicus CAMS. [Previsão](https://open-meteo.com/en/docs) · [Geocodificação](https://open-meteo.com/en/docs/geocoding-api) · [Qualidade do ar](https://open-meteo.com/en/docs/air-quality-api) · [GeoNames](https://www.geonames.org/) · [Copernicus CAMS](https://atmosphere.copernicus.eu/)
- Mapas com Leaflet e mosaicos do OpenStreetMap. Tipografia Manrope, distribuída pelo Google Fonts. [Leaflet](https://leafletjs.com/) · [OpenStreetMap](https://www.openstreetmap.org/copyright) · [Manrope](https://fonts.google.com/specimen/Manrope)

## Recursos principais

- Condições atuais, previsão horária com até 24 horas, previsão de até sete dias, calendário e gráficos interativos.
- Busca com sugestões, geolocalização mediante permissão, favoritos e buscas recentes.
- Comparação de duas cidades com gráficos por horário local, mapa interativo e estimativas de qualidade do ar.
- Temas claro e escuro, escolha da cidade padrão e unidades de temperatura e vento.
- Central de avisos da previsão com contagem no cabeçalho e detalhes por período.
- Planejador de atividades com preferências salvas e acesso ao horário recomendado na linha do tempo.

[Histórico das melhorias](MELHORIAS.md) · [Roteiro da apresentação](ROTEIRO.md)

## Cartões, linha do tempo e ATMOS Insights

- **Cartões de métricas.** No Painel, **Saiba mais** abre a explicação do cartão selecionado, mantendo leituras, unidades e classificações visíveis. O botão muda para **Ocultar detalhes**. O estado acompanha o cartão durante a atualização da previsão, e os efeitos seguem a preferência de movimento reduzido. As leituras dependem dos campos retornados pela Open-Meteo.
- **Linha do tempo.** Selecione uma hora por clique, toque ou teclado para consultar temperatura, condição do céu, umidade, vento, chance de chuva, UV e nebulosidade. **Ver gráficos por hora** leva o horário selecionado ao gráfico existente. A faixa distingue horários repetidos no fim do horário de verão e mostra somente amostras disponíveis.
- **ATMOS Insights.** O resumo usa a previsão diária e as sugestões usam até 24 horas de amostras do mesmo carregamento. **Ver horário** abre a amostra que motivou a sugestão. Abra **Como as sugestões são calculadas** para conferir os limites. A análise aponta chuva a partir de 60%, UV moderado a partir de 3, vento a partir de 40 km/h e variação de temperatura de pelo menos 6 °C em uma sequência sem lacunas. As sugestões ao ar livre exigem pelo menos duas horas consecutivas de luz do dia, céu limpo a encoberto, chance de chuva de até 25%, UV baixo, vento abaixo de 25 km/h e temperatura de 16 a 30 °C. Rajadas e chuva intensa conhecidas também podem excluir horários pelos critérios da central. As sugestões dependem da cobertura da previsão.

## Dados do painel

- As condições atuais da Open-Meteo são estimativas de modelos meteorológicos. As unidades padrão são °C para temperatura e sensação térmica e km/h para vento e rajadas. A umidade relativa e a cobertura de nuvens aparecem em %, a direção de origem do vento em graus, a pressão na superfície em hPa e a precipitação acumulada em mm.
- A previsão do dia indica a maior probabilidade horária de precipitação, o índice UV máximo e a estimativa de UV para a hora local, as temperaturas máxima e mínima e os horários locais de nascer e pôr do sol.
- Campos ausentes aparecem como **Indisponível**. Se uma nova consulta falhar, o painel mantém os últimos dados carregados e mostra uma mensagem de erro.
- O painel usa o fuso da cidade para exibir leituras horárias. A previsão diária segue a data de referência da API, que usa um deslocamento fixo por resposta. Nas mudanças de horário de verão, as duas ocorrências de um horário repetido exibem seus respectivos deslocamentos.
- A chance de precipitação de uma hora se refere a mais de 0,1 mm na hora que termina no horário indicado. O total acumulado do cartão de condições atuais é dado em milímetros e se refere ao intervalo anterior à leitura. O máximo diário mostra a maior chance horária prevista para o dia. [Documentação da Open-Meteo](https://open-meteo.com/en/docs)
- O índice UV é arredondado ao inteiro mais próximo para exibir a faixa correspondente. O painel apresenta orientações de proteção a partir de 3 e orientações reforçadas a partir de 8. A duração da luz do dia é calculada quando os instantes de nascer e pôr do sol estão disponíveis. [Orientações da Organização Mundial da Saúde](https://www.who.int/news-room/questions-and-answers/item/radiation-the-ultraviolet-(uv)-index)

## Avisos baseados na previsão

O sino no cabeçalho mostra quantos avisos o ATMOS identificou na previsão horária da cidade. A central reúne períodos consecutivos da mesma condição, indica o maior nível do período e mostra a fonte e o horário local da última consulta bem-sucedida. Os níveis são critérios do ATMOS. Para alertas oficiais, consulte a Defesa Civil.

| Condição | Atenção | Elevado |
| --- | --- | --- |
| Vento previsto a 10 m | ≥ 40 km/h | ≥ 60 km/h |
| Rajadas previstas a 10 m | ≥ 55 km/h | ≥ 75 km/h |
| Chuva acumulada em uma hora | ≥ 10 mm | ≥ 25 mm |
| Índice UV arredondado | ≥ 6 | ≥ 8 |
| Temperatura do ar | ≥ 35 °C | ≥ 40 °C |
| Trovoadas | Código 95 | Códigos 96 e 99, com granizo |

Vento e rajadas compõem um único aviso por período. A chuva em milímetros corresponde à hora que termina no horário indicado. A central considera os acumulados cujo horário de término ainda está à frente e ignora campos ausentes. Os limites são centralizados em [advisories.js](advisories.js). [Documentação da Open-Meteo](https://open-meteo.com/en/docs)

## Planejador

O **Planejador** usa até 72 horas da previsão horária já carregada. Ele oferece até três períodos sem sobreposição, com duração de uma a quatro horas consecutivas. As preferências de temperatura em Celsius, chance máxima de chuva e faixa do dia são salvas por atividade. As faixas locais são madrugada (0h–6h), manhã (6h–12h), tarde (12h–18h) e noite (18h–0h).

| Atividade | Temperatura padrão | Chance máx. de chuva | Vento máx. | Rajada máx. | UV máx. |
| --- | --- | ---: | ---: | ---: | ---: |
| Caminhada | 15–29 °C | 35% | 30 km/h | 45 km/h | 5 |
| Corrida | 10–25 °C | 30% | 25 km/h | 40 km/h | 5 |
| Ciclismo | 12–28 °C | 25% | 20 km/h | 32 km/h | 5 |
| Passeio ao ar livre | 17–30 °C | 30% | 25 km/h | 40 km/h | 4 |
| Lavar o carro | 12–30 °C | 10% | 25 km/h | 35 km/h | 5 |

Cada hora precisa ter temperatura no início e chance de chuva no horário de término. O planejador também exclui períodos com chuva horária de pelo menos 10 mm, temperatura de pelo menos 35 °C ou condição prevista fora das categorias de céu limpo a encoberto. Cada critério contribui igualmente para a nota de 0 a 100. Temperaturas próximas ao centro da faixa e valores menores de chance de chuva, vento, rajadas e UV recebem notas maiores. Uma leitura opcional ausente vale zero naquele critério e é indicada no resultado. Empates favorecem o período mais próximo. A nota estima a adequação às preferências com os dados da previsão.

O atalho de uma recomendação seleciona o horário inicial na linha do tempo. Quando estiver fora das próximas 24 horas, a linha do tempo exibe a data recomendada e oferece um botão para retornar às próximas 24 horas.

## Como usar

1. Sirva a raiz do projeto com o Live Server no VS Code. Se você já usa Python, também pode executar `python -m http.server 8000` na raiz e abrir `http://localhost:8000/` no navegador.
2. Digite o nome de uma cidade e escolha uma sugestão, pressione Enter ou clique na lupa. O painel abre em Denver na primeira visita. Depois, abre na cidade padrão escolhida nas configurações ou na última cidade selecionada com sucesso.
3. Para consultar as condições no seu local, use **Minha localização** e permita o acesso no navegador. Esse recurso requer HTTPS ou um servidor local, como o Live Server.
4. Use **Atualizar dados** para refazer a última consulta bem-sucedida. Na primeira visita, o tema acompanha a preferência do sistema. Ao alternar entre claro e escuro, o navegador guarda sua escolha para as próximas visitas.

## Publicação no GitHub Pages

1. Envie a branch `entrega-atmos` ao remoto `origin` com os comandos abaixo.
2. No repositório do GitHub, abra **Settings** (Configurações) → **Pages**. Em **Build and deployment** (Compilação e publicação), selecione **Deploy from a branch** (Publicar de uma branch).
3. Escolha a branch `entrega-atmos` e a pasta `/(root)`. Salve. O `index.html` fica na raiz, junto dos arquivos estáticos, com caminhos relativos que funcionam no subdiretório do repositório.
4. Acompanhe a execução em **Actions** (Ações) e abra a URL que aparecer em **Pages**. Ative **Enforce HTTPS** (Exigir HTTPS) se a opção estiver disponível. Confirme na URL publicada que a página inicia e que uma busca por Recife retorna a previsão.

[Guia oficial do GitHub Pages](https://docs.github.com/pt/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

### Commit e envio ao fork

```powershell
git status --short
git remote -v
git fetch origin
if ($LASTEXITCODE -ne 0) { throw "Confira o acesso ao remoto antes de continuar." }
git log --left-right --oneline origin/main...HEAD
if (git diff --cached --name-only) { throw "Revise os arquivos que já estão preparados para commit." }
git switch -c entrega-atmos
if ($LASTEXITCODE -ne 0) { throw "Escolha um nome livre para a branch de entrega." }
git add -- .nojekyll README.md MELHORIAS.md ROTEIRO.md index.html style.css theme.js script.js weather-data.js cities.js compare.js charts.js environment.js insights.js advisories.js planner.js tests/configuracoes.html tests/configuracoes.js tests/revisao.js tests/simulacao.js tests/testar_configuracoes.py
git diff --cached --stat
git diff --cached --check
```

Depois de revisar os arquivos preparados, faça o commit e envie a branch.

```powershell
git commit -m "Prepara o ATMOS para a entrega escolar"
if ($LASTEXITCODE -ne 0) { throw "Revise a falha do commit antes de enviar a branch." }
git push -u origin entrega-atmos
```

Confira se `origin` aponta para o repositório **AFFODAO/Atmos-Weather-Dashboard.** e revise o conteúdo preparado antes do commit. Se `entrega-atmos` já existir no remoto, escolha outro nome livre e use esse nome também na configuração do Pages. Se a entrega exigir publicação pela `main`, abra uma solicitação de integração da branch de entrega para `main` e selecione `main` no Pages após a integração.

## Limitações

- As condições atuais e os índices de qualidade do ar são estimativas de modelos. A cobertura, a disponibilidade e as atualizações dependem dos serviços externos.
- O calendário exibe as datas disponíveis na resposta de previsão, com horizonte de até sete dias. A comparação horária alinha horários locais que podem corresponder a instantes diferentes.
- A aplicação precisa de internet para obter dados e mapas. A geolocalização exige permissão e um contexto seguro, como HTTPS ou `localhost`.
- Favoritos, histórico e configurações ficam no navegador usado. O armazenamento pode ser limpo ou bloqueado pelo navegador e não é sincronizado entre dispositivos.

## Calendário

- Abra **Calendário** para consultar as datas retornadas pela Open-Meteo, com ícone de condição e temperaturas máxima e mínima. O destaque **Hoje** segue o fuso da cidade selecionada.
- Selecione uma data para abrir seus detalhes. Use **Ver gráficos do dia** para consultar os dados horários disponíveis para essa data.

## Configurações

- Escolha Celsius ou Fahrenheit para temperaturas e km/h ou mph para velocidades do vento. A alteração também atualiza os dados já carregados, incluindo gráficos, comparações e leituras do mapa.
- Em **Tema**, escolha **Claro**, **Escuro** ou **Seguir o sistema**. O botão de tema na barra superior atualiza a mesma preferência.
- Busque e selecione uma **Cidade padrão** para abrir na próxima visita. **Usar a última cidade consultada** restaura o comportamento inicial.
- **Limpar buscas recentes** e **Limpar favoritos** pedem confirmação e afetam apenas a lista escolhida. As preferências são salvas no armazenamento local do navegador e verificadas ao iniciar o ATMOS.

## Mapas

- Abra **Mapas** para ver a cidade selecionada no mapa interativo. Arraste, use as setas ou controle o zoom com os botões do mapa.
- Selecione um ponto no mapa ou use **Consultar centro do mapa** para buscar as condições meteorológicas nas coordenadas escolhidas. **Voltar à cidade** reposiciona o mapa.
- A base cartográfica usa a biblioteca [Leaflet](https://leafletjs.com/) e os mosaicos do [OpenStreetMap](https://www.openstreetmap.org/copyright). Os dados do ponto são consultados na Open-Meteo.
- A consulta do ponto mostra as coordenadas, as condições disponíveis e a data e hora locais da estimativa quando a API informa o fuso e o horário. Se a consulta falhar, as coordenadas continuam visíveis.
- Sirva o ATMOS por HTTP local ou HTTPS no GitHub Pages. O provedor atual dispensa chave. O navegador envia a origem real da página como referência nas consultas HTTPS aos mosaicos e respeita os cabeçalhos de cache do servidor. Os mosaicos são solicitados conforme a área visível, sem transferência antecipada para uso offline. [Política de uso de mosaicos do OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/)
- Se o provedor recusar ou limitar as consultas, o ATMOS suspende os mosaicos e mantém os marcadores e a consulta de tempo. Use **Tentar carregar o mapa novamente** após a recuperação do serviço ou o tempo de espera informado. Se a URL publicada continuar recebendo 403, confirme no painel de rede do navegador se a solicitação envia a origem da página no cabeçalho `Referer` e verifique bloqueios do navegador ou da rede. O serviço público tem disponibilidade de melhor esforço.

## Qualidade do ar

- Abra **Qualidade do ar** para ver a estimativa da cidade selecionada. Escolha entre o **IQA dos EUA** e o **IQA europeu**. Cada escala usa suas próprias faixas de classificação.
- PM₂,₅ e PM₁₀ são apresentados em µg/m³. O gráfico mostra as estimativas horárias disponíveis nas últimas 24 horas, no fuso indicado. As métricas podem ser alternadas no seletor do gráfico.
- O IQA é uma pontuação da escala escolhida. Abra **Faixas da escala selecionada** para consultar as categorias. PM₂,₅ e PM₁₀ são concentrações de partículas, expressas em microgramas por metro cúbico.
- Os dados da [Open-Meteo](https://open-meteo.com/en/docs/air-quality-api) são estimativas do modelo [Copernicus CAMS](https://atmosphere.copernicus.eu/). Valores ausentes aparecem como **Indisponível**. Cada cidade consultada pode reutilizar a resposta por até 15 minutos.

## Comparação de cidades

1. Abra **Comparar** na barra lateral. Busque uma cidade em cada cartão e selecione os resultados. Use **Trocar cidades** para inverter os lados.
2. Leia as diferenças como **Cidade B menos Cidade A**. Um sinal positivo indica que a leitura de B é maior. Diferenças de umidade, nebulosidade e probabilidade de precipitação são expressas em pontos percentuais.
3. As condições atuais só têm diferença calculada quando as duas respostas indicam o mesmo instante. Os resumos diários só têm diferença calculada quando as datas locais de referência coincidem.
4. Escolha a métrica no gráfico. As linhas alinham as leituras pela hora e pelo minuto locais de cada cidade e podem representar instantes distintos. Passe o cursor, toque ou use o controle de horário para consultar as duas leituras e seus deslocamentos em relação ao UTC.

## Favoritos e buscas recentes

- Use o coração no cartão de tempo atual para salvar a cidade ou removê-la. Na página **Favoritos**, selecione uma cidade salva ou uma busca recente para abrir a previsão. Use **Remover** ao lado de uma cidade para atualizar os favoritos na própria página.
- As sugestões mostram a região e o país quando disponíveis. Use as setas para navegar pela lista, Enter para escolher e Escape para fechar. Sem destacar uma opção, Enter e a lupa carregam o primeiro resultado.
- A busca usa a API de geocodificação da Open-Meteo com dados do [GeoNames](https://www.geonames.org/).
- O navegador guarda os favoritos, as dez cidades buscadas mais recentemente e a última cidade selecionada. Cidades homônimas são identificadas pelo código de geocodificação da Open-Meteo. **Limpar histórico** pede confirmação e preserva os favoritos e a cidade padrão.

## Previsão interativa

- Deslize a faixa de previsão horária e selecione um horário para abrir suas leituras, incluindo a previsão para a hora atual quando houver dados. Os horários seguem o fuso da cidade.
- Selecione um dia no resumo semanal para abrir seus detalhes no **Calendário**. De lá, use **Ver gráficos do dia** para abrir a página **Gráficos** com o período selecionado. A previsão semanal mostra a maior probabilidade horária de precipitação de cada dia.
- Escolha uma métrica e passe o cursor, toque no gráfico ou use as setas do teclado no controle de horário para consultar valores. **Próximas 24 h** restaura o período inicial.
- As interações reutilizam os dados da mesma consulta à Open-Meteo. Horas com valores ausentes aparecem sem pontos nos gráficos.

## Navegação e acessibilidade

- Cada item da barra lateral abre uma página com endereço próprio, como `#graficos`. A busca, as ferramentas globais e a cidade selecionada acompanham a navegação. Use **Voltar** e **Avançar** do navegador para revisitar páginas.
- A barra lateral permanece visível durante a rolagem. Em telas pequenas, use o botão do menu para abrir a navegação e Escape para fechá-la. Use Tab para percorrer os controles e o primeiro atalho do site para ir ao conteúdo da página atual.
- Com um cartão de horário em foco, use as setas para avançar ou voltar na seleção. Início e Fim selecionam o primeiro e o último horário. No gráfico, as setas percorrem as leituras quando o controle de horário está em foco.
- As animações seguem a preferência de movimento reduzido do sistema. Durante a consulta inicial, o painel mostra a estrutura de carregamento. Nas consultas seguintes, os dados existentes continuam visíveis enquanto a nova resposta está pendente.
- A interface usa a fonte [Manrope, distribuída pelo Google Fonts](https://fonts.google.com/specimen/Manrope).

## Testes

Execute `python tests/testar_configuracoes.py` com Python 3.12 e Google Chrome. Use a variável `ATMOS_CHROME` se o executável estiver em outro caminho.

- A suíte com dados simulados verifica a busca, cidades homônimas, falhas e respostas incompletas, cancelamento de consultas, unidades, temas, armazenamento, previsões, comparação entre fusos, geolocalização e navegação em larguras de 320, 350 e 1.280 px.
- O teste de navegação verifica as nove páginas, os controles globais, a barra lateral durante a rolagem, o menu em telas baixas, a persistência da cidade e os botões **Voltar** e **Avançar**.
- O teste de contexto verifica as unidades dos gráficos, a leitura acessível por horário, os detalhes expansíveis, as faixas de UV e IQA, os horários solares e o comportamento com dados ausentes.
- Os testes das cinco etapas cobrem cartões recolhidos e os dois temas, sincronização da linha do tempo com o gráfico, virada do dia e horário de verão, sugestões e avisos sem conflito, limites de intensidade e expiração, além das preferências e janelas de até 72 horas do Planejador.
- Execute `python tests/testar_configuracoes.py --servicos-reais` para verificar previsão, geocodificação e qualidade do ar da Open-Meteo, além do Leaflet e dos mosaicos do OpenStreetMap. O teste precisa de acesso à internet.
- A suíte com serviços reais também verifica as interações do Leaflet e a recuperação de 403, 429 e perda de conexão com mosaicos simulados para os testes de arrasto, zoom e falhas.
- As duas suítes servem o projeto em um subdiretório local para verificar os caminhos relativos usados no GitHub Pages.
- Confira também a URL pública em HTTPS após a publicação no Pages.

## Lista de conferência da entrega

- [ ] Revisar a seleção de arquivos do commit e enviar a branch ao fork.
- [ ] Configurar o Pages e confirmar que a URL HTTPS publicada abre em uma janela anônima.
- [ ] Na URL publicada, buscar Recife e conferir previsão, favoritos, temas e comparação em computador e celular.
- [ ] Gravar a demonstração do site publicado em até cinco minutos e conferir se o vídeo e seu link estão acessíveis.
- [ ] Enviar os links do repositório, do site e do vídeo no local indicado pela escola.
