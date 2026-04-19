(function () {
  const TAG = "mini-switch-card";
  const EDITOR = "mini-switch-card-editor";

  window.customCards = window.customCards || [];
  window.customCards.push({
    type: TAG,
    name: "Mini Switch Card",
    description: "Boyut ve hizalama sorunları tamamen giderilmiş sürüm.",
  });

  class MiniSwitchCard extends HTMLElement {
    setConfig(config) {
      if (!config || !config.entity) throw new Error("Entity zorunlu.");
      
      // Verileri ana dizinden alacak şekilde zorla
      this._config = {
        entity: config.entity,
        name: config.name || "",
        icon: config.icon || "",
        checked_color: config.checked_color || "#34c759",
        icon_size: config.icon_size || 20,
        font_size: config.font_size || 11,
        width_i: config.width_i || "18px",
        width_n: config.width_n || "36px",
        width_s: config.width_s || "21px",
      };

      if (!this._root) this._root = this.attachShadow({ mode: "open" });
      this._build();
      this._update();
    }

    set hass(hass) {
      this._hass = hass;
      this._update();
    }

    _toggle(ev) {
      ev.stopPropagation();
      const domain = this._config.entity.split(".")[0];
      this._hass.callService(domain, "toggle", { entity_id: this._config.entity });
    }

    _build() {
      if (this._built) return;
      this._root.innerHTML = `
        <style id="main-style"></style>
        <ha-card>
          <div class="wrap" id="w">
            <div class="i" id="ico_cell"><ha-icon id="ico"></ha-icon></div>
            <div class="n" id="nam"></div>
            <div class="s"><ha-switch id="sw"></ha-switch></div>
          </div>
        </ha-card>
      `;
      this._root.getElementById("sw").addEventListener("click", (e) => this._toggle(e));
      this._built = true;
    }

    _update() {
      if (!this._built || !this._hass) return;
      const stateObj = this._hass.states[this._config.entity];
      if (!stateObj) return;

      const styleEl = this._root.getElementById("main-style");
      const ico = this._root.getElementById("ico");
      const nam = this._root.getElementById("nam");
      const sw = this._root.getElementById("sw");

      // Dinamik CSS'i Style Tag içine basıyoruz (En güçlü yöntem)
      styleEl.textContent = `
        ha-card { background: none; border: none; box-shadow: none; padding: 0px 2px; height: 100%; display: flex; align-items: center; }
        .wrap { 
          display: grid; 
          grid-template-areas: "i n switch"; 
          grid-template-columns: ${this._config.width_i} ${this._config.width_n} ${this._config.width_s};
          column-gap: 5px; align-items: center; margin-left: 7px; width: 100%;
        }
        .i { grid-area: i; display: flex; align-items: center; justify-content: center; width: ${this._config.icon_size}px; height: ${this._config.icon_size}px; }
        ha-icon { 
          --mdc-icon-size: ${this._config.icon_size}px !important; 
          width: ${this._config.icon_size}px !important; height: ${this._config.icon_size}px !important; 
          color: var(--primary-color); display: flex; 
        }
        .n { 
          grid-area: n; font-weight: 500; white-space: nowrap; overflow: hidden; color: var(--primary-text-color); 
          display: flex; align-items: center; line-height: 1; 
          font-size: ${this._config.font_size}px !important; 
        }
        .s { grid-area: switch; justify-self: end; margin-right: -4px; display: flex; align-items: center; }
        ha-switch {
          --mdc-switch-selected-handle-color: ${this._config.checked_color} !important;
          --switch-checked-button-color: ${this._config.checked_color} !important;
          --mdc-switch-selected-track-color: ${this._config.checked_color} !important;
          --switch-checked-track-color: ${this._config.checked_color} !important;
          transform: scale(0.7); transform-origin: right center;
        }
      `;
      
      ico.setAttribute("icon", this._config.icon || stateObj.attributes.icon || "mdi:toggle-switch");
      nam.textContent = this._config.name || stateObj.attributes.friendly_name;
      sw.checked = stateObj.state === "on";
    }

    static getConfigElement() { return document.createElement(EDITOR); }
    static getStubConfig() { return { entity: "", icon_size: 20, font_size: 11, checked_color: "#34c759", width_i: "18px", width_n: "36px", width_s: "21px" }; }
  }

  /* EDITOR */
  class MiniSwitchCardEditor extends HTMLElement {
    setConfig(config) {
      this._config = config;
      this._render();
    }
    set hass(hass) {
      this._hass = hass;
      if (this._form) this._form.hass = hass;
    }
    _render() {
      if (!this.shadowRoot) this.attachShadow({ mode: "open" });
      if (!this._form) {
        this.shadowRoot.innerHTML = `<div style="padding:10px;"><ha-form id="f"></ha-form></div>`;
        this._form = this.shadowRoot.getElementById("f");
        this._form.addEventListener("value-changed", (e) => {
          this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: e.detail.value } }));
        });
      }
      this._form.hass = this._hass;
      this._form.data = this._config;
      this._form.schema = [
        { name: "entity", selector: { entity: {} } },
        { name: "name", label: "İsim", selector: { text: {} } },
        { name: "icon", label: "İkon", selector: { icon: {} } },
        { name: "icon_size", label: "İkon Boyutu (px)", selector: { number: { min: 8, max: 50, mode: "box" } } },
        { name: "font_size", label: "Yazı Boyutu (px)", selector: { number: { min: 8, max: 30, mode: "box" } } },
        { name: "checked_color", label: "Aktif Renk", selector: { text: {} } },
        { name: "width_i", label: "İkon Alan Gen.", selector: { text: {} } },
        { name: "width_n", label: "İsim Alan Gen.", selector: { text: {} } },
        { name: "width_s", label: "Switch Alan Gen.", selector: { text: {} } },
      ];
    }
  }

  customElements.define(TAG, MiniSwitchCard);
  customElements.define(EDITOR, MiniSwitchCardEditor);
})();
