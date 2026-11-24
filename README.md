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
- Ordem ajustável dos cartões de métricas e painéis opcionais recolhíveis, com layout salvo no navegador.

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

O **Planejador** usa até 72 horas da previsão horária já carregada. Em **Hoje**, **Amanhã** e **Próximos dias**, mostra a janela mais adequada para cada data local, com atividade, horário, temperatura, chance de chuva, vento, rajadas e UV. Cada janela dura de uma a quatro horas consecutivas e aparece na data em que começa, mesmo que termine no dia seguinte. Nesse caso, o dia seguinte considera apenas horários a partir do fim da recomendação anterior. Quando não há recomendação, o cartão explica se faltaram dados, se os critérios não foram atendidos ou se os períodos adequados se sobrepõem.

O padrão para novas preferências é **Horário diurno** (06h–19h), considerando a indicação de luz do dia da previsão quando disponível. As outras opções são madrugada (0h–6h), manhã (6h–12h), tarde (12h–18h), noite (18h–0h) e **Qualquer horário**. A janela inteira precisa caber na faixa escolhida, no fuso da cidade. As preferências salvas por atividade são preservadas, inclusive **Qualquer horário**, que era o padrão anterior.

| Atividade | Temperatura padrão | Chance máx. de chuva | Vento máx. | Rajada máx. | UV máx. |
| --- | --- | ---: | ---: | ---: | ---: |
| Caminhada | 15–29 °C | 35% | 30 km/h | 45 km/h | 5 |
| Corrida | 10–25 °C | 30% | 25 km/h | 40 km/h | 5 |
| Ciclismo | 12–28 °C | 25% | 20 km/h | 32 km/h | 5 |
| Passeio ao ar livre | 17–30 °C | 30% | 25 km/h | 40 km/h | 4 |
| Lavar o carro | 12–30 °C | 10% | 25 km/h | 35 km/h | 5 |

Cada hora precisa ter temperatura no início e chance de chuva no horário de término. O planejador também exclui períodos com chuva horária de pelo menos 10 mm, temperatura de pelo menos 35 °C ou condição prevista fora das categorias de céu limpo a encoberto. Em **Entenda a pontuação**, consulte o peso e os pontos de cada critério, a contribuição do horário e os descontos. Temperaturas próximas ao centro da faixa e valores menores de chance de chuva, vento, rajadas e UV rendem mais pontos.

A previsão vale até 75 pontos e o horário vale até 25. A nota usa todas as horas da janela. Para cada critério, calcula a média das notas horárias com leitura disponível e distribui os pontos meteorológicos conforme o peso e a proporção de horas com leitura. Leituras ausentes são identificadas e geram um desconto separado de 25% dos 75 pontos meteorológicos multiplicados pela parcela do peso aplicável sem leitura. O UV fica fora do cálculo nas horas sem luz. Quando a previsão não traz a indicação de luz do dia, o cálculo usa a faixa diurna local.

| Atividade | Temperatura | Chance de chuva | Vento | Rajadas | UV | Condição do céu |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Caminhada | 20 | 20 | 12 | 8 | 10 | 5 |
| Corrida | 24 | 14 | 12 | 8 | 12 | 5 |
| Ciclismo | 14 | 18 | 19 | 15 | 5 | 4 |
| Passeio ao ar livre | 18 | 17 | 9 | 8 | 17 | 6 |
| Lavar o carro | 10 | 35 | 10 | 8 | 8 | 4 |

A espera desconta cinco pontos a cada 24 horas, proporcionalmente. A barra e o rótulo usam o mesmo valor final, arredondado e limitado a 0–100. Em **Qualquer horário**, as janelas inteiramente diurnas ficam à frente das alternativas. Para corrida, o início da manhã (06h–10h) e o fim da tarde (16h–19h) recebem preferência dentro da faixa escolhida. A nota estima a adequação às preferências. A previsão pode mudar e a pontuação não garante segurança.

O atalho de uma recomendação seleciona o horário inicial na linha do tempo. Quando estiver fora das próximas 24 horas, a linha do tempo exibe a data recomendada e oferece um botão para retornar às próximas 24 horas.

