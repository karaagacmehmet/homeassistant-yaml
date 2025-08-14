/* mini-window-card.js — your stack-in-card layout 1:1
   - Left : window icon (open/closed; default variant icons; optional custom icons)
   - Mid  : name (15px fw450) + state (11px pt5), left aligned
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
          battery_gap_px: 2,             // ← ikon-% aralığı (px)
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
            display:flex; align-items:center; gap:0;       /* gap 0; aralığı bVal margin-left ile veririz */
            border:none; background:none; box-shadow:none; height:30px;
            cursor: pointer;
          }
          ha-icon.left-ico{ width:28px; height:24px; }     /* window icon */
          /* Compact state-badge: tam 16x16, padding/margin yok */
          state-badge.batt-badge{
            --mdc-icon-size:16px;
            width:16px; height:16px;
            margin:0; padding:0;
            line-height:1;
            display:inline-flex; align-items:center; justify-content:center;
          }
          .bval{ font-size:12px; line-height:1; }          /* % text */
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

      if (nmEl) nmEl.textContent = this._config.name ?? wObj?.attributes?.friendly_name ?? this._config.window_entity;
      if (stEl) stEl.textContent = isOpen ? "Open" : "Closed";
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
        // Her ihtimale karşı inline boşlukları da sıfırla
        bBadge.style.margin = "0"; bBadge.style.padding = "0";
        bBadge.style.width = "16px"; bBadge.style.height = "16px";

        // ikon-% aralığı ayarı
        bVal.style.marginLeft = `${Number(this._config.battery_gap_px || 0)}px`;

        const unit = bObj.attributes?.unit_of_measurement || "%";
        const val  = bObj.state;
        bVal.textContent =
          val && val !== "unknown" && val !== "unavailable"
            ? `${val}${unit === "%" ? "%" : " " + unit}`
            : "";
      }
    }

    static getConfigElement(){ return document.createElement(EDITOR); }
    static getStubConfig(hass, entities){
      const win = (entities||[]).find(e => e.startsWith("binary_sensor."));
      const bat = (entities||[]).find(e => e.startsWith("sensor.") && e.includes("battery"));
      return {
        window_entity: win || "binary_sensor.example_window",
        battery_entity: bat || "sensor.example_battery",
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
        <style>.wrap{padding:8px;}</style>
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
        ];
        this._form.data=Object.assign(
          {show_battery:true, window_primary_color:true, battery_gap_px:2},
          this._config||{}
        );
        this._form.addEventListener("value-changed",(e)=>this._onChange(e));
      }
    }
  }

  customElements.define(TAG, MiniWindowCard);
  customElements.define(EDITOR, MiniWindowCardEditor);
})();
