
# 🌦️ ATMOS Weather Dashboard

### Plataforma Inteligente de Previsão do Tempo

<p align="center">
  <a href="https://affodao.github.io/Atmos-Weather-Dashboard./">
    <img src="icons/atmos-192.png" alt="Acessar ATMOS Weather Dashboard" width="140">
  </a>
</p>

<p align="center">
  <a href="https://affodao.github.io/Atmos-Weather-Dashboard./">
    <img src="https://img.shields.io/badge/ACESSAR%20O%20ATMOS-6C63FF?style=for-the-badge" alt="Acessar o ATMOS">
  </a>
</p>

<p align="center">
  <a href="https://affodao.github.io/Atmos-Weather-Dashboard./">
    🌐 Acessar aplicativo publicado
  </a>
</p>

O **ATMOS Weather Dashboard** é uma aplicação web meteorológica desenvolvida a partir da personalização de um projeto de código aberto disponível no GitHub.

O projeto foi aprimorado com auxílio do **Codex no Visual Studio Code**, transformando uma aplicação simples de consulta do clima em uma plataforma mais completa, interativa e personalizável.

O objetivo foi melhorar a experiência do usuário, ampliar as funcionalidades e facilitar a interpretação das informações meteorológicas.

## 📌 1. Sobre o projeto original

O projeto escolhido como base foi o **Simple Weather App Tutorial**, desenvolvido por **Jonah Lawrence (DenverCoder1)**.

**Repositório original:** https://github.com/DenverCoder1/weather-app-tutorial

A aplicação original utilizava a API OpenWeatherMap e apresentava informações básicas sobre as condições meteorológicas de uma cidade, como:

- Temperatura atual.
- Umidade relativa do ar.
- Velocidade do vento.
- Condição meteorológica.

Apesar de funcional, o projeto possuía uma interface simples e oferecia poucas ferramentas para analisar previsões futuras ou comparar informações.

Por isso, decidi personalizá-lo e ampliar suas funcionalidades.

O projeto original possui licença MIT, permitindo modificações e reutilização do código, desde que seus termos e créditos sejam preservados.

## 🎯 2. Objetivo da personalização

O principal objetivo foi transformar a aplicação original em um painel meteorológico moderno, capaz de apresentar informações detalhadas e ajudar o usuário a tomar decisões sobre suas atividades diárias.

Para isso, utilizei o Codex como ferramenta de apoio para analisar o código, implementar novas funcionalidades, corrigir problemas e melhorar a interface.

As alterações foram planejadas considerando funcionalidade, organização visual, usabilidade e experiência do usuário.

## 🚀 3. Principais modificações realizadas

### 3.1. Melhoria funcional — Previsão meteorológica ampliada

**Antes:** o aplicativo apresentava principalmente as condições meteorológicas atuais.

**Modificação:** implementei a integração com a API Open-Meteo, ampliando o acesso às informações climáticas.

O ATMOS passou a disponibilizar:

- Previsão meteorológica por hora.
- Previsão para até sete dias.
- Temperaturas máximas e mínimas.
- Probabilidade de chuva.
- Índice UV.
- Sensação térmica.
- Informações sobre vento, umidade e outras condições.

**Justificativa:** as informações atuais não eram suficientes para acompanhar mudanças no clima ou planejar atividades futuras.

**Benefício:** o usuário consegue consultar as condições previstas para diferentes períodos e organizar melhor sua rotina.

### 3.2. Melhoria funcional — Favoritos e histórico de cidades

**Antes:** era necessário pesquisar novamente uma cidade sempre que o usuário desejasse consultar suas condições meteorológicas.

**Modificação:** adicionei um sistema de cidades favoritas e histórico de pesquisas, utilizando armazenamento local do navegador.

**Justificativa:** facilitar o acesso às cidades consultadas com frequência.

**Benefício:** proporciona uma navegação mais rápida, prática e personalizada.

### 3.3. Melhoria visual — Redesenho completo da interface

**Antes:** a aplicação utilizava uma interface simples, com as informações concentradas em um único cartão.

**Modificação:** reorganizei o aplicativo em um dashboard com menu lateral, cartões meteorológicos, áreas específicas para cada funcionalidade e melhor distribuição das informações.

Também implementei explicações expansíveis, permitindo consultar detalhes sem deixar a tela excessivamente carregada.

