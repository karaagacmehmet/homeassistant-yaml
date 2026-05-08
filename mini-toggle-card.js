/**
 * mini-toggle-card  —  v1.0 final
 * Home Assistant Custom Card
 *
 * Kullanım (YAML):
 *   type: custom:mini-toggle-card
 *   entity: input_boolean.misafir_modu
 *   name: Misafir
 *
 * Tüm parametreler:
 *   icon: mdi:account          # verilmezse entity'nin kendi ikonu (ha-state-icon)
 *   standalone: true           # true → ha-card (tam kart) | false → saydam div (başka card içinde)
 *   background_color: "..."    # standalone:true iken arka plan, default var(--card-background-color)
 *   toggle_color: "#4caf50"    # toggle açıkken renk
 *   col_icon: 32               # ikon kolonu genişliği (px)
 *   col_name: 66               # isim kolonu genişliği (px)
 *   col_switch: 20             # switch kolonu genişliği (px)
 *   icon_width: 20             # ikon genişliği (px)
 *   icon_height: 20            # ikon yüksekliği (px)
 *   font_size: 11              # isim font-size (px)
 *   font_weight: 500           # isim font-weight
 */

class MiniToggleCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._toggling = false;
  }

  setConfig(config) {
    if (!config.entity) throw new Error("entity tanımlanmalı");
    this._config = {
      entity:           config.entity,
      name:             config.name             ?? "",
      icon:             config.icon             ?? null,
      standalone:       config.standalone       ?? true,
      background_color: config.background_color ?? "var(--card-background-color)",
      toggle_color:     config.toggle_color     ?? null,
      col_icon:         config.col_icon         ?? 32,
      col_name:         config.col_name         ?? 66,
      col_switch:       config.col_switch       ?? 20,
      icon_width:       config.icon_width       ?? 20,
      icon_height:      config.icon_height      ?? 20,
      font_size:        config.font_size        ?? 11,
      font_weight:      config.font_weight      ?? 500,
    };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    // ha-state-icon'a hass'ı ilet (entity ikonunu otomatik çözsün)
    const stateIcon = this.shadowRoot?.getElementById("state-icon");
    if (stateIcon) stateIcon.hass = hass;
    this._updateState();
  }

  _stateObj() {
    return this._hass?.states[this._config.entity];
  }

  _domain() {
    return this._config.entity.split(".")[0];
  }

  _isOn() {
    const s = this._stateObj()?.state;
    return s === "on" || s === "true" || s === "home" || s === "open" || s === "unlocked";
  }

  _getStateColor() {
    const stateObj = this._stateObj();
    if (!stateObj) return null;
    const domain = stateObj.entity_id.split(".")[0];
    const state  = stateObj.state;
    const vars = [
      `--state-${domain}-${state}-color`,
      `--state-${domain}-active-color`,
      `--state-${domain}-color`,
      `--state-active-color`,
    ];
    for (const v of vars) {
      const val = getComputedStyle(document.documentElement).getPropertyValue(v).trim();
      if (val) return `var(${v})`;
    }
    return null;
  }

  _render() {
    const c          = this._config;
    const sw         = this.shadowRoot;
    const trackW     = Math.max(c.col_switch, 20) + 8;
    const trackH     = Math.round(trackW * 0.57);
    const thumbSz    = trackH - 4;
    const travel     = trackW - trackH;
    const iconSz     = Math.min(c.icon_width, c.icon_height);
    const standalone = c.standalone !== false;

    const wrapTag   = standalone ? "ha-card" : "div";
    const wrapStyle = standalone
      ? `#wrap {
          background: ${c.background_color} !important;
          display: grid;
          grid-template-areas: "icon name switch";
          grid-template-columns: ${c.col_icon}px ${c.col_name}px ${trackW}px;
          align-items: center;
          width: 100%;
          height: 100%;
          padding: 0;
          box-sizing: border-box;
        }`
      : `#wrap {
          display: grid;
          grid-template-areas: "icon name switch";
          grid-template-columns: ${c.col_icon}px ${c.col_name}px ${trackW}px;
          align-items: center;
          width: 100%;
          height: 100%;
          padding: 0;
          background: none !important;
          border: none !important;
          box-shadow: none !important;
          box-sizing: border-box;
        }`;

    // icon config verilmişse ha-icon, verilmemişse ha-state-icon (entity'nin kendi ikonu)
    const iconEl = c.icon
      ? `<ha-icon id="state-icon" icon="${c.icon}"></ha-icon>`
      : `<ha-state-icon id="state-icon" .stateObj="[[_stateObj]]"></ha-state-icon>`;

    sw.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
        }

        ${wrapStyle}

        .icon-area {
          grid-area: icon;
          display: flex;
          align-items: center;
          justify-content: center;
          width: ${c.icon_width}px;
          height: ${c.icon_height}px;
          cursor: pointer;
        }
        #state-icon {
          --mdc-icon-size: ${iconSz}px;
          color: var(--primary-color);
          transition: color 0.3s;
        }
        #state-icon.active {
          color: var(--mini-state-color, var(--state-active-color, var(--primary-color)));
        }

        .name-area {
          grid-area: name;
          font-size: ${c.font_size}px;
          font-weight: ${c.font_weight};
          color: var(--primary-text-color);
          justify-self: start;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: ${c.col_name}px;
          cursor: pointer;
        }

        .switch-area {
          grid-area: switch;
          justify-self: end;
          display: flex;
          align-items: center;
        }
        .toggle-track {
          width: ${trackW}px;
          height: ${trackH}px;
          border-radius: 999px;
          position: relative;
          cursor: pointer;
          transition: background 0.25s;
          background: var(--disabled-color, #9e9e9e);
          flex-shrink: 0;
        }
        .toggle-track.on {
          background: var(--mini-toggle-color, #4caf50);
        }
        .toggle-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: ${thumbSz}px;
          height: ${thumbSz}px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.35);
          transition: transform 0.2s;
        }
        .toggle-track.on .toggle-thumb {
          transform: translateX(${travel}px);
        }
      </style>

      <${wrapTag} id="wrap">
        <div class="icon-area" id="info-btn">
          ${iconEl}
        </div>
        <div class="name-area" id="name-area">${c.name}</div>
        <div class="switch-area">
          <div class="toggle-track" id="toggle">
            <div class="toggle-thumb"></div>
          </div>
        </div>
      </${wrapTag}>
    `;

    // ha-state-icon: stateObj ve hass'ı JS property olarak set et (attribute değil)
    if (!c.icon) {
      const stateIcon = sw.getElementById("state-icon");
      if (stateIcon) {
        stateIcon.stateObj = this._stateObj();
        if (this._hass) stateIcon.hass = this._hass;
      }
    }

    sw.getElementById("toggle").addEventListener("click", () => this._toggle());
    const moreInfo = () => this._fireMoreInfo();
    sw.getElementById("info-btn").addEventListener("click", moreInfo);
    sw.getElementById("name-area").addEventListener("click", moreInfo);

    this._updateState();
  }

  _updateState() {
    const sw = this.shadowRoot;
    if (!sw) return;
    const track     = sw.getElementById("toggle");
    const stateIcon = sw.getElementById("state-icon");
    const wrap      = sw.getElementById("wrap");
    if (!track || !stateIcon || !wrap) return;

    const on = this._isOn();

    // Toggle açık/kapalı + özel renk
    track.classList.toggle("on", on);
    if (this._config.toggle_color) {
      wrap.style.setProperty("--mini-toggle-color", this._config.toggle_color);
    }

    // ha-state-icon'a güncel stateObj'i ilet (entity ikonunu reactive tutar)
    if (!this._config.icon) {
      stateIcon.stateObj = this._stateObj();
      if (this._hass) stateIcon.hass = this._hass;
    }

    // Sol ikon rengi: on → state color, off → primary-color (default)
    stateIcon.classList.toggle("active", on);
    if (on) {
      const color = this._getStateColor();
      if (color) wrap.style.setProperty("--mini-state-color", color);
      else wrap.style.removeProperty("--mini-state-color");
    } else {
      wrap.style.removeProperty("--mini-state-color");
    }
  }

  _toggle() {
    if (!this._hass || !this._config || this._toggling) return;
    this._toggling = true;

    // Domain'e göre doğru servis çağrısı
    const domain = this._domain();
    const serviceMap = {
      input_boolean: "input_boolean",
      switch:        "switch",
      light:         "light",
      fan:           "fan",
      cover:         "cover",
      lock:          "lock",
      automation:    "automation",
      script:        "script",
      media_player:  "media_player",
    };
    const service = serviceMap[domain] ?? domain;

    this._hass
      .callService(service, "toggle", { entity_id: this._config.entity })
      .finally(() => { this._toggling = false; });
  }

  _fireMoreInfo() {
    this.dispatchEvent(new CustomEvent("hass-more-info", {
      detail: { entityId: this._config.entity },
      bubbles: true,
      composed: true,
    }));
  }

  getCardSize() { return 1; }

  static getConfigElement() {
    return document.createElement("mini-toggle-card-editor");
  }

  static getStubConfig() {
    return { entity: "input_boolean.misafir_modu", name: "Misafir" };
  }
}

/* ─── Visual Editor ─── */
class MiniToggleCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) { this._hass = hass; }

  _fire(detail) {
    this.dispatchEvent(new CustomEvent("config-changed", { detail, bubbles: true, composed: true }));
  }

  _render() {
    const c = this._config ?? {};
    this.innerHTML = `
      <style>
        .editor { padding: 8px 0; font-family: var(--paper-font-body1_-_font-family, sans-serif); }
        .row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
        .row label { font-size: 13px; color: var(--secondary-text-color); min-width: 150px; }
        .row input[type=range] { flex: 1; }
        .row input[type=text] { flex: 1; padding: 4px 8px; border: 1px solid var(--divider-color); border-radius: 4px; background: var(--card-background-color); color: var(--primary-text-color); font-size: 13px; }
        .row select { flex: 1; padding: 4px 8px; border: 1px solid var(--divider-color); border-radius: 4px; background: var(--card-background-color); color: var(--primary-text-color); font-size: 13px; }
        .val { font-size: 13px; font-weight: 500; min-width: 44px; text-align: right; }
        .section { font-size: 11px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--secondary-text-color); margin: 14px 0 6px; }
        .hint { font-size: 11px; color: var(--secondary-text-color); margin-top: -6px; margin-bottom: 10px; }
      </style>
      <div class="editor">
        <div class="section">Genel</div>
        <div class="row"><label>Entity</label><input type="text" id="entity" value="${c.entity ?? ""}" placeholder="switch.xxx / input_boolean.xxx"></div>
        <div class="row"><label>İsim</label><input type="text" id="name" value="${c.name ?? ""}"></div>
        <div class="row"><label>İkon (mdi:xxx)</label><input type="text" id="icon" value="${c.icon ?? ""}" placeholder="boş = entity'nin kendi ikonu"></div>
        <div class="hint">Boş bırakılırsa entity'nin HA'daki ikonu kullanılır.</div>

        <div class="row">
          <label>Kullanım modu</label>
          <select id="standalone">
            <option value="true"  ${c.standalone !== false ? "selected" : ""}>Tek başına kart (ha-card)</option>
            <option value="false" ${c.standalone === false  ? "selected" : ""}>Başka card içinde (saydam)</option>
          </select>
        </div>
        <div class="row"><label>Arka plan rengi</label><input type="text" id="background_color" value="${c.background_color ?? "var(--card-background-color)"}" placeholder="var(--card-background-color)"></div>
        <div class="hint">Yalnızca "Tek başına kart" modunda geçerlidir.</div>
        <div class="row"><label>Toggle açık rengi</label><input type="text" id="toggle_color" value="${c.toggle_color ?? ""}" placeholder="#4caf50"></div>

        <div class="section">Grid sütun genişlikleri (px)</div>
        <div class="row"><label>İkon kolonu</label><input type="range" id="col_icon" min="10" max="120" step="1" value="${c.col_icon ?? 32}"><span class="val" id="col_icon_v">${c.col_icon ?? 32}px</span></div>
        <div class="row"><label>İsim kolonu</label><input type="range" id="col_name" min="20" max="200" step="1" value="${c.col_name ?? 66}"><span class="val" id="col_name_v">${c.col_name ?? 66}px</span></div>
        <div class="row"><label>Switch kolonu</label><input type="range" id="col_switch" min="10" max="80" step="1" value="${c.col_switch ?? 20}"><span class="val" id="col_switch_v">${c.col_switch ?? 20}px</span></div>

        <div class="section">İkon boyutu</div>
        <div class="row"><label>Genişlik (px)</label><input type="range" id="icon_width" min="10" max="64" step="1" value="${c.icon_width ?? 20}"><span class="val" id="icon_width_v">${c.icon_width ?? 20}px</span></div>
        <div class="row"><label>Yükseklik (px)</label><input type="range" id="icon_height" min="10" max="64" step="1" value="${c.icon_height ?? 20}"><span class="val" id="icon_height_v">${c.icon_height ?? 20}px</span></div>

        <div class="section">İsim tipografisi</div>
        <div class="row"><label>Font size (px)</label><input type="range" id="font_size" min="8" max="24" step="1" value="${c.font_size ?? 11}"><span class="val" id="font_size_v">${c.font_size ?? 11}px</span></div>
        <div class="row"><label>Font weight</label><input type="range" id="font_weight" min="300" max="700" step="100" value="${c.font_weight ?? 500}"><span class="val" id="font_weight_v">${c.font_weight ?? 500}</span></div>
      </div>
    `;

    ["col_icon","col_name","col_switch","icon_width","icon_height","font_size","font_weight"].forEach(id => {
      const el  = this.querySelector(`#${id}`);
      const vEl = this.querySelector(`#${id}_v`);
      el?.addEventListener("input", () => {
        const val = parseInt(el.value);
        vEl.textContent = id === "font_weight" ? val : val + "px";
        this._fire({ config: { ...this._config, [id]: val } });
      });
    });

    ["entity","name"].forEach(id => {
      this.querySelector(`#${id}`)?.addEventListener("change", (e) => {
        this._fire({ config: { ...this._config, [id]: e.target.value } });
      });
    });

    this.querySelector("#icon")?.addEventListener("change", (e) => {
      const val = e.target.value.trim();
      this._fire({ config: { ...this._config, icon: val || null } });
    });

    this.querySelector("#standalone")?.addEventListener("change", (e) => {
      this._fire({ config: { ...this._config, standalone: e.target.value !== "false" } });
    });

    this.querySelector("#toggle_color")?.addEventListener("change", (e) => {
      const val = e.target.value.trim();
      this._fire({ config: { ...this._config, toggle_color: val || null } });
    });

    this.querySelector("#background_color")?.addEventListener("change", (e) => {
      const val = e.target.value.trim();
      this._fire({ config: { ...this._config, background_color: val || "var(--card-background-color)" } });
    });
  }
}

customElements.define("mini-toggle-card", MiniToggleCard);
customElements.define("mini-toggle-card-editor", MiniToggleCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "mini-toggle-card",
  name: "Mini Toggle Card",
  description: "Kompakt toggle kart — ha-state-icon, domain-aware toggle, standalone/embedded",
  preview: true,
});
