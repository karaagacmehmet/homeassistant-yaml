/* mini-temperature-card.js — exact layout, fixed main icon size & no extra top gap
   - Main (left) icon size controlled via main_icon_size_px (default 34).
   - Right column top padding removed (cells padding-top:0, row-gap:0).
   - Top cells: grid [10px | 55px], gap 1px, 16px icons forced (no overlap).
   - Battery aligns with humidity start; HA-native coloring; "96 %".
*/
(function () {
  const TAG = "mini-temperature-card";
  const EDITOR = "mini-temperature-card-editor";

  window.customCards = window.customCards || [];
  window.customCards.push({
    type: TAG,
    name: "Mini Temperature Card",
    description: "Replica of Temperature/Humidity stack-in-card with precise alignment.",
  });

  class MiniTemperatureCard extends HTMLElement {
    setConfig(config) {
      if (!config || !config.temp_entity || !config.hum_entity)
        throw new Error("temp_entity ve hum_entity zorunlu");

      this._config = Object.assign(
        {
          battery_entity: undefined,
          name: "Sıcaklık/Nem",

          // Left big icon
          main_icon: "mdi:thermometer-water",
          main_icon_primary_color: true,
          main_icon_size_px: 34,       // ← sol büyük ikon (HA ikonları kare olduğundan yükseklik buna göre gelir)

          // Top row icons
          temp_icon: "mdi:thermometer",
          temp_icon_color: "red",
          hum_icon: "mdi:water-percent",
          hum_icon_color: "var(--primary-color)",
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
    _mi(v, d){ return Number(v ?? d); }
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
          ha-card{ padding-top:2px; }
          .wrap{ display:flex; align-items:center; gap:8px; }

          /* Left big icon area */
          .left{
            width:34px; min-height:54px; padding-left:2px;
            border:none; background:none; box-shadow:none;
            display:flex; align-items:center; justify-content:center;
          }
          /* Force main icon size via --mdc-icon-size; HA otherwise defaults to 24px */
          ha-icon.main-icon{
            --mdc-icon-size: var(--main-ico, 34px);
            width:34px; height:var(--main-ico, 34px);
            color: var(--primary-color);
          }

          /* Right grid: 2 cols × 2 rows: [temp | hum] over [label | battery] */
          .mid{
              display:grid;
              grid-template-areas:
                "temp hum"
                "label batt";
              grid-template-columns: max-content max-content;
              column-gap:16px;
              row-gap:4px;                   /* ↑ üst ve alt satır arasını açtık */
              flex:1 1 auto;
            }

          /* === TOP ROW CELLS === */
          .cell{
            display:grid;
            grid-template-columns: 10px 55px;  /* ikon kolonu:10, state kolonu:55 */
            column-gap: 1px;
            align-items:center;
            height: 28px;
            padding-top: 0;                     /* ← ekstra tepe padding yok */
            cursor:pointer;
            border:none; background:none; box-shadow:none;
          }
          /* Force 16px icons (HA defaults to 24px) */
          .cell .ico{
            --mdc-icon-size:16px;
            width:16px; height:21px;
            flex:none;
            transform: translateY(-1px);   /* ← mikro nudge (gerekirse -2px yapabilirsin) */
          }
          /* 16px ikon 10px kolonda: sola -6px kaydır, sağ kenar 10px’te kalsın */
          .cell .icobox{
            width:16px; height:16px;
            margin-left:-6px;
            display:flex; align-items:center; justify-content:flex-start;
          }
          .cell .val{ 
             font-size:15px;
             line-height:16px;              /* ← metnin satır yüksekliği ikona eşit */
             height:16px;
             display:flex;
             align-items:center;            /* dikey ortalama */
          }

          .temp{ grid-area: temp; }
          .hum { grid-area: hum;  }

          /* === BOTTOM ROW === */
          .label{
            grid-area: label;
            font-weight:500; font-size:11px;
            align-self:center;
          }
          .battery{
            grid-area: batt;
            display:grid;
            grid-template-columns: 10px 40px;
            column-gap:0px;
            align-items:center;
            height:17px;
            justify-self:start;               /* hum ile aynı hattan başlat */
            cursor:pointer;
          }
          state-badge.batt-ico{
              --mdc-icon-size:14px;
              width:14px; height:14px;
              margin-left:-4px;
              padding:0; line-height:1;
              display:inline-flex; align-items:center; justify-content:flex-start;
              transform: translateY(0); /* artık dikeyde nötr */
          }
          .bval{ font-size:10px; line-height:1; margin-left:0; }
        </style>

        <ha-card>
          <div class="wrap">
            <div class="left">
              <ha-icon class="main-icon" id="mainIcon"></ha-icon>
            </div>

            <div class="mid">
              <div class="cell temp" id="tempCell">
                <div class="icobox"><ha-icon class="ico" id="tempIcon"></ha-icon></div>
                <span class="val" id="tempVal"></span>
              </div>
              <div class="cell hum" id="humCell">
                <div class="icobox"><ha-icon class="ico" id="humIcon"></ha-icon></div>
                <span class="val" id="humVal"></span>
              </div>

              <div class="label" id="label"></div>
              <div class="battery" id="bWrap" style="display:none;">
                <state-badge class="batt-ico" id="bBadge"></state-badge>
                <span class="bval" id="bVal"></span>
              </div>
            </div>
          </div>
        </ha-card>
      `;
      // taps
      this._root.getElementById("tempCell")?.addEventListener("click", () =>
        this._fireMoreInfo(this._config.temp_entity)
      );
      this._root.getElementById("humCell")?.addEventListener("click", () =>
        this._fireMoreInfo(this._config.hum_entity)
      );
      this._root.getElementById("bWrap")?.addEventListener("click", () =>
        this._fireMoreInfo(this._config.battery_entity)
      );
      this._built = true;
    }

    _fmtVal(obj) {
      if (!obj) return "";
      const v = obj.state;
      if (!v || v === "unknown" || v === "unavailable") return "--";
      const u = obj.attributes?.unit_of_measurement || "";
      return u ? `${v} ${u}` : `${v}`;  // orijinal gibi "96 %"
    }

    _update() {
      if (!this._built || !this._hass) return;

      // Set main icon size via CSS var
      const main = this._root.getElementById("mainIcon");
      if (main) {
        const size = `${this._mi(this._config.main_icon_size_px, 34)}px`;
        main.style.setProperty("--main-ico", size);
        main.setAttribute("icon", this._config.main_icon || "mdi:thermometer-water");
        main.style.color = this._config.main_icon_primary_color !== false ? "var(--primary-color)" : "";
      }

      // Top: temperature + humidity
      const tempObj = this._st(this._config.temp_entity);
      const humObj  = this._st(this._config.hum_entity);

      const tIcon = this._root.getElementById("tempIcon");
      const tVal  = this._root.getElementById("tempVal");
      if (tIcon) { tIcon.setAttribute("icon", this._config.temp_icon || "mdi:thermometer"); tIcon.style.color = this._config.temp_icon_color || "red"; }
      if (tVal)  tVal.textContent = this._fmtVal(tempObj);

      const hIcon = this._root.getElementById("humIcon");
      const hVal  = this._root.getElementById("humVal");
      if (hIcon) { hIcon.setAttribute("icon", this._config.hum_icon || "mdi:water-percent"); hIcon.style.color = this._config.hum_icon_color || "var(--primary-color)"; }
      if (hVal)  hVal.textContent = this._fmtVal(humObj);

      // Bottom: label + battery
      const label = this._root.getElementById("label");
      if (label) label.textContent = this._config.name || "Sıcaklık/Nem";

      const bWrap  = this._root.getElementById("bWrap");
      const bBadge = this._root.getElementById("bBadge");
      const bVal   = this._root.getElementById("bVal");
      const bObj   = this._config.battery_entity ? this._st(this._config.battery_entity) : undefined;

      bWrap.style.display = bObj ? "" : "none";
      if (bObj) {
        bBadge.hass = this._hass; bBadge.stateObj = bObj; bBadge.stateColor = true;
        bVal.textContent = this._fmtVal(bObj);
      }
    }

    static getConfigElement(){ return document.createElement(EDITOR); }
    static getStubConfig(hass, entities){
      const temp = (entities||[]).find(e => e.startsWith("sensor.") && e.includes("temperature")) || "sensor.example_temperature";
      const hum  = (entities||[]).find(e => e.startsWith("sensor.") && e.includes("humidity"))    || "sensor.example_humidity";
      const bat  = (entities||[]).find(e => e.startsWith("sensor.") && e.includes("battery"))     || "sensor.example_battery";
      return { temp_entity: temp, hum_entity: hum, battery_entity: bat, name: "Sıcaklık/Nem" };
    }
  }

  class MiniTemperatureCardEditor extends HTMLElement {
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
          { name:"temp_entity", selector:{ entity:{ domain:"sensor" } } },
          { name:"hum_entity", selector:{ entity:{ domain:"sensor" } } },
          { name:"battery_entity", selector:{ entity:{ domain:"sensor" } } },
          { name:"name", selector:{ text:{} } },
          { name:"main_icon", selector:{ icon:{} } },
          { name:"main_icon_primary_color", selector:{ boolean:{} } },
          { name:"main_icon_size_px", selector:{ number:{ min:24, max:44, step:1 } } },
          { name:"temp_icon", selector:{ icon:{} } },
          { name:"temp_icon_color", selector:{ text:{} } },
          { name:"hum_icon", selector:{ icon:{} } },
          { name:"hum_icon_color", selector:{ text:{} } },
        ];
        this._form.data=Object.assign(
          { name:"Sıcaklık/Nem", main_icon_size_px:34 },
          this._config||{}
        );
        this._form.addEventListener("value-changed",(e)=>this._onChange(e));
      }
    }
  }

  customElements.define(TAG, MiniTemperatureCard);
  customElements.define(EDITOR, MiniTemperatureCardEditor);
})();
