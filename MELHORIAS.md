# Melhorias do ATMOS Weather Dashboard

A comparação usa a versão original de Jonah Lawrence (DenverCoder1) preservada no histórico deste repositório, no commit `602e3b4`. A implementação atual foi conferida no código e exercitada pela suíte de navegador. [Projeto original](https://github.com/DenverCoder1/weather-app-tutorial) · [Testes de navegador](tests/testar_configuracoes.py)

## 1. Melhoria funcional — previsão ampliada

- **Como era.** Uma consulta à OpenWeatherMap exibia a condição atual, a temperatura, a umidade e o vento de uma cidade.
- **O que mudou.** A Open-Meteo fornece condições atuais, até 24 horas de previsão horária e até sete dias de previsão diária. O usuário pode selecionar um dia no painel ou no calendário para abrir o resumo e os gráficos daquele período.
- **Por quê.** O tempo atual responde à consulta imediata. Uma sequência de horas e dias ajuda a decidir quando sair ou programar uma atividade.
- **Benefício.** É possível verificar máximas, mínimas e chance de precipitação no fuso da cidade. A interface limita o calendário às datas disponíveis na resposta.
- **Arquivos.** [Interface](index.html) · [Painel](script.js) · [Dados meteorológicos](weather-data.js) · [Gráficos](charts.js)

## 2. Melhoria funcional — favoritos e histórico persistentes

- **Como era.** A cidade era consultada por nome e o painel voltava a Denver a cada carregamento.
- **O que mudou.** O coração salva ou remove favoritos. O navegador guarda as dez buscas mais recentes e a última cidade selecionada com sucesso. As listas usam o identificador da geocodificação para evitar duplicatas e diferenciar cidades homônimas.
- **Por quê.** Quem consulta as mesmas cidades com frequência precisava digitar os nomes de novo.
- **Benefício.** O usuário pode reabrir uma previsão com poucos cliques e reencontrar as listas depois de recarregar a página no mesmo navegador.
- **Arquivos.** [Busca e armazenamento](cities.js) · [Painel](script.js) · [Interface](index.html)

## 3. Melhoria visual — redesenho do painel

- **Como era.** Um único cartão central agrupava busca e condições atuais, sobre um fundo fotográfico.
- **O que mudou.** O ATMOS organiza o conteúdo em uma barra lateral e cartões de condições atuais, métricas e previsão. A tipografia Manrope e a hierarquia de tamanhos dão destaque à leitura principal. A primeira consulta mostra uma estrutura de carregamento.
- **Por quê.** Com mais informações, a interface precisava deixar claro onde consultar o tempo atual, os detalhes e as outras seções.
- **Benefício.** A temperatura fica fácil de localizar e as métricas e ferramentas relacionadas têm destinos previsíveis.
- **Arquivos.** [Interface](index.html) · [Estilos](style.css) · [Painel](script.js)

## 4. Melhoria visual — temas claro e escuro em telas responsivas

- **Como era.** O cartão tinha largura máxima de 420 px e aparência escura fixa.
- **O que mudou.** A composição se reorganiza em telas estreitas e o menu lateral pode ser recolhido. O tema acompanha o sistema por padrão. A escolha manual entre claro e escuro é salva no navegador.
- **Por quê.** Computadores e celulares oferecem espaços diferentes, e a preferência de leitura pode variar ao longo do dia.
- **Benefício.** O usuário acessa os mesmos controles em telas estreitas e mantém sua preferência visual entre visitas.
- **Arquivos.** [Estilos](style.css) · [Tema](theme.js) · [Interface](index.html) · [Configurações e navegação](script.js)

## 5. Novo recurso — comparação de duas cidades

- **Como era.** Uma nova busca substituía na tela as informações da cidade anterior.
- **O que mudou.** A seção **Comparar** permite buscar duas cidades de forma independente, trocar suas posições e consultar os cartões e o gráfico comparativo. O gráfico alinha os horários locais. As diferenças atuais exigem o mesmo instante, e os resumos diários exigem a mesma data local de referência.
- **Por quê.** Alternar repetidamente entre buscas obrigava o usuário a memorizar valores e dificultava perceber diferenças de fuso.
- **Benefício.** É possível comparar condições de dois destinos e interpretar os valores com a indicação da data e do horário de cada cidade.
- **Arquivos.** [Comparação](compare.js) · [Gráficos](charts.js) · [Interface](index.html) · [Estilos](style.css)

## Cinco etapas de integração

| Recurso | Finalidade e benefício | Implementação e limites |
| --- | --- | --- |
| Cartões compactos | Facilitar a leitura das métricas de hoje e da qualidade do ar sem ocupar espaço com explicações longas. | Os controles **Saiba mais** e **Ocultar detalhes** expandem cada cartão de forma independente. Leituras, unidades e classificações ficam visíveis. A grade se adapta à largura, e as animações respeitam movimento reduzido. Campos ausentes aparecem como **Indisponível**. |
| Linha do tempo | Comparar rapidamente as próximas horas e consultar as condições de uma hora específica. | A seleção usa timestamps da Open-Meteo e atualiza o detalhe e o gráfico existente. A faixa aceita toque, clique e teclado. O rótulo usa o fuso da cidade e diferencia horários repetidos. A faixa padrão cobre até 24 horas e depende das amostras disponíveis. |
| ATMOS Insights | Transformar a previsão em sugestões práticas, como levar guarda-chuva ou procurar um horário mais favorável para um passeio. | Regras determinísticas analisam chuva, UV, vento, variação térmica e condições favoráveis. O botão **Ver horário** abre a amostra de referência. Períodos favoráveis respeitam rajadas e chuva intensa conhecidas. A cobertura disponível limita as sugestões. |
| Central de avisos | Reunir as condições previstas que merecem atenção em um único lugar. | O sino conta períodos de vento ou rajadas, chuva intensa, calor, UV alto e trovoadas. Os cartões agrupam horas consecutivas e mostram data local, motivo, nível, fonte e hora da consulta. Os critérios são do ATMOS e a Defesa Civil é a referência para alertas oficiais. |
| Planejador | Comparar horários para cinco atividades de acordo com as preferências do usuário. | Avalia até 72 horas e seleciona a melhor janela por data local com a mesma previsão da linha do tempo. As preferências são validadas e salvas no navegador. Temperatura e chance de chuva são obrigatórias, e dados opcionais ausentes reduzem a pontuação. |

Os limites e as instruções de uso estão reunidos no [README](README.md). As funcionalidades aproveitam a previsão já carregada quando a cidade continua a mesma.

## Recomendações diárias e personalização do painel

- **Recomendações diárias.** O Planejador agrupa **Hoje**, **Amanhã** e **Próximos dias** no fuso da cidade. Cada data mostra a janela mais adequada à atividade ou explica se os dados são insuficientes ou se as janelas avaliadas ficaram fora dos critérios.
- **Pontuação detalhada.** Cada recomendação tem uma explicação expansível com os pontos de temperatura, chance de chuva, vento, rajadas, UV, condição do céu e horário, além do desconto por espera. O detalhamento indica em quantas horas cada leitura opcional ficou indisponível.
- **Layout do painel.** Os cartões de métricas podem mudar de ordem dentro de seus grupos com botões acessíveis por teclado e toque. A previsão semanal e as sugestões podem ser recolhidas e reabertas. O navegador salva as preferências, e o botão **Restaurar layout padrão** recupera a ordem inicial e reabre os painéis.

## ATMOS 2.0 — Etapa 2 · Pontuação de atividades

- A barra compacta mostra a mesma nota de 0 a 100 que aparece no rótulo. **Entenda a pontuação** detalha os pesos da atividade, os pontos por critério, o horário, o desconto pela cobertura incompleta e o desconto pela espera.
- As leituras disponíveis são avaliadas ao longo da janela completa. Leituras ausentes aparecem como **Indisponível** e têm um desconto próprio. O UV fica fora da nota nas horas sem luz, e os filtros de horário da Etapa 1 continuam valendo.

## ATMOS 2.0 — Etapa 3 · Personalização e organização do painel

- A visão geral dá destaque às leituras e separa condições atuais, métricas, previsão horária, previsão de hoje, previsão semanal e sugestões. Títulos, espaçamentos e controles de recolhimento seguem a mesma hierarquia nos dois temas.
- **Personalizar painel** fica junto das métricas. As setas movem os cartões dentro do grupo e mantêm o foco no controle usado. O navegador restaura a ordem, os painéis recolhidos e as explicações abertas. Preferências inválidas são ignoradas.
- **Restaurar layout padrão** devolve os cartões às posições iniciais, reabre os painéis opcionais e recolhe as explicações. As alterações de layout reutilizam os dados em tela.

## ATMOS 2.0 — Etapa 4 · Evolução das previsões

- **Gráficos** ganhou filtros por cidade e data-alvo para acompanhar as previsões registradas no próprio navegador. O resumo mostra a primeira e a última previsão guardadas, e o gráfico permite consultar os valores intermediários no horário local.
- O histórico reutiliza a previsão já recebida. Registros consecutivos idênticos são ignorados, com intervalo mínimo de três horas por cidade e data-alvo. O limite é de 500 registros e a retenção é de 30 dias. O formato é versionado e há um controle de exclusão.
- A seção identifica leituras ausentes e informa quando há apenas um registro. A série começa com as previsões guardadas após a implantação do recurso e representa a evolução do modelo.

## ATMOS AI — Etapa 1 · Assistente local

- Página de conversa com histórico da visita, perguntas sugeridas, estados de análise e erro e acesso pela barra lateral e pelo Painel.
- As respostas são geradas no navegador com os dados da cidade selecionada, as preferências do Planejador e a estimativa recente de qualidade do ar já consultada. Quando faltam dados, o chat informa a indisponibilidade.

## ATMOS AI — Etapa 2 · Modo generativo

- O chat oferece uma opção de envio explícito das perguntas e de um resumo meteorológico ao Worker HTTPS. A Responses API recebe o contexto da cidade selecionada e instruções para responder em português brasileiro com os dados fornecidos.
- O segredo é lido de `OPENAI_API_KEY` no Worker. O endpoint valida os dados, limita requisições, tempo e tamanho da resposta. A interface usa a resposta local se o serviço estiver indisponível.

## ATMOS AI — Etapa 3 · Análise meteorológica

- O chat calcula resumos horários, explica janelas validadas pelo Planejador e compara registros salvos e cidades já carregadas. Os resultados usam referências de data e horário das fontes do ATMOS.
- A dispersão de temperatura só aparece quando a consulta explícita ao conjunto GEFS retorna membros válidos. O chat trata falhas de consulta e descarta respostas pendentes ao mudar os dados da cidade.
- As perguntas rápidas acompanham os dados disponíveis. A conversa tem limite de 12 trocas e um controle para limpeza.
