function setWeatherExplanation(button, expanded) {
  if (button.getAttribute("aria-expanded") === String(expanded)) return;
  const panel = document.getElementById(button.getAttribute("aria-controls"));
  const previousLabel = button.textContent;
  const label = expanded ? "Ocultar detalhes" : "Saiba mais";
  button.textContent = label;
  button.setAttribute("aria-label", label + button.getAttribute("aria-label").slice(previousLabel.length));
  button.setAttribute("aria-expanded", String(expanded));
  panel.inert = !expanded;
}

const saveDashboardLayout = (() => {
  const key = "atmos-layout-painel";
  const dashboard = document.querySelector(".dashboard.weather");
  const status = dashboard.querySelector(".dashboard-layout-status");
  const panels = [...dashboard.querySelectorAll(".dashboard-optional")];
  const explanations = [...dashboard.querySelectorAll(".explanation-toggle")];
  const grids = [...dashboard.querySelectorAll(".metric-grid")].map((grid) => ({
    grid,
    cards: new Map([...grid.children].map((card) => [card.querySelector(".explanation-panel").id, card])),
  }));
  let stored;
  try {
    stored = JSON.parse(localStorage.getItem(key));
  } catch {
    stored = undefined;
  }
  const order = Array.isArray(stored?.order) ? stored.order : [];
  const collapsed = new Set(Array.isArray(stored?.collapsed) ? stored.collapsed : []);
  const expanded = new Set(Array.isArray(stored?.expanded) ? stored.expanded : []);
  let lastSaved;

  function applyOrder(grid, cards, ids) {
    let reference = grid.firstElementChild;
    for (const id of new Set([...ids, ...cards.keys()])) {
      const card = cards.get(id);
      if (!card) continue;
      if (card !== reference) grid.insertBefore(card, reference);
      reference = card.nextElementSibling;
    }
  }

  function updateControls(grid) {
    for (const card of grid.children) {
      for (const [step, disabled] of [[-1, !card.previousElementSibling], [1, !card.nextElementSibling]]) {
        const button = card.querySelector('[data-move="' + step + '"]');
        if (button.getAttribute("aria-disabled") !== String(disabled)) button.setAttribute("aria-disabled", String(disabled));
      }
    }
  }

  function serializeLayout() {
    return JSON.stringify({
      order: grids.flatMap(({ grid }) => [...grid.children].map((card) => card.querySelector(".explanation-panel").id)),
      collapsed: panels.filter((panel) => !panel.open).map((panel) => panel.id),
      expanded: explanations.filter((button) => button.getAttribute("aria-expanded") === "true")
        .map((button) => button.getAttribute("aria-controls")),
    });
  }

  function saveLayout() {
    const layout = serializeLayout();
    if (layout === lastSaved) return true;
    try {
      localStorage.setItem(key, layout);
      lastSaved = layout;
      return true;
    } catch {
      return false;
    }
  }

  for (const { grid, cards } of grids) {
    applyOrder(grid, cards, order);
    for (const card of cards.values()) {
      const name = [...card.querySelector("dt").childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join("").trim();
      const controls = document.createElement("dd");
      controls.className = "dashboard-move";
      for (const [step, label, icon] of [[-1, "Mover para cima", "↑"], [1, "Mover para baixo", "↓"]]) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "control";
        button.dataset.move = step;
        button.textContent = icon;
        button.title = label;
        button.setAttribute("aria-label", label + " · " + name);
        button.addEventListener("click", () => {
          if (button.getAttribute("aria-disabled") === "true") return;
          const reference = step < 0 ? card.previousElementSibling : card.nextElementSibling.nextElementSibling;
          grid.insertBefore(card, reference);
          button.focus();
          updateControls(grid);
          const position = [...grid.children].indexOf(card) + 1;
          status.textContent = name + " na posição " + position + " de " + cards.size + "." +
            (saveLayout() ? "" : " Alteração aplicada nesta visita.");
        });
        controls.append(button);
      }
      card.append(controls);
    }
    updateControls(grid);
  }

  for (const panel of panels) {
    panel.open = !collapsed.has(panel.id);
    panel.addEventListener("toggle", saveLayout);
  }
  for (const button of explanations) {
    setWeatherExplanation(button, expanded.has(button.getAttribute("aria-controls")));
  }
  lastSaved = serializeLayout();

  dashboard.querySelector(".dashboard-reset").addEventListener("click", () => {
    for (const { grid, cards } of grids) {
      applyOrder(grid, cards, []);
      updateControls(grid);
    }
    for (const panel of panels) panel.open = true;
    for (const button of explanations) setWeatherExplanation(button, false);
    status.textContent = "Layout padrão restaurado." + (saveLayout() ? "" : " Alteração aplicada nesta visita.");
  });
  return saveLayout;
})();