**Justificativa:** a ampliação das funcionalidades exigiu uma organização visual mais eficiente.

**Benefício:** melhora a leitura dos dados, facilita a navegação e torna o aplicativo visualmente mais agradável.

### 3.4. Melhoria visual — Responsividade e temas personalizáveis

**Antes:** a aplicação tinha uma apresentação visual limitada e menos recursos de personalização.

**Modificação:** desenvolvi um layout responsivo, adaptado a diferentes tamanhos de tela, além de opções de tema claro e escuro.

**Justificativa:** permitir a utilização do aplicativo em computadores, tablets e celulares.

**Benefício:** melhora a acessibilidade, a organização e o conforto visual.

### 3.5. Nova funcionalidade — Comparação de cidades

**Antes:** não existia uma ferramenta para comparar diretamente as condições meteorológicas de diferentes cidades.

**Modificação:** implementei uma área que permite selecionar duas cidades e visualizar suas informações meteorológicas lado a lado, incluindo gráficos comparativos.

**Justificativa:** facilitar a análise das condições climáticas de diferentes localidades.

**Benefício:** permite identificar diferenças de temperatura e outras condições, auxiliando na organização de viagens e atividades.

## ✨ 4. Outras funcionalidades implementadas

Além das cinco modificações principais exigidas pela atividade, o ATMOS recebeu recursos adicionais.

### 📊 Gráficos e linha do tempo

Permitem acompanhar as variações meteorológicas ao longo das horas e visualizar informações específicas de cada período.

### 🗺️ Mapas interativos

Utilizam Leaflet e OpenStreetMap para permitir a navegação pelo mapa e a consulta de condições meteorológicas em diferentes locais.

### 🌫️ Qualidade do ar

Apresenta estimativas de qualidade do ar, incluindo índices de classificação e concentrações de partículas.

### 🔔 Central de avisos meteorológicos

Analisa as previsões e destaca condições que exigem atenção, como vento forte, chuva intensa, calor elevado e índice UV alto.

Os avisos são gerados por critérios do aplicativo e não substituem os alertas oficiais da Defesa Civil.

### 🧠 ATMOS Insights

Sistema de recomendações que interpreta informações meteorológicas e apresenta sugestões práticas para o usuário.

### 🚶 Planejador de atividades ao ar livre

Permite selecionar atividades como caminhada, corrida, ciclismo, passeio e lavagem de carro.

O sistema analisa as condições meteorológicas para identificar períodos mais adequados, considerando as preferências escolhidas pelo usuário.

As recomendações são organizadas por dia e apresentam pontuações explicativas.

### 🤖 ATMOS AI

Assistente meteorológico integrado ao aplicativo.

Oferece respostas sobre condições climáticas, previsões e planejamento de atividades utilizando informações disponíveis no ATMOS.

Possui um modo local baseado em regras e suporte opcional a respostas generativas por meio de um backend configurado separadamente.

### 📈 Evolução das previsões

Permite comparar previsões meteorológicas registradas anteriormente no navegador com consultas mais recentes para a mesma cidade e data.

O recurso ajuda a acompanhar como as estimativas mudaram com o tempo.

### 📱 Versão aplicativo — PWA

O ATMOS também foi adaptado para funcionar como um Progressive Web App (PWA).

Isso permite sua instalação em dispositivos e navegadores compatíveis, com uma interface adaptada ao uso em celulares.

O aplicativo possui recursos limitados de funcionamento offline. A obtenção de novas previsões meteorológicas continua dependendo de internet.

## 💻 5. Tecnologias utilizadas

| Tecnologia | Utilização |
|---|---|
| HTML5 | Estrutura das páginas |
| CSS3 | Estilização e responsividade |
| JavaScript | Funcionalidades e interatividade |
| Open-Meteo | Informações e previsões meteorológicas |
| Leaflet e OpenStreetMap | Mapas interativos |
| Canvas | Gráficos meteorológicos |
| localStorage | Preferências, favoritos e históricos |
| PWA e Service Worker | Instalação e recursos offline |
| Git e GitHub | Versionamento e armazenamento do projeto |
| Codex | Apoio ao desenvolvimento e correção do código |
| VS Code | Ambiente de desenvolvimento |

## 🛠️ 6. Desenvolvimento com Codex

O Codex foi utilizado durante o desenvolvimento para auxiliar nas seguintes atividades:

