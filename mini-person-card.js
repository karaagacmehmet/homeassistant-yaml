// mini-person-card.js v1.8 — Orijinal YAML 1:1, button-card styles FIX, sağlam görsel editör

window.customCards = window.customCards || [];
window.customCards.push({
  type: "mini-person-card",
  name: "Mini Person Card",
  description:
    "Sol: tile(person) · Sağ: battery % ve e-posta script. Person/battery seç; script metin.",
  preview: true,
});

/* ==================== EDITÖR ==================== */
class MiniPersonCardEditor extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
  }
  setConfig(config) {
    this._config = { email_icon: "mdi:email-outline", script: "", ...config };
    this._render();
  }
  _render() {
    const schema = [
      { name: "person",  selector: { entity: { domain: "person" } } },
      { name: "battery", selector: { entity: { domain: "sensor" } } },
      { name: "script",  selector: { text: {} } },
      { name: "email_icon", selector: { icon: {} } },
    ];
    this.innerHTML = "";
    const form = document.createElement("ha-form");
    this._form = form;
    form.schema = schema;
    form.data = this._config || {};
    form.addEventListener("value-changed", (e) => {
      this._config = { ...this._config, ...e.detail.value };
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config } }));
    });
    if (this._hass) form.hass = this._hass;
    this.appendChild(form);
  }
}
if (!customElements.get("mini-person-card-editor")) {
  customElements.define("mini-person-card-editor", MiniPersonCardEditor);
}

/* ==================== KART ==================== */
class MiniPersonCard extends HTMLElement {
  static getConfigElement() { return document.createElement("mini-person-card-editor"); }
  static getStubConfig(hass) {
    const keys = Object.keys(hass?.states || {});
    const person  = keys.find((k)=>k.startsWith("person.")) || "person.home";
    const battery = keys.find((k)=>k.startsWith("sensor.") &&
      (hass.states[k].attributes.device_class === "battery" || k.endsWith("battery_level"))) || "sensor.battery";
    return { person, battery, script: "script.mehmet_notify_send" };
  }

  setConfig(config) {
    if (!config?.person || !config?.battery) throw new Error("Config gerekli: person ve battery zorunlu.");
    this._config = { email_icon: "mdi:email-outline", script: "", ...config };
    this._mount();
  }

  set hass(hass) { this._hass = hass; if (this._inner) this._inner.hass = hass; }
  get hass() { return this._hass; }

  async _mount() {
    // HACS kartları yüklensin
    const deps = ["button-card", "layout-card", "stack-in-card"];
    await Promise.all(
      deps.map(tag => customElements.get(tag) ? 0 : customElements.whenDefined(tag).catch(() => {}))
    );
    const helpers = await window.loadCardHelpers?.();
    if (!helpers) return;

    // ——— ORİJİNAL YAML’IN 1:1 OBJESİ ———
    const cfg = {
      type: "custom:stack-in-card",
      grid_options: { columns: 6, rows: "auto" },
      card_mod: { style: "ha-card { padding:0 !important; margin:0 !important; }" },
      cards: [
        {
          type: "custom:layout-card",
          layout_type: "grid",
          layout: {
            "grid-template-columns": "1fr 56px",
            padding: "0px",
            margin: "0px",
            "column-gap": "1px",
            "align-items": "start",
          },
          cards: [
            {
              type: "tile",
              entity: this._config.person,
              show_entity_picture: true,
              vertical: false,
              state_content: ["state", "last_changed"],
              card_mod: {
                style: `
                  :host { min-width: 0 !important; --tile-icon-size: 18px; padding:0 !important; margin:0 !important; }
                  ha-card { padding: 0 !important; box-shadow: none; border: none; margin:0 !important; background: transparent; }
                  :host ::part(container){ padding:0 !important; margin:0 !important; }
                  :host ::part(content){ padding:0 !important; margin:0 !important; }
                  .container, .content, .primary, .secondary { padding:0 !important; margin:0 !important; }
                `,
              },
            },
            {
              type: "custom:layout-card",
              layout_type: "grid",
              layout: {
                "grid-template-rows": "28px 28px",
                "row-gap": "0px",
                "margin": "0px",
                "padding": "0px",
                "justify-items": "end",
              },
              cards: [
                {
                  type: "custom:button-card",
                  entity: this._config.battery,
                  show_name: false,
                  show_icon: true,
                  show_state: true,
                  tap_action: { action: "more-info" },
                  card_mod: { style: ":host { justify-self: end !important; }" },
                  styles: {
                    card: [
                      { "border": "none" },
                      { "background": "none" },
                      { "box-shadow": "none" },
                      { "padding": "0" },
                    ],
                    grid: [
                      { "grid-template-areas": '"i s"' },
                      { "grid-template-columns": "16px 28px" },
                      { "align-items": "center" },
                      { "column-gap": "0px" },
                    ],
                    icon: [
                      { "width": "14px" },
                      { "height": "22px" },
                    ],
                    state: [
                      { "font-size": "11px" },
                      { "line-height": "1" },
                      { "white-space": "nowrap" },
                      { "text-align": "right" },
                    ],
                  },
                },
                {
                  type: "custom:button-card",
                  entity: this._config.script || "script.mehmet_notify_send",
                  icon: this._config.email_icon || "mdi:email-outline",
                  show_name: false,
                  tap_action: { action: "more-info" },
                  hold_action: { action: "call-service", service: this._config.script || "script.mehmet_notify_send" },
                  double_tap_action: { action: "call-service", service: this._config.script || "script.mehmet_notify_send" },
                  card_mod: { style: ":host { justify-self: end !important; }" },
                  styles: {
                    card: [
                      { "border": "none" },
                      { "background": "none" },
                      { "box-shadow": "none" },
                      { "padding": "0 !important" },
                      { "width": "24px" },
                      { "height": "24px" },
                    ],
                    icon: [
                      { "width": "16px" },
                      { "height": "16px" },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    };
    // ——— /ORİJİNAL OBJE ———

    const inner = await helpers.createCardElement(cfg);
    inner.hass = this.hass;
    inner.addEventListener("ll-rebuild", (e) => { e.stopPropagation(); this._mount(); });

    this._inner = inner;
    this.createRenderRoot?.();
    this._root().innerHTML = "";
    this._root().appendChild(inner);
  }

  // Light DOM: fazladan ha-card sarmayalım
  createRenderRoot() { return this; }
  _root() { return this; }
  getCardSize() { return this._inner?.getCardSize ? this._inner.getCardSize() : 1; }
}

if (!customElements.get("mini-person-card")) {
  customElements.define("mini-person-card", MiniPersonCard);
}
