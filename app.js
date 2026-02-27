(function () {
  // State
  let currentPersona = CONFIG.personas[0];
  let currentModelId = CONFIG.models[0].id;
  let compareMode = false;
  let compareModelId = null;
  let blindMode = false;
  let blindMapping = {}; // modelId -> "A"/"B"/...
  let infoCollapsed = true;
  let deviceMode = "desktop"; // "desktop" | "mobile"

  // DOM refs
  const sidebar = document.getElementById("sidebar");
  const modelTabs = document.getElementById("modelTabs");
  const iframe1 = document.getElementById("iframe1");
  const iframe2 = document.getElementById("iframe2");
  const iframeLabel1 = document.getElementById("iframeLabel1");
  const iframeLabel2 = document.getElementById("iframeLabel2");
  const iframeWrapper2 = document.getElementById("iframeWrapper2");
  const placeholder1 = document.getElementById("placeholder1");
  const placeholder2 = document.getElementById("placeholder2");
  const promptText = document.getElementById("promptText");
  const focusList = document.getElementById("focusList");
  const blindToggle = document.getElementById("blindMode");
  const toggleCompare = document.getElementById("toggleCompare");
  const infoBar = document.getElementById("infoBar");
  const infoToggle = document.getElementById("infoToggle");
  const iframeArea = document.getElementById("iframeArea");
  const deviceToggle = document.getElementById("deviceToggle");

  // Initialize
  function init() {
    renderSidebar();
    renderModelTabs();
    updateContent();
    bindEvents();
    // Default collapsed
    infoBar.classList.add("collapsed");
  }

  // Sidebar
  function renderSidebar() {
    sidebar.innerHTML = CONFIG.personas
      .map(
        (p) => `
      <div class="sidebar-item ${p.id === currentPersona.id ? "active" : ""}" data-id="${p.id}">
        <span class="icon">${p.icon}</span>
        <div>
          <div class="label">${p.name}</div>
          <div class="scenario">${p.scenario}</div>
        </div>
      </div>
    `
      )
      .join("");
  }

  // Get models for current persona (global + extra)
  function getCurrentModels() {
    const extra = currentPersona.extraModels || [];
    return [...CONFIG.models, ...extra];
  }

  // Model tabs
  function renderModelTabs() {
    const models = getCurrentModels();
    const labels = models.map((m) => {
      const displayName = blindMode ? blindMapping[m.id] : m.name;
      let cls = "model-tab";
      if (m.id === currentModelId) cls += " active";
      if (compareMode && m.id === compareModelId) cls += " active-secondary";
      return `<div class="${cls}" data-id="${m.id}">${displayName}</div>`;
    });

    let hint = "";
    if (compareMode && !compareModelId) {
      hint = '<span class="compare-hint">点击第二个模型进行对比</span>';
    }

    modelTabs.innerHTML = labels.join("") + hint;
  }

  // Load iframe
  function loadIframe(iframe, placeholder, modelId) {
    const source = currentPersona.models[modelId];
    if (!source) {
      iframe.src = "about:blank";
      placeholder.classList.remove("hidden");
      return;
    }

    let src = source.type === "url" ? source.url : source.path;
    // Ensure directory paths end with / so relative assets resolve correctly
    if (source.type === "file" && src.endsWith("index.html")) {
      src = src.replace(/index\.html$/, "");
    }

    // Try loading — show placeholder on error
    iframe.src = src;
    placeholder.classList.add("hidden");

    iframe.onerror = () => {
      placeholder.classList.remove("hidden");
    };

    iframe.onload = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc || !doc.body) return;
        const text = doc.body.textContent || "";
        const title = doc.title || "";
        // Detect serve's directory listing or 404, but NOT SPA shells
        const isDirectoryListing = text.includes("Index of");
        const is404 = title === "404";
        const isEmpty =
          text.trim() === "" && doc.body.children.length === 0;
        if (isDirectoryListing || is404 || isEmpty) {
          placeholder.classList.remove("hidden");
        }
      } catch (e) {
        // Cross-origin — that's fine, means URL loaded
      }
    };
  }

  // Render editable focus items
  function renderFocusItems() {
    focusList.innerHTML = currentPersona.dimensions
      .map(
        (d, i) => `
      <div class="focus-item">
        <textarea class="focus-item-text" rows="1" data-index="${i}">${d}</textarea>
      </div>`
      )
      .join("");

    // Auto-resize textareas
    focusList.querySelectorAll(".focus-item-text").forEach((ta) => {
      autoResize(ta);
      ta.addEventListener("input", () => {
        autoResize(ta);
        // Save edit back to config
        const idx = parseInt(ta.dataset.index);
        currentPersona.dimensions[idx] = ta.value;
      });
    });
  }

  function autoResize(textarea) {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  }

  // Update content
  function updateContent() {
    // Update iframe 1
    const label1 = blindMode
      ? blindMapping[currentModelId]
      : getModelName(currentModelId);
    iframeLabel1.textContent = label1;
    loadIframe(iframe1, placeholder1, currentModelId);

    // Update iframe 2
    if (compareMode && compareModelId) {
      iframeWrapper2.classList.remove("hidden");
      const label2 = blindMode
        ? blindMapping[compareModelId]
        : getModelName(compareModelId);
      iframeLabel2.textContent = label2;
      loadIframe(iframe2, placeholder2, compareModelId);
    } else {
      iframeWrapper2.classList.add("hidden");
    }

    // Update info bar
    promptText.textContent = currentPersona.prompt;
    renderFocusItems();
  }

  function getModelName(id) {
    const models = getCurrentModels();
    const m = models.find((m) => m.id === id);
    return m ? m.name : id;
  }

  // Blind mode: shuffle model labels
  function generateBlindMapping() {
    const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const models = getCurrentModels();
    const ids = models.map((m) => m.id);
    const shuffled = [...ids].sort(() => Math.random() - 0.5);
    blindMapping = {};
    shuffled.forEach((id, i) => {
      blindMapping[id] = "模型 " + letters[i];
    });
  }

  // Events
  function bindEvents() {
    // Sidebar clicks
    sidebar.addEventListener("click", (e) => {
      const item = e.target.closest(".sidebar-item");
      if (!item) return;
      const id = item.dataset.id;
      currentPersona = CONFIG.personas.find((p) => p.id === id);
      currentModelId = CONFIG.models[0].id;
      compareModelId = null;
      renderSidebar();
      renderModelTabs();
      updateContent();
    });

    // Model tab clicks
    modelTabs.addEventListener("click", (e) => {
      const tab = e.target.closest(".model-tab");
      if (!tab) return;
      const id = tab.dataset.id;

      if (compareMode) {
        if (id === currentModelId) return;
        if (compareModelId === id) {
          compareModelId = null;
        } else {
          compareModelId = id;
        }
      } else {
        currentModelId = id;
      }

      renderModelTabs();
      updateContent();
    });

    // Blind mode toggle
    blindToggle.addEventListener("change", () => {
      blindMode = blindToggle.checked;
      if (blindMode) {
        generateBlindMapping();
      }
      renderModelTabs();
      updateContent();
    });

    // Compare mode toggle
    toggleCompare.addEventListener("click", () => {
      compareMode = !compareMode;
      toggleCompare.classList.toggle("active", compareMode);
      if (!compareMode) {
        compareModelId = null;
        iframeWrapper2.classList.add("hidden");
      }
      renderModelTabs();
      updateContent();
    });

    // Info bar collapse/expand
    infoToggle.addEventListener("click", () => {
      infoCollapsed = !infoCollapsed;
      infoBar.classList.toggle("collapsed", infoCollapsed);
    });

    // Device toggle (desktop / mobile)
    deviceToggle.addEventListener("click", (e) => {
      const btn = e.target.closest(".device-btn");
      if (!btn) return;
      const device = btn.dataset.device;
      if (device === deviceMode) return;
      deviceMode = device;
      deviceToggle.querySelectorAll(".device-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.device === deviceMode);
      });
      iframeArea.classList.toggle("mobile-preview", deviceMode === "mobile");
    });
  }

  init();
})();
