/* mini-window-card.js — your stack-in-card layout 1:1
   - Left : window icon (open/closed; default variant icons; optional custom icons)
   - Mid  : name (15px fw450) + state (11px pt5), left aligned (+ optional last_changed)
   - Right: battery via <state-badge> (HA-native coloring) + % text
   - Taps : left+mid -> window more-info, right -> battery more-info
*/
(function () {
  const TAG = "mini-window-card";
  const EDITOR = "mini-window-card-editor";

  window.customCards = window.customCards || [];
  window.customCards.push({
    type: TAG,
    name: "Mini Window Card",
    description: "Window + Battery mini card (uses HA state-badge coloring).",
  });

  class MiniWindowCard extends HTMLElement {
    setConfig(config) {
      if (!config || !config.window_entity) throw new Error("window_entity zorunlu");
      this._config = Object.assign(
        {
          name: "Pencere",
          battery_entity: undefined,
          show_battery: true,
          window_primary_color: true,
          open_icon: undefined,          // optional
          closed_icon: undefined,        // optional
          battery_gap_px: 2,             // ikon-% aralığı (px)

          // >>> NEW (optional last_changed + i18n labels) <<<
          show_last_changed: false,      // state yanına ekle
          last_changed_mode: "relative", // relative | time | datetime
          locale: (navigator.language || "tr-TR"),
          open_label: "Açık",
          closed_label: "Kapalı",
        },
        config
      );
      if (!this._root) this._root = this.attachShadow({ mode: "open" });
      this._build();
      this._update();
    }

    set hass(hass) { this._hass = hass; this._update(); }
    getCardSize() { return 1; }
    _st = (id) => this._hass?.states?.[id];

    _fireMoreInfo(entityId) {
      if (!entityId) return;
      this.dispatchEvent(new CustomEvent("hass-more-info", {
        bubbles: true, composed: true, detail: { entityId }
      }));
    }

    _build() {
      if (this._built) return;
      this._root.innerHTML = `
        <style>
          ha-card{ padding:9px; }
          .wrap{ display:flex; align-items:center; gap:8px; }
          .left{
            width:34px; min-height:34px;
            border:none; background:none; box-shadow:none;
            display:flex; align-items:center; justify-content:center;
            cursor: pointer;
          }
          .mid{
            display:flex; flex-direction:column; justify-content:center;
            border:none; background:none; box-shadow:none; padding:0;
            flex:1 1 auto; cursor: pointer;
          }
          .name{ font-weight:450; font-size:15px; text-align:left; line-height:1; }
          .state{ font-size:11px; line-height:1; padding-top:5px; text-align:left; }
          .right{
            display:flex; align-items:center; gap:0;
            border:none; background:none; box-shadow:none; height:30px;
            cursor: pointer;
          }
          ha-icon.left-ico{ width:28px; height:24px; } /* window icon */

          /* Compact state-badge: tam 16x16, padding/margin yok */
          state-badge.batt-badge{
            --mdc-icon-size:16px;
            width:16px; height:16px;
            margin:0; padding:0; line-height:1;
            display:inline-flex; align-items:center; justify-content:center;
          }
          .bval{ font-size:12px; line-height:1; }
        </style>
        <ha-card>
          <div class="wrap">
            <div class="left" id="left">
              <ha-icon class="left-ico" id="wIcon"></ha-icon>
            </div>
            <div class="mid" id="mid">
              <div class="name" id="nm"></div>
              <div class="state" id="st"></div>
            </div>
            <div class="right" id="bWrap" style="display:none;">
              <state-badge class="batt-badge" id="bBadge"></state-badge>
              <span class="bval" id="bVal"></span>
            </div>
          </div>
        </ha-card>
      `;
      // Tap actions
      this._root.getElementById("left")?.addEventListener("click", () =>
        this._fireMoreInfo(this._config.window_entity)
      );
      this._root.getElementById("mid")?.addEventListener("click", () =>
        this._fireMoreInfo(this._config.window_entity)
      );
      this._root.getElementById("bWrap")?.addEventListener("click", () =>
        this._fireMoreInfo(this._config.battery_entity)
      );
      this._built = true;
    }

    _update() {
      if (!this._built || !this._hass) return;

      /* --- WINDOW --- */
      const wObj = this._st(this._config.window_entity);
      const wState = (wObj?.state || "").toLowerCase();
      const isOpen = wState === "on" || wState === "open";

      const openIcon   = this._config.open_icon   || "mdi:window-open-variant";
      const closedIcon = this._config.closed_icon || "mdi:window-closed-variant";
      const wIconName = isOpen ? openIcon : closedIcon;

      const nmEl = this._root.getElementById("nm");
      const stEl = this._root.getElementById("st");
      const wIconEl = this._root.getElementById("wIcon");

      if (nmEl) nmEl.textContent =
        this._config.name ?? wObj?.attributes?.friendly_name ?? this._config.window_entity;

      // state + (optional) last_changed
      const base = isOpen ? (this._config.open_label || "Açık")
                          : (this._config.closed_label || "Kapalı");
      const withLast = this._config.show_last_changed
        ? `${base} (${this._formatLastChanged(wObj?.last_changed)})`
        : base;
      if (stEl) stEl.textContent = withLast;

      if (wIconEl) {
        wIconEl.setAttribute("icon", wIconName);
        wIconEl.style.color = this._config.window_primary_color !== false ? "var(--primary-color)" : "";
      }

      /* --- BATTERY (state-badge; HA-native renk) --- */
      const bWrap  = this._root.getElementById("bWrap");
      const bBadge = this._root.getElementById("bBadge");
      const bVal   = this._root.getElementById("bVal");
      const bObj   = this._config.battery_entity ? this._st(this._config.battery_entity) : undefined;
      const show   = this._config.show_battery !== false && !!bObj;

      bWrap.style.display = show ? "" : "none";
      if (show) {
        bBadge.hass = this._hass;
        bBadge.stateObj = bObj;
        bBadge.stateColor = true;
        bBadge.style.margin = "0"; bBadge.style.padding = "0";
        bBadge.style.width = "16px"; bBadge.style.height = "16px";

        bVal.style.marginLeft = `${Number(this._config.battery_gap_px || 0)}px`;

        const unit = bObj.attributes?.unit_of_measurement || "%";
        const val  = bObj.state;
        bVal.textContent =
          val && val !== "unknown" && val !== "unavailable"
            ? `${val}${unit === "%" ? "%" : " " + unit}`
            : "";
      }
    }

    // ---- helpers: last_changed formatting ----
    _formatLastChanged(lastChangedIso) {
      if (!lastChangedIso) return "";
      const mode = (this._config.last_changed_mode || "relative").toLowerCase();
      const loc  = this._config.locale || (navigator.language || "tr-TR");
      const dt = new Date(lastChangedIso);

      if (mode === "time")   return this._fmtTime(dt, loc);
      if (mode === "datetime") return `${this._fmtDate(dt, loc)} ${this._fmtTime(dt, loc)}`;
      return this._relative(dt, loc); // default relative
    }
    _fmtDate(d, locale) {
      try { return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit" }).format(d); }
      catch { return `${d.getDate().toString().padStart(2,"0")}.${(d.getMonth()+1).toString().padStart(2,"0")}`; }
    }
    _fmtTime(d, locale) {
      try { return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(d); }
      catch {
        const h = d.getHours().toString().padStart(2,"0");
        const m = d.getMinutes().toString().padStart(2,"0");
        return `${h}:${m}`;
      }
    }
    _relative(d, locale) {
      const now = new Date();
      const diffMs = now - d;
      const sec = Math.round(diffMs / 1000);
      const min = Math.round(sec / 60);
      const hr  = Math.round(min / 60);
      const day = Math.round(hr / 24);
      try {
        const rtf = new Intl.RelativeTimeFormat(locale || "tr-TR", { numeric: "auto" });
        if (sec < 60)  return rtf.format(-sec, "second");
        if (min < 60)  return rtf.format(-min, "minute");
        if (hr  < 24)  return rtf.format(-hr,  "hour");
        return rtf.format(-day, "day");
      } catch {
        const tr = (n,u) => `${Math.abs(n)} ${u} önce`;
        if (sec < 60)  return tr(sec, "saniye");
        if (min < 60)  return tr(min, "dakika");
        if (hr  < 24)  return tr(hr,  "saat");
        return tr(day, "gün");
      }
    }

    static getConfigElement(){ return document.createElement(EDITOR); }
    static getStubConfig(hass, entities){
      const win = (entities||[]).find(e => e.startsWith("binary_sensor."));
      const bat = (entities||[]).find(e => e.startsWith("sensor.") && e.includes("battery"));
      return {
        window_entity: win || "binary_sensor.example_window",
        battery_entity: bat || undefined,
        name: "Pencere",
        show_battery: true
      };
    }
  }

  class MiniWindowCardEditor extends HTMLElement {
    setConfig(config){ this._config=config; this._render(); }
    set hass(hass){ this._hass=hass; if(this._form) this._form.hass=hass; }
    _onChange(ev){
      const d=ev.detail; if(!d) return;
      const cfg=Object.assign({}, this._config, d.value);
      this._config=cfg;
      this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:cfg}}));
    }
    _render(){
      if(!this.shadowRoot) this.attachShadow({mode:"open"});
      this.shadowRoot.innerHTML=`
        <style>.wrap{padding:8px;} ha-form{ --form-field-min-width:220px; }</style>
        <div class="wrap"><ha-form id="form"></ha-form></div>
      `;
      this._form=this.shadowRoot.getElementById("form");
      if(this._form){
        this._form.hass=this._hass;
        this._form.schema=[
          { name:"window_entity", selector:{ entity:{ domain:"binary_sensor" } } },
          { name:"battery_entity", selector:{ entity:{ domain:"sensor" } } },
          { name:"name", selector:{ text:{} } },
          { name:"show_battery", selector:{ boolean:{} } },
          { name:"window_primary_color", selector:{ boolean:{} } },
          { name:"open_icon", selector:{ icon:{} } },
          { name:"closed_icon", selector:{ icon:{} } },
          { name:"battery_gap_px", selector:{ number:{ min:0, max:8, step:1 } } },

          // >>> NEW (editor fields for last_changed + i18n labels) <<<
          { name:"show_last_changed", selector:{ boolean:{} } },
          { name:"last_changed_mode",
            selector:{ select:{ options:[
              { value:"relative", label:"Relative (… önce)" },
              { value:"time",     label:"Sadece Saat" },
              { value:"datetime", label:"Tarih + Saat" }
            ]}}
          },
          { name:"locale", selector:{ text:{} } },
          { name:"open_label", selector:{ text:{} } },
          { name:"closed_label", selector:{ text:{} } },
        ];
        this._form.data=Object.assign(
          {
            show_battery:true, window_primary_color:true, battery_gap_px:2,
            show_last_changed:false, last_changed_mode:"relative", locale:"tr-TR",
            open_label:"Açık", closed_label:"Kapalı"
          },
          this._config||{}
        );
        this._form.addEventListener("value-changed",(e)=>this._onChange(e));
      }
    }
  }

  customElements.define(TAG, MiniWindowCard);
  customElements.define(EDITOR, MiniWindowCardEditor);
})();
