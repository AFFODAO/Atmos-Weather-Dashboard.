if (window.isSecureContext && "serviceWorker" in navigator) {
  const workerUrl = new URL("./service-worker.js", document.currentScript.src);
  navigator.serviceWorker.register(workerUrl, { updateViaCache: "none" }).then((registration) => {
    const notice = document.querySelector(".pwa-update");
    const button = notice.querySelector("button");
    const status = notice.querySelector("[role=status]");
    let reloadRequested = false;
    let activationTimer;
    let lastUpdateCheck = -Infinity;
    let updateCheck;
    function showUpdate() {
      if (!registration.waiting || !navigator.serviceWorker.controller) return;
      notice.hidden = false;
    }
    function watchInstalling() {
      const installing = registration.installing;
      installing?.addEventListener("statechange", () => {
        if (installing.state === "installed") showUpdate();
      });
    }
    registration.addEventListener("updatefound", watchInstalling);
    watchInstalling();
    showUpdate();
    button.addEventListener("click", () => {
      const waiting = registration.waiting;
      if (!waiting || reloadRequested) return;
      reloadRequested = true;
      button.disabled = true;
      status.textContent = "Aplicando a atualização…";
      try {
        waiting.postMessage({ type: "ATUALIZAR_ATMOS" });
      } catch {
        reloadRequested = false;
        button.disabled = false;
        status.textContent = "Não foi possível iniciar a atualização. Tente novamente.";
        return;
      }
      activationTimer = setTimeout(() => {
        reloadRequested = false;
        button.disabled = false;
        status.textContent = "A atualização está demorando. Tente novamente ou reabra o aplicativo.";
      }, 15000);
    });
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloadRequested) {
        reloadRequested = false;
        clearTimeout(activationTimer);
        window.location.reload();
      } else if (!notice.hidden) {
        notice.hidden = true;
      }
    });
    window.addEventListener("online", () => {
      const now = Date.now();
      if (updateCheck || now - lastUpdateCheck < 60000) return;
      lastUpdateCheck = now;
      updateCheck = registration.update().catch(() => {}).finally(() => { updateCheck = undefined; });
    });
  }).catch(() => {
    // A página continua disponível no navegador se o registro falhar.
  });
}

{
  const section = document.querySelector(".pwa-install");
  const button = section.querySelector(".pwa-install-button");
  const manual = section.querySelector("details");
  const status = section.querySelector("[role=status]");
  const standalone = matchMedia("(display-mode: standalone)");
  let promptEvent;
  let installed = false;

  function renderInstall() {
    section.hidden = !window.isSecureContext || installed || standalone.matches || navigator.standalone === true;
    button.hidden = !promptEvent;
    manual.hidden = Boolean(promptEvent);
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    promptEvent = event;
    status.textContent = "";
    renderInstall();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    promptEvent = undefined;
    renderInstall();
  });
  standalone.addEventListener?.("change", renderInstall);

  button.addEventListener("click", async () => {
    if (!promptEvent || button.disabled) return;
    const event = promptEvent;
    promptEvent = undefined;
    const hadFocus = document.activeElement === button;
    button.disabled = true;
    try {
      await event.prompt();
      const choice = await event.userChoice;
      if (choice?.outcome === "accepted") installed = true;
      if (!installed) status.textContent = "Você pode tentar novamente pelo menu do navegador.";
    } catch {
      status.textContent = "O navegador não abriu a instalação. Consulte as instruções abaixo.";
    } finally {
      button.disabled = false;
      renderInstall();
      if (hadFocus && button.hidden && !section.closest("[data-page]").hidden) {
        if (section.hidden) section.closest("[data-page]").focus();
        else manual.querySelector("summary").focus();
      }
    }
  });
  renderInstall();
}