- Análise e compreensão da estrutura do projeto original.
- Implementação de novas funcionalidades.
- Reformulação da interface.
- Organização e manutenção do código.
- Identificação e correção de erros.
- Adaptação do aplicativo para diferentes dispositivos.
- Melhorias no desempenho e na experiência do usuário.

As modificações foram realizadas de maneira progressiva, procurando manter as funcionalidades existentes e evitar problemas de compatibilidade.

O uso do Codex também contribuiu para o aprendizado sobre programação web, integração com APIs, testes e versionamento de código.

## 🌐 7. Como executar o projeto

O ATMOS utiliza HTML, CSS e JavaScript, podendo ser executado diretamente em um navegador por meio de um servidor local.

**1. Clone o repositório:**

```bash
git clone https://github.com/AFFODAO/Atmos-Weather-Dashboard..git
```

**2. Entre na pasta do projeto:**

```bash
cd Atmos-Weather-Dashboard.
```

**3. Abra a pasta no Visual Studio Code.**

**4. Execute o arquivo `index.html` utilizando a extensão Live Server.**

**5.** Pesquise uma cidade e explore as funcionalidades disponíveis.

Alguns recursos, como consulta meteorológica, mapas e qualidade do ar, precisam de conexão com a internet.

O modo generativo do ATMOS AI exige configuração adicional do backend e de sua chave de API, que não deve ser publicada no código do site.

## 📱 8. Instalação como aplicativo

O ATMOS pode ser instalado como PWA em navegadores compatíveis.

**Android:** abra o site no Chrome e utilize a opção de instalação disponível no navegador.

**Windows:** abra a aplicação no Chrome ou Edge e utilize o recurso de instalar aplicativo.

**iPhone:** abra a aplicação no Safari e escolha a opção de adicionar à tela de início.

A disponibilidade dos recursos de instalação depende do navegador e do dispositivo.

## 📚 9. Aprendizados adquiridos

Durante o desenvolvimento, tive a oportunidade de trabalhar com tecnologias utilizadas na criação de aplicações web.

Os principais aprendizados envolveram análise de código existente, integração com APIs, desenvolvimento de interfaces responsivas, organização de informações, correção de problemas e utilização do GitHub.

Também aprendi a utilizar o Codex como ferramenta de apoio, compreendendo a importância de testar as modificações e avaliar se elas realmente melhoram a aplicação.

## 🔗 10. Links do trabalho

**Repositório da aplicação personalizada:**

https://github.com/AFFODAO/Atmos-Weather-Dashboard.

**Aplicação publicada:**

[🌐 Acessar ATMOS Weather Dashboard](https://affodao.github.io/Atmos-Weather-Dashboard./)

<p align="center">
  <a href="https://affodao.github.io/Atmos-Weather-Dashboard./">
    <img src="icons/atmos-192.png" width="100" alt="Clique para acessar o ATMOS">
  </a>
</p>

**Vídeo de apresentação — máximo de 5 minutos:**

[INSERIR LINK DO VÍDEO NO YOUTUBE OU GOOGLE DRIVE]

O vídeo deverá apresentar o projeto original, demonstrar as alterações realizadas, justificar as escolhas, explicar os benefícios e mostrar a aplicação publicada funcionando.

## 🏁 11. Conclusão

O desenvolvimento do ATMOS Weather Dashboard permitiu transformar uma aplicação simples de previsão do tempo em uma plataforma meteorológica mais completa e interativa.

As melhorias foram planejadas para facilitar o acesso às informações, modernizar a interface e oferecer ferramentas úteis para a rotina dos usuários.

O Codex contribuiu para o desenvolvimento e aprimoramento das funcionalidades, enquanto os testes e as correções ajudaram a melhorar os resultados.

O projeto demonstra como a personalização de um código existente pode gerar uma aplicação mais organizada, funcional e interessante.

## 📄 12. Créditos e licença

O ATMOS Weather Dashboard foi desenvolvido a partir do projeto **Simple Weather App Tutorial**, de Jonah Lawrence (DenverCoder1).

Projeto original: https://github.com/DenverCoder1/weather-app-tutorial

A licença MIT original e os avisos de direitos autorais foram preservados no arquivo `LICENSE`.

---

**Projeto desenvolvido para o Trabalho Prático — Personalização e Publicação de uma Aplicação Web com GitHub e Codex.**

**Curso:** Tecnologia da Informação (TI).