## Personalização do painel

Abra **Personalizar painel** para usar os botões **Mover para cima** e **Mover para baixo** nos cartões de **Métricas atuais** e **Previsão para hoje**. Cada cartão muda de posição dentro do seu grupo, inclusive na ordem de leitura e navegação por teclado. A previsão semanal e as sugestões meteorológicas podem ser recolhidas e reabertas pelo título do controle.

A ordem dos cartões, o estado dos painéis e as explicações abertas no painel são salvos neste navegador. **Restaurar layout padrão** recupera a ordem original, reabre os dois painéis opcionais e recolhe as explicações. A personalização mantém os valores nos cartões e reaproveita a previsão já carregada.

## Evolução das previsões

Em **Gráficos → Evolução das previsões**, selecione uma cidade e uma data-alvo. A seção compara a primeira previsão ainda guardada com a mais recente e mostra os aumentos e quedas de máxima, mínima e chance máxima de precipitação. A diferença de chance aparece em pontos percentuais. Passe o cursor, toque no gráfico ou use o controle **Registro no gráfico** para consultar cada registro com data e hora no fuso da cidade.

- O histórico usa as previsões diárias da Open-Meteo já recebidas pelo painel principal. Ele começa na primeira consulta registrada neste navegador e representa o que o modelo previa a cada consulta. O histórico de observações meteorológicas é um dado diferente.
- O ATMOS registra apenas cidades identificadas na busca e datas com pelo menos uma das três leituras. Cada par de cidade e data-alvo tem intervalo mínimo de três horas entre registros. Consultas com os mesmos valores e metadados de fuso que o registro anterior são ignoradas.
- O navegador conserva até 500 registros no total, por até 30 dias a partir da consulta, com prioridade para os mais recentes. A limpeza ocorre ao carregar o histórico ou receber uma previsão elegível. **Apagar histórico de previsões** remove os registros locais após confirmação.
- Se o navegador impedir a gravação, os novos registros podem ficar disponíveis apenas na visita atual. O formato local é validado e versionado. Dados de versões incompatíveis são preservados até a exclusão explícita.

## ATMOS AI

Abra **ATMOS AI** pela barra lateral ou pelo atalho do Painel. Escolha uma pergunta sugerida ou digite a sua. O assistente usa regras locais para consultar chuva, temperatura, UV e vento na cidade selecionada. Ele responde sobre as condições atuais e a previsão de hoje ou amanhã e consulta as preferências salvas do Planejador para indicar janelas de atividade.

Para perguntas sobre qualidade do ar, o assistente usa a estimativa recente da mesma cidade já consultada na página **Qualidade do ar**. Se ela estiver indisponível, a resposta local oferece um atalho para a consulta. O histórico da conversa permanece disponível enquanto a página estiver aberta, inclusive ao navegar pelo ATMOS.

### Modo generativo

No modo local, a pergunta permanece no navegador. Quando há um backend configurado, marque **Usar IA generativa** para enviar cada nova pergunta à OpenAI por meio do Worker. O envio inclui a cidade, o fuso, as condições atuais, até 24 amostras horárias, até sete datas de previsão e, quando disponíveis, avisos do ATMOS, qualidade do ar e recomendações do Planejador. O aplicativo não inclui coordenadas, identificadores do usuário ou mensagens anteriores. Evite incluir informações pessoais no texto da pergunta.

As respostas são geradas com o contexto recebido. Uma previsão representa condições esperadas, e as condições atuais da Open-Meteo são estimativas de modelo. A previsão pode mudar. Os avisos do ATMOS são calculados com base na previsão e os alertas oficiais devem ser consultados nos canais da Defesa Civil. Quando o serviço generativo falha ou demora demais, o chat identifica a resposta local.

### Análises do assistente

- **Resumo das próximas 24 horas** usa as horas disponíveis para mostrar a faixa de temperatura, as mudanças significativas, os horários de maior chance de chuva, vento, umidade e UV. A qualidade do ar aparece como estimativa recente quando já foi consultada.
- **Atividades** usam a janela validada pelo Planejador. A resposta mostra a faixa de horário selecionada, os limites respeitados e as leituras disponíveis. Para usar outra faixa, ajuste a preferência no Planejador.
- **Evolução da previsão** compara as consultas guardadas para uma única cidade e data-alvo. É possível indicar a data como AAAA-MM-DD. **Compare as duas cidades selecionadas** usa as cidades já carregadas em **Comparar**. As diferenças das condições atuais exigem o mesmo instante, e as diferenças diárias exigem a mesma data local.
- **Incerteza** explica a diferença entre chance de chuva e dispersão de cenários. Ao pedir explicitamente pelo **conjunto de previsões**, o navegador pode consultar a temperatura do conjunto GEFS da Open-Meteo para a cidade identificada. Quando há pelo menos dois membros válidos no mesmo horário, o assistente mostra a maior faixa encontrada nas próximas 24 horas e o número de membros com leitura. Essa faixa descreve os cenários retornados. [API de conjuntos da Open-Meteo](https://open-meteo.com/en/docs/ensemble-api)

As análises são calculadas no navegador mesmo com o modo generativo ativado. A conversa guarda até 12 trocas. **Limpar conversa** apaga essas mensagens e preserva os registros meteorológicos.

### Publicação do Worker

1. Em `backend/wrangler.toml`, ajuste `ATMOS_ALLOWED_ORIGIN` para a origem HTTPS exata do GitHub Pages ou do domínio personalizado, sem o caminho do projeto nem barra final. Ajuste `OPENAI_MODEL` se for usar outro modelo compatível com a Responses API. O padrão é `gpt-4.1-mini`.
2. Em `backend/`, autentique o Wrangler e publique o Worker com os comandos abaixo. Use Wrangler 4.36 ou mais recente. Insira a chave apenas quando o último comando solicitar. Para desenvolvimento local do Worker, copie `backend/.dev.vars.example` para `backend/.dev.vars` e preencha o valor ali. O arquivo fica fora do Git. [Segredos no Cloudflare Workers](https://developers.cloudflare.com/workers/configuration/secrets/)

   ```sh
   npx wrangler login
   npx wrangler deploy
   npx wrangler secret put OPENAI_API_KEY
   ```

3. Em `assistant-config.js`, informe somente a URL pública HTTPS do Worker com o caminho `/api/assistente`. Publique o frontend no GitHub Pages como de costume. Com a URL vazia, o chat permanece no modo local.

O Worker valida a origem, o método, o tipo de conteúdo e os campos da requisição. O corpo tem limite de 12 KiB, a chamada à Responses API tem prazo de 9 segundos e a geração tem limite de 420 tokens. A requisição usa `store: false` e o cliente recebe apenas o texto ou uma mensagem genérica de erro. [Referência da Responses API](https://developers.openai.com/api/reference/resources/responses/methods/create)

Os limites do Worker são de cinco requisições por IP e 30 para o serviço, por minuto e por região da Cloudflare. São limites aproximados. A origem CORS restringe o uso por páginas web, enquanto os limites por IP e serviço reduzem abuso do endpoint público. Monitore o consumo do projeto OpenAI e configure alertas de orçamento antes de habilitar o acesso público. [Limites do Cloudflare Workers](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)

**Custos.** A OpenAI cobra pelos tokens de entrada e saída. Como referência, a tabela oficial do `gpt-4.1-mini` lista US$ 0,40 por milhão de tokens de entrada e US$ 1,60 por milhão de saída. Uma pergunta com 2.000 tokens de entrada e 300 de saída custaria cerca de US$ 0,00128, antes de eventuais custos de hospedagem. Confira os preços vigentes antes de publicar. [Preços do modelo](https://developers.openai.com/api/docs/models/gpt-4.1-mini)

## Como usar

1. Sirva a raiz do projeto com o Live Server no VS Code. Se você já usa Python, também pode executar `python -m http.server 8000` na raiz e abrir `http://localhost:8000/` no navegador.
2. Digite o nome de uma cidade e escolha uma sugestão, pressione Enter ou clique na lupa. O painel abre em Denver na primeira visita. Depois, abre na cidade padrão escolhida nas configurações ou na última cidade selecionada com sucesso.
3. Para consultar as condições no seu local, use **Minha localização** e permita o acesso no navegador. Esse recurso requer HTTPS ou um servidor local, como o Live Server.
4. Use **Atualizar dados** para refazer a última consulta bem-sucedida. Na primeira visita, o tema acompanha a preferência do sistema. Ao alternar entre claro e escuro, o navegador guarda sua escolha para as próximas visitas.

## Instalar o ATMOS

- **Android.** Abra a URL HTTPS publicada no Chrome. Em **Configurações → Instalação do aplicativo**, toque em **Instalar ATMOS** quando a opção aparecer. Também é possível abrir o menu **⋮** do navegador e escolher **Instalar app** ou **Adicionar à tela inicial → Instalar**, conforme a versão. Abra o ATMOS pelo ícone na tela inicial. [Instalação no Chrome para Android](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=pt-BR)
- **Windows.** No Chrome ou no Edge, use **Instalar ATMOS** nas configurações do site ou o ícone de instalação na barra de endereços. No Edge, também é possível usar **⋯ → Mais ferramentas → Aplicativos → Instalar este site como aplicativo**. Abra o ATMOS pelo menu Iniciar ou por `edge://apps`, se a instalação foi feita no Edge. [Instalação no Microsoft Edge](https://support.microsoft.com/en-US/edge/install-manage-or-uninstall-apps-in-microsoft-edge)
- **iPhone ou iPad.** Abra a URL no Safari. Em **Compartilhar**, escolha **Adicionar à Tela de Início**, ative **Abrir como App da Web** quando disponível e toque em **Adicionar**. Outros navegadores no iOS podem oferecer a mesma ação no menu de compartilhamento. Se a ação faltar, abra a página no Safari. [Instalação no Safari](https://support.apple.com/pt-br/guide/iphone/iphea86e5236/ios)

O aplicativo abre em janela própria quando a plataforma oferece o modo autônomo. O manifesto, os ícones e o service worker usam caminhos relativos à pasta do site.

Em telas pequenas, o cabeçalho mostra a página ativa e o botão **Páginas** dá acesso à navegação. Use Tab para percorrer os links e Escape para fechar o menu. Em telas maiores, a barra lateral permanece ao lado do conteúdo. O layout respeita as áreas seguras do dispositivo nas orientações vertical e horizontal.

Na linha do tempo, deslize para ver mais horários ou use as setas do teclado. Nos gráficos, toque ou arraste horizontalmente sobre o gráfico para consultar as leituras. O controle deslizante também funciona pelo teclado.

### Uso sem conexão

Na primeira visita com conexão, o service worker guarda os arquivos locais da interface. Depois disso, o painel e a navegação podem abrir sem rede enquanto o navegador mantiver esses arquivos. Favoritos, preferências e histórico de previsões continuam disponíveis no navegador.

O ATMOS guarda uma única previsão normalizada, da última cidade identificada por uma consulta bem-sucedida. A cópia local de até 96 KiB é utilizável por 48 horas, quando corresponde à cidade solicitada. O painel mostra o horário original da consulta e identifica as condições salvas. Avisos e recomendações de atividades ficam suspensos até uma nova consulta. O recurso exclui coordenadas de geolocalização do usuário e guarda apenas os dados públicos da cidade necessários para consultá-la novamente. [Termos da Open-Meteo](https://open-meteo.com/en/terms)

Quando voltar a conexão, use **Tentar atualizar a previsão**. O indicador do navegador informa o estado da conexão, enquanto a resposta da API confirma se o serviço está disponível. Novas consultas, mapas, qualidade do ar e o modo generativo precisam de conexão. O service worker guarda somente os arquivos locais listados e deixa as requisições externas seguirem as regras normais do navegador e dos provedores. [Política de mosaicos do OpenStreetMap](https://operations.osmfoundation.org/policies/tiles/)

### Atualizações do aplicativo

Quando todos os arquivos de uma nova versão estiverem prontos, o ATMOS mostra **Atualizar aplicativo**. A página aberta só é recarregada após a confirmação. A atualização preserva as preferências, os favoritos, a previsão salva e o histórico local.

Ao publicar alterações nos arquivos que compõem a interface, incremente `SHELL_VERSION` em `service-worker.js` e mantenha a lista de arquivos locais sincronizada com o HTML. A ativação remove os caches de versões anteriores do mesmo subdiretório.

### Solução de problemas

- **A opção de instalação está ausente.** Abra a URL HTTPS em uma aba comum e verifique o menu do navegador. O botão do ATMOS depende do prompt oferecido pelo navegador e fica oculto no modo autônomo. No iPhone ou iPad, use o menu de compartilhamento. [Critérios de instalação do Chrome](https://web.dev/articles/install-criteria)
- **O aplicativo não abre sem conexão.** Abra-o uma vez com internet e aguarde o carregamento da interface. O navegador pode remover arquivos guardados por falta de espaço ou limpeza dos dados do site. Se a interface abrir sem previsão, reconecte e consulte a cidade desejada.
- **A atualização não aparece.** Abra a URL publicada com internet e confira se a publicação terminou em **Actions**. No Chrome ou Edge, **Ferramentas do desenvolvedor → Aplicativo → Service Workers** mostra o escopo e o estado do worker. Se a instalação falhou, verifique a resposta de cada arquivo da lista de pré-cache e confirme que `SHELL_VERSION` foi incrementado. [Ciclo de vida do service worker](https://developer.chrome.com/docs/workbox/service-worker-lifecycle)
- **O navegador mostra conexão, mas os dados falham.** Use **Tentar atualizar a previsão**. O painel exibe os dados salvos quando disponíveis. O mapa, a qualidade do ar e o modo generativo dependem dos respectivos serviços.

## Publicação no GitHub Pages

1. Confirme que `origin` aponta para o fork que receberá o site e envie a branch `entrega-atmos` com os comandos abaixo. A publicação estática usa a raiz da branch e dispensa compilação.
2. No repositório do GitHub, abra **Settings** (Configurações) → **Pages**. Em **Build and deployment** (Compilação e publicação), selecione **Deploy from a branch** (Publicar de uma branch).
3. Escolha a branch `entrega-atmos` e a pasta `/(root)`. Salve. O `index.html` fica na raiz, junto dos arquivos estáticos, com caminhos relativos que funcionam no subdiretório do repositório.
4. Acompanhe a execução em **Actions** (Ações) e abra a URL HTTPS que aparecer em **Pages**, com o subdiretório do projeto e a barra final. Ative **Enforce HTTPS** (Exigir HTTPS) se a opção estiver disponível.
5. Na URL publicada, consulte Recife e confira no painel **Aplicativo** do Chrome ou Edge se o manifesto e o service worker têm o mesmo subdiretório. Abra a versão instalada, verifique o ícone e repita a abertura sem conexão depois da primeira consulta. O backend generativo é opcional e sua publicação segue as instruções da seção ATMOS AI.

[Guia oficial do GitHub Pages](https://docs.github.com/pt/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

### Commit e envio ao fork

```powershell
git status --short
git remote -v
git switch entrega-atmos
git add -- .gitignore .nojekyll LICENSE README.md MELHORIAS.md ROTEIRO.md index.html style.css manifest.webmanifest ':(top,glob)*.js' icons/ backend/.dev.vars.example backend/worker.mjs backend/wrangler.toml tests/configuracoes.html tests/configuracoes.js tests/revisao.js tests/simulacao.js tests/testar_configuracoes.py
git diff --cached --stat
git diff --cached --check
```

Depois de revisar os arquivos preparados, faça o commit e envie a branch.

```powershell
git commit -m "Valida e prepara o PWA do ATMOS para publicação"
if ($LASTEXITCODE -ne 0) { throw "Revise a falha do commit antes de enviar a branch." }
git push -u origin entrega-atmos
```

Revise os arquivos preparados antes do commit. Se a branch `entrega-atmos` ainda não existir no seu clone, use `git switch -c entrega-atmos`. Se o envio for rejeitado por divergência, integre as alterações remotas antes de publicar. Para publicar pela `main`, integre a branch de entrega e selecione `main` no Pages.

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
- O teste de navegação verifica as dez páginas, os controles globais, a barra lateral durante a rolagem, o menu em telas baixas, a persistência da cidade e os botões **Voltar** e **Avançar**.
- O teste do ATMOS AI verifica o atalho, o envio de perguntas, os estados da interface, as respostas com dados disponíveis ou ausentes e o uso do cache de qualidade do ar. Também confere foco, rótulos e largura do chat nos dois temas.
- O teste generativo executa o Worker e o chat com um provedor simulado e sem credenciais reais, incluindo restrição de origem, validação, limites, prazos e retorno ao modo local.
- O teste de contexto verifica as unidades dos gráficos, a leitura acessível por horário, os detalhes expansíveis, as faixas de UV e IQA, os horários solares e o comportamento com dados ausentes.
- Os testes das cinco etapas cobrem cartões recolhidos e os dois temas, sincronização da linha do tempo com o gráfico, virada do dia e horário de verão, sugestões e avisos sem conflito, limites de intensidade e expiração, além das preferências e janelas de até 72 horas do Planejador.
- A suíte simulada também verifica a classificação por atividade e data local, a indicação de dados ausentes, a persistência da ordem e do recolhimento dos painéis, o foco após mover um cartão e a restauração do layout em uma tela de 320 px.
- Execute `python tests/testar_configuracoes.py --servicos-reais` para verificar previsão, geocodificação e qualidade do ar da Open-Meteo, além do Leaflet e dos mosaicos do OpenStreetMap. O teste precisa de acesso à internet.
- A suíte com serviços reais também verifica as interações do Leaflet e a recuperação de 403, 429 e perda de conexão com mosaicos simulados para os testes de arrasto, zoom e falhas.
- As duas suítes servem o projeto em um subdiretório local para verificar os caminhos relativos usados no GitHub Pages.
- Para executar a regressão no Edge no Windows, aponte `ATMOS_CHROME` para o executável antes de chamar o mesmo teste.

  ```powershell
  $env:ATMOS_CHROME = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
  python tests/testar_configuracoes.py
  Remove-Item Env:ATMOS_CHROME
  ```

- Os testes de PWA verificam o escopo, os ícones, o modo autônomo simulado, a abertura com o servidor indisponível, a reconexão e a troca de versões. O service worker é executado pelo navegador e as tentativas de atualização com uma versão repetida ou um arquivo ausente devem preservar a versão em uso.

### Verificação manual após publicar

1. Abra a URL HTTPS indicada pelo Pages em um dispositivo Android, em um iPhone ou iPad e no Windows. Instale pelo navegador e inicie pelo ícone do sistema. Confirme que a abertura aponta para a raiz do subdiretório e usa janela própria quando suportado.
2. Em cada dispositivo, faça uma consulta, feche o aplicativo, desconecte a rede e abra pelo ícone. Confira a navegação e o horário da previsão salva. Reconecte e toque em **Tentar atualizar a previsão**.
3. Confira o menu, os formulários, a linha do tempo e os gráficos por toque e teclado e alterne entre temas e orientações. Verifique geolocalização com a permissão concedida e negada.
4. Em uma próxima publicação, deixe o aplicativo aberto antes do envio. Depois que a atualização aparecer, confirme que o app espera o clique em **Atualizar aplicativo** e que favoritos, histórico e preferências continuam acessíveis.
- Confira também a URL pública em HTTPS após a publicação no Pages.

## Lista de conferência da entrega

- [ ] Revisar a seleção de arquivos do commit e enviar a branch ao fork.
- [ ] Configurar o Pages e confirmar que a URL HTTPS publicada abre em uma janela anônima.
- [ ] Na URL publicada, buscar Recife e conferir previsão, favoritos, temas e comparação em computador e celular.
- [ ] Gravar a demonstração do site publicado em até cinco minutos e conferir se o vídeo e seu link estão acessíveis.
- [ ] Enviar os links do repositório, do site e do vídeo no local indicado pela escola.
