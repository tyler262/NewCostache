/**
 * NewCostache — Fakes / Nukes / Fangs helper (in-game script)
 *
 * Loaded via a Tribal Wars Quickbar link:
 *   javascript:$.getScript('https://YOUR.workers.dev/script.js');void(0);
 *
 * Storage + script hosting live on a Cloudflare Worker (see docs/SETUP.md).
 * The link carries no secret: members paste a READ key once, leaders also paste
 * an ADMIN key. Keys are stored on-device only.
 *
 * This file is run on a TW game page, where `$` (jQuery), `game_data`, and the
 * `UI`/`Dialog` globals are already present.
 *
 *  >>> SET at deploy time to your worker URL (no trailing slash):
 */
const API_BASE = "https://tw-fakes.YOUR-SUBDOMAIN.workers.dev";

(function () {
  "use strict";

  if (typeof game_data === "undefined") {
    alert("Open this from a Tribal Wars game page (game.php...).");
    return;
  }

  /* ------------------------------------------------------------------ *
   *  Keys (stored on this device only)
   * ------------------------------------------------------------------ */
  const LS_READ_KEY = "newcostache_read_key";
  const LS_ADMIN_KEY = "newcostache_admin_key";
  const getReadKey = () => localStorage.getItem(LS_READ_KEY) || "";
  const getAdminKey = () => localStorage.getItem(LS_ADMIN_KEY) || "";
  const isAdmin = () => !!getAdminKey();

  /* ------------------------------------------------------------------ *
   *  Units / population (from the original)
   * ------------------------------------------------------------------ */
  const units = game_data.units;
  let unitsLength = units.length;
  if (units.includes("snob")) unitsLength--;
  if (units.includes("militia")) unitsLength--;
  if (units.includes("knight")) unitsLength--;

  const troupesPop = {
    spear: 1, sword: 1, axe: 1, archer: 1, spy: 2, light: 4,
    marcher: 5, heavy: 6, ram: 5, catapult: 8, knight: 10, snob: 100,
  };

  const nrTroopSelect = 13;

  /* ------------------------------------------------------------------ *
   *  Theme (static defaults for now; Phase 7 adds switching)
   * ------------------------------------------------------------------ */
  const textColor = "#ffffff";
  const backgroundInput = "#000000";
  const borderColor = "#C5979D";
  const backgroundContainer = "#2B193D";
  const backgroundHeader = "#2C365E";
  const backgroundMainTable = "#484D6D";
  const backgroundInnerTable = "#4B8F8C";
  const widthInterface = 50; // percent

  /* ------------------------------------------------------------------ *
   *  Worker API (replaces the old Dropbox read/write)
   * ------------------------------------------------------------------ */
  function readHeaders() {
    // Admin key satisfies reads too, so a leader needs only the admin key.
    return { "X-Read-Key": getReadKey() || getAdminKey() };
  }

  async function apiGetTabs() {
    const res = await fetch(`${API_BASE}/tabs`, {
      cache: "no-store",
      headers: readHeaders(),
    });
    if (res.status === 401) {
      const e = new Error("unauthorized");
      e.unauthorized = true;
      throw e;
    }
    if (!res.ok) throw new Error("tabs request failed: " + res.status);
    return res.json();
  }

  async function apiPutTab(id, body) {
    const res = await fetch(`${API_BASE}/tab/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Admin-Key": getAdminKey() },
      body: JSON.stringify(body),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.error || "publish failed");
    return out;
  }

  async function apiDeleteTab(id) {
    const res = await fetch(`${API_BASE}/tab/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "X-Admin-Key": getAdminKey() },
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.error || "delete failed");
    return out;
  }

  /* ------------------------------------------------------------------ *
   *  Small helpers
   * ------------------------------------------------------------------ */
  function httpGet(theUrl) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", theUrl, false); // sync, as in the original
    xhr.send(null);
    return xhr.responseText;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
    );
  }

  // Load the vendored localforage from the Worker (used by the engine cache).
  function loadLocalforage() {
    if (window.localforage) return Promise.resolve();
    return new Promise((resolve) => {
      $.getScript(`${API_BASE}/localforage.js`).always(() => resolve());
    });
  }

  /* ------------------------------------------------------------------ *
   *  Fake limit (used to disable irrelevant troop selects)
   * ------------------------------------------------------------------ */
  function getFakeLimit() {
    let fakeLimit = 0;
    const cached = localStorage.getItem(game_data.world + "fake_limit");
    if (cached != null) return parseInt(cached);
    try {
      const data = httpGet("/interface.php?func=get_config").split("\n");
      for (let i = 0; i < data.length; i++) {
        if (data[i].includes("fake_limit")) {
          fakeLimit = data[i].split("<fake_limit>")[1].split("</fake_limit>")[0];
          break;
        }
      }
    } catch (e) { /* leave at 0 */ }
    localStorage.setItem(game_data.world + "fake_limit", fakeLimit);
    return fakeLimit;
  }

  /* ------------------------------------------------------------------ *
   *  CSS (replaces the old Dropbox-hosted styleCSSGlobal.js)
   * ------------------------------------------------------------------ */
  function injectCSS() {
    const css = `
      .scriptContainer{position:fixed;top:60px;left:60px;z-index:99999;
        width:${widthInterface}%;background:${backgroundContainer};color:${textColor};
        border:2px solid ${borderColor};border-radius:8px;font:12px/1.4 Verdana,sans-serif;
        box-shadow:0 6px 26px rgba(0,0,0,.55)}
      .scriptHeader{position:relative;background:${backgroundHeader};color:${textColor};
        border-radius:6px 6px 0 0;padding:6px 10px;min-height:34px;cursor:move}
      .scriptHeader h2{margin:0;font-size:14px;text-align:center}
      .scriptFooter{padding:4px 10px;text-align:center;font-size:10px;opacity:.7}
      .scriptFooter h5{margin:4px 0}
      #div_body{padding:10px}
      .scriptContainer select,.scriptInput{background:${backgroundInput};color:${textColor};
        border:1px solid ${borderColor};border-radius:4px;padding:3px}
      .scriptTable{width:100%;border-collapse:collapse;background:${backgroundMainTable}}
      .scriptTable td{border:1px solid ${borderColor};text-align:center;padding:3px}
      .scriptTable img{vertical-align:middle}
      .scriptTableAlternate{border-collapse:collapse;background:${backgroundInnerTable};margin:0 auto}
      .scriptTableAlternate td{border:1px solid ${borderColor};padding:4px;text-align:center}
      .btn.evt-confirm-btn{cursor:pointer}
      .tab-panels .tabs{list-style:none;margin:8px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:2px}
      .tab-panels .tabs li{background:${backgroundHeader};color:${textColor};padding:4px 8px;
        border-radius:4px 4px 0 0;cursor:pointer;font-size:11px;display:flex;align-items:center;gap:4px}
      .tab-panels .tabs li.active{background:${backgroundInnerTable};font-weight:bold}
      .tab-panels .tabs li.li_tribe{background:#3a2a52}
      .tab-panels .tabs li.li_tribe.active{background:#5a3f86}
      .remove_tab{cursor:pointer}
      .panel{display:none;background:${backgroundMainTable};padding:8px;border-radius:0 4px 4px 4px}
      .panel.active{display:block}
      .panel textarea.scriptInput{width:100%;box-sizing:border-box;font:11px monospace}
      .tfh-meta{font-size:10px;opacity:.75;margin:2px 0}
      .tfh-err{color:#ff8a8a;font-weight:bold}
      .tfh-ok{color:#9be29b;font-weight:bold}
      .open_tab{margin:4px}
      .autocomplete-items{position:absolute;border:1px solid ${borderColor};z-index:100000;
        background:${backgroundInput};color:${textColor};max-height:160px;overflow:auto}
      .autocomplete-items div{padding:4px 6px;cursor:pointer}
      .autocomplete-active{background:${backgroundInnerTable}}
    `;
    const style = document.createElement("style");
    style.id = "newcostache-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ------------------------------------------------------------------ *
   *  Page guard (kept from the original checkPageRun)
   *   - on a rally point (screen=place): consume the queued "go to rally" launch
   *   - otherwise the engine needs overview_villages&mode=combined
   * ------------------------------------------------------------------ */
  function checkPageRun() {
    const href = window.location.href;
    if (href.includes("screen=place")) {
      const queued = JSON.parse(localStorage.getItem(game_data.world + "launchFakes") || "[]");
      if (queued.length > 0) {
        const current = queued.pop();
        localStorage.setItem(game_data.world + "launchFakes", JSON.stringify(queued));
        if (typeof UI !== "undefined") UI.SuccessMessage("left " + queued.length + " fakes", 1000);
        window.open(current, "_self");
        throw new Error("fake sent"); // stops the rest of the run, as in the original
      }
      return false; // place screen, nothing queued -> just show the panel
    }
    if (document.getElementById("combined_table") == null) {
      // Not fatal in Phase 2 (panel still opens); the engine will re-check.
      return false;
    }
    return true;
  }

  /* ================================================================== *
   *  INTERFACE
   * ================================================================== */
  function createMainInterface() {
    getFakeLimit(); // warm cache / used by select disabling below

    let html = `
    <div id="div_container" class="scriptContainer">
      <div class="scriptHeader">
        <h2>Fakes / Nukes / Fangs</h2>
        <div style="position:absolute;top:6px;right:8px;cursor:pointer" id="div_close">✖</div>
        <div style="position:absolute;top:6px;right:30px;cursor:pointer" id="div_minimize">▁</div>
        <div style="margin-top:4px;text-align:center" class="set_troops">
          <select id="select_type_attack">
            <option value="fakes">fakes</option>
            <option value="nukes">nukes</option>
            <option value="fangs">fangs</option>
          </select>
          <span id="tfh_role"></span>
        </div>
      </div>

      <div id="div_body" style="max-height:75vh;overflow-y:auto">
        <div id="tfh_login"></div>

        <table id="table_upload" class="scriptTable">
          <tr><td></td>`;
    for (const u of units) {
      if (u !== "militia" && u !== "snob") {
        html += `<td class="fm_unit hide_${u}"><img src="https://dsen.innogamescdn.com/asset/1d2499b/graphic/unit/unit_${u}.png"></td>`;
      }
    }

    // fakes: per-unit "min"/number selects
    html += `</tr><tr id="allSelectTroupes" class="set_troops hide_fakes"><td>send</td>`;
    for (const u of units) {
      if (u !== "militia" && u !== "snob") {
        html += `<td class="hide_${u}"><select id="${u}Troupe" class="allTroupes"><option value="min">min</option>`;
        for (let j = 0; j < nrTroopSelect; j++) html += `<option value="${j}">${j}</option>`;
        html += `</select></td>`;
      }
    }
    html += `</tr>
        <tr class="set_troops hide_fakes">
          <td colspan="6">fakes per village (interval mode)</td>
          <td colspan="3"><input class="scriptInput" type="number" id="nr_fakes_per_village" value="5"></td>
        </tr>
        <tr class="set_troops hide_fakes">
          <td colspan="3"><input type="checkbox" value="land_specific"> attacks land between:</td>
          <td colspan="3"><input type="datetime-local" class="start_window" style="text-align:center"></td>
          <td colspan="3"><input type="datetime-local" class="stop_window" style="text-align:center"></td>
        </tr>`;

    // nukes inputs
    html += `<tr class="set_troops hide_nukes allinputTroops"><td>send</td>`;
    for (const u of units) if (u !== "militia" && u !== "snob")
      html += `<td class="hide_${u}"><input class="scriptInput" type="number" value="0"></td>`;
    html += `</tr><tr class="set_troops hide_nukes allinputTroopsRes"><td>reserve</td>`;
    for (const u of units) if (u !== "militia" && u !== "snob")
      html += `<td class="hide_${u}"><input class="scriptInput" type="number" value="0"></td>`;
    html += `</tr>
        <tr class="set_troops hide_nukes">
          <td colspan="5">min population (nukes/fangs)</td>
          <td colspan="4"><input class="scriptInput min_pop" type="number" value="500"></td>
        </tr>
        <tr class="set_troops hide_nukes">
          <td colspan="3"><input type="checkbox" value="land_specific"> attacks land between:</td>
          <td colspan="3"><input type="datetime-local" class="start_window" style="text-align:center"></td>
          <td colspan="3"><input type="datetime-local" class="stop_window" style="text-align:center"></td>
        </tr>`;

    // fangs inputs
    html += `<tr class="set_troops hide_fangs allinputTroops"><td>send</td>`;
    for (const u of units) if (u !== "militia" && u !== "snob")
      html += `<td class="hide_${u}"><input class="scriptInput" type="number" value="0"></td>`;
    html += `</tr><tr class="set_troops hide_fangs allinputTroopsRes"><td>reserve</td>`;
    for (const u of units) if (u !== "militia" && u !== "snob")
      html += `<td class="hide_${u}"><input class="scriptInput" type="number" value="0"></td>`;
    html += `</tr>
        <tr class="set_troops hide_fangs">
          <td colspan="5">min population (nukes/fangs)</td>
          <td colspan="4"><input class="scriptInput min_pop" type="number" value="500"></td>
        </tr>
        <tr class="set_troops hide_fangs">
          <td colspan="3"><input type="checkbox" value="land_specific"> attacks land between:</td>
          <td colspan="3"><input type="datetime-local" class="start_window" style="text-align:center"></td>
          <td colspan="3"><input type="datetime-local" class="stop_window" style="text-align:center"></td>
        </tr>
        </table>

        <div class="tab-panels" id="tabs_coord">
          <ul class="tabs" id="strip_own">
            <li class="update_tab own active" rel="panelOwn0"><font>my list</font>
              <img class="remove_tab" src="https://img.icons8.com/doodle/16/000000/delete-sign.png"></li>
            <li id="add_tab"><img src="https://img.icons8.com/color/16/000000/add-tab.png"></li>
          </ul>
          <div id="all_tabs">
            <div id="panelOwn0" class="panel own active">
              <p style="font-weight:bold">nr coords: 0</p>
              <textarea class="scriptInput" rows="9" placeholder="500|512 501|498 ..."></textarea>
            </div>
          </div>
          <div id="div_get_coords" style="margin:10px" hidden></div>
          <ul class="tabs" id="strip_tribe"></ul>
          <div id="all_tribe_tabs"></div>

          <br>
          <table class="scriptTableAlternate" style="width:96%">
            <tr>
              <td class="hide_fakes">nr fakes:</td>
              <td class="hide_fakes"><input class="scriptInput" id="nr_fakes" type="number" value="1"></td>
              <td></td><td></td>
            </tr>
            <tr>
              <td>split tabs:</td>
              <td><input class="scriptInput" id="nr_split" type="number" value="20"></td>
              <td>
                <select id="select_option_fakes">
                  <option value="open tabs">open tabs</option>
                  <option value="go to rally">go to rally</option>
                </select>
              </td>
              <td><input class="btn evt-confirm-btn" type="button" id="btn_start" value="Start"></td>
            </tr>
            <tr>
              <td>delay open tabs[ms]:</td>
              <td><input class="scriptInput" id="delay_tabs" type="number" value="200"></td>
              <td><input class="btn evt-confirm-btn hide_btn_show" type="button" id="btn_show" value="Show" style="display:none"></td>
              <td><input class="btn evt-confirm-btn hide_btn_delete" type="button" id="btn_delete" value="Delete" style="display:none"></td>
            </tr>
          </table>

          <div id="div_open_tabs"><h3 style="text-align:center;margin:8px">Open Tabs</h3></div>
        </div>
      </div>
      <div class="scriptFooter"><h5>NewCostache — built on Costache's script</h5></div>
    </div>`;

    $("#div_container").remove();
    const host = $("#contentContainer").length ? $("#contentContainer").eq(0) : $("body");
    host.prepend(html);
    $("#mobileContent").eq(0).prepend(""); // no-op safety on mobile layouts

    if ($.fn.draggable) {
      try { $("#div_container").draggable({ handle: ".scriptHeader" }); } catch (e) {}
    }

    // header buttons
    $("#div_close").on("click", () => $("#div_container").remove());
    $("#div_minimize").on("click", () => $("#div_body").toggle());

    // disable non-spy/ram/cat fake selects when there's no fake limit
    if (parseInt(getFakeLimit()) === 0) {
      for (const u of units) {
        if (u !== "spy" && u !== "ram" && u !== "catapult") {
          $(`#${u}Troupe`).attr("disabled", true);
        }
      }
    }

    $("#tfh_role").text(isAdmin() ? " (leader)" : "");
  }

  /* ------------------------------------------------------------------ *
   *  Personal tabs (localStorage) — ported from the original
   * ------------------------------------------------------------------ */
  function addEventPanel() {
    $("#strip_own li").each((i, item) => { if (item.id !== "add_tab") $(item).off("click"); });
    $("#strip_own li").not("#add_tab").on("click", function (event) {
      if (event.target.tagName === "IMG") return; // delete icon handles itself
      if (!$(this).hasClass("active")) {
        $("#strip_own li.active, #strip_tribe li.active").removeClass("active");
        $("#all_tabs .panel.active, #all_tribe_tabs .panel.active").removeClass("active");
        $(this).addClass("active");
        $("#" + $(this).attr("rel")).addClass("active");
      } else {
        const value = window.prompt("rename tab");
        if (value) {
          if (this.children.length > 0) this.children[0].innerText = value;
          else this.innerText = value;
          saveOwnData();
        }
      }
    });
  }

  function addNewPanel() {
    $("#add_tab").on("click", function () {
      const ids = $("#strip_own li.own").map((i, el) => parseInt($(el).attr("rel").replace("panelOwn", ""))).get();
      const idNew = (ids.length ? Math.max(...ids) : -1) + 1;
      $("#add_tab").before(
        `<li class="update_tab own" rel="panelOwn${idNew}"><font>list ${idNew}</font>` +
        `<img class="remove_tab" src="https://img.icons8.com/doodle/16/000000/delete-sign.png"></li>`
      );
      $("#all_tabs").append(
        `<div id="panelOwn${idNew}" class="panel own"><p style="font-weight:bold">nr coords: 0</p>` +
        `<textarea class="scriptInput" rows="9"></textarea></div>`
      );
      addEventPanel();
      removePanel();
      getCoordsEvent();
    });
  }

  function removePanel() {
    $(".remove_tab").off("click");
    $(".remove_tab").on("click", function () {
      if ($("#strip_own li.own").length <= 1) return; // keep at least one
      if (window.confirm("remove this list?")) {
        const rel = $(this).parent().attr("rel");
        const wasActive = $(this).parent().hasClass("active");
        $(this).parent().remove();
        $("#" + rel).remove();
        if (wasActive) {
          const last = $("#strip_own li.own").last();
          last.addClass("active");
          $("#" + last.attr("rel")).addClass("active");
        }
        saveOwnData();
      }
    });
  }

  function getCoordsEvent() {
    $("#all_tabs .panel").off("mouseout");
    $("#all_tabs .panel").on("mouseout", function () {
      const ta = this.getElementsByTagName("textarea")[0];
      const coords = (ta.value.match(/\d+\|\d+/g)) || [];
      ta.value = coords.join(" ");
      $(this).find("p").first().text("nr coords: " + coords.length);
      saveOwnData();
    });
  }

  function saveOwnData() {
    const list = [];
    $("#strip_own li.own").each(function (i) {
      const name = $(this).text().trim();
      const ta = $("#" + $(this).attr("rel")).find("textarea");
      list.push({ name, coords: ta.val() || "" });
    });
    localStorage.setItem(game_data.world + "ownTabs", JSON.stringify(list));
  }

  function initializationOwnTabs() {
    const saved = JSON.parse(localStorage.getItem(game_data.world + "ownTabs") || "[]");
    if (saved.length > 0) {
      // rebuild from saved
      $("#strip_own li.own").remove();
      $("#all_tabs .panel.own").remove();
      saved.forEach((t, idx) => {
        const coords = (t.coords || "").match(/\d+\|\d+/g) || [];
        $("#add_tab").before(
          `<li class="update_tab own ${idx === 0 ? "active" : ""}" rel="panelOwn${idx}"><font>${esc(t.name || "list " + idx)}</font>` +
          `<img class="remove_tab" src="https://img.icons8.com/doodle/16/000000/delete-sign.png"></li>`
        );
        $("#all_tabs").append(
          `<div id="panelOwn${idx}" class="panel own ${idx === 0 ? "active" : ""}"><p style="font-weight:bold">nr coords: ${coords.length}</p>` +
          `<textarea class="scriptInput" rows="9">${esc(coords.join(" "))}</textarea></div>`
        );
      });
    }
    addEventPanel();
    removePanel();
    getCoordsEvent();
  }

  /* ------------------------------------------------------------------ *
   *  Controls persistence — ported
   * ------------------------------------------------------------------ */
  function saveNrFakes() {
    const bind = (id, min, def) => {
      const el = document.getElementById(id);
      el.addEventListener("mouseout", () => {
        if (el.value < min || el.value === "") el.value = def;
        localStorage.setItem(game_data.world + id, el.value);
      });
    };
    bind("nr_fakes", 0, 1);
    bind("nr_split", 0, 20);
    bind("delay_tabs", 200, 200);
  }

  function initializationNrFakes() {
    [["nr_fakes"], ["nr_split"], ["delay_tabs"]].forEach(([id]) => {
      const v = localStorage.getItem(game_data.world + id);
      if (v != null) document.getElementById(id).value = v;
    });
  }

  function applyAttackTypeVisibility() {
    const t = document.getElementById("select_type_attack").value;
    $(".hide_fakes,.hide_nukes,.hide_fangs").show();
    $(".hide_knight,.hide_snob").show();
    if (t === "fakes") {
      $(".hide_nukes,.hide_fangs").hide();
      $(".hide_knight,.hide_snob").hide();
      $(".hide_btn_delete").hide();
    } else if (t === "nukes") {
      $(".hide_fakes,.hide_fangs").hide();
    } else {
      $(".hide_fakes,.hide_nukes").hide();
    }
  }

  function initializationTroupes() {
    const KEY = game_data.world + "troopTemplatesFakes";
    if (localStorage.getItem(KEY) != null) {
      const [cbs, sels, nums, dts] = JSON.parse(localStorage.getItem(KEY));
      $(".set_troops input[type=checkbox]").each(function (i) { this.checked = cbs[i]; });
      $(".set_troops select").each(function (i) { if (sels[i] != null) this.value = sels[i]; });
      $(".set_troops input[type=number]").each(function (i) { if (nums[i] != null) this.value = nums[i]; });
      $(".set_troops input[type=datetime-local]").each(function (i) { if (dts[i] != null) this.value = dts[i]; });
    }

    $(".set_troops select, .set_troops input[type=number], .set_troops input[type=checkbox], .set_troops input[type=datetime-local]")
      .on("click input change", () => {
        const cbs = $(".set_troops input[type=checkbox]").map((i, e) => e.checked).get();
        const sels = $(".set_troops select").map((i, e) => e.value).get();
        const nums = $(".set_troops input[type=number]").map((i, e) => e.value).get();
        const dts = $(".set_troops input[type=datetime-local]").map((i, e) => e.value).get();
        localStorage.setItem(KEY, JSON.stringify([cbs, sels, nums, dts]));
        applyAttackTypeVisibility();
      });

    applyAttackTypeVisibility();
  }

  function initializationOptionAttack() {
    const stored = localStorage.getItem(game_data.world + "optionAttack");
    if (stored) document.getElementById("select_option_fakes").value = stored;
    $("#select_option_fakes").on("change", () => {
      localStorage.setItem(game_data.world + "optionAttack", document.getElementById("select_option_fakes").value);
    });
  }

  /* ------------------------------------------------------------------ *
   *  Shared tabs (Worker) — replaces getCoordDropbox/saveCoordDropbox
   * ------------------------------------------------------------------ */
  function renderTribeTab(tab) {
    const id = tab.id;
    const coords = (tab.coords || "").match(/\d+\|\d+/g) || [];
    $("#strip_tribe").append(
      `<li class="li_tribe" rel="panelTribe_${esc(id)}"><font>${esc(tab.name || id)}</font></li>`
    );
    const meta = tab.updated
      ? `saved by ${esc(tab.by || "?")} on ${esc(new Date(tab.updated).toLocaleString())}`
      : "not saved yet";
    let adminControls = "";
    if (isAdmin()) {
      adminControls = `
        <div style="margin-top:6px">
          <input class="btn evt-confirm-btn tribe_save" type="button" value="Publish" data-id="${esc(id)}">
          <input class="btn evt-confirm-btn tribe_delete" type="button" value="Delete" data-id="${esc(id)}">
          <span class="tfh-meta tribe_status"></span>
        </div>`;
    }
    $("#all_tribe_tabs").append(
      `<div id="panelTribe_${esc(id)}" class="panel">
        <p class="tfh-meta tribe_meta">${meta}</p>
        <p style="font-weight:bold">nr coords: ${coords.length}</p>
        <textarea class="scriptInput" rows="9" ${isAdmin() ? "" : "readonly"}>${esc(coords.join(" "))}</textarea>
        ${adminControls}
      </div>`
    );
  }

  function wireTribeTabEvents() {
    $("#strip_tribe li").off("click").on("click", function () {
      if ($(this).hasClass("active")) return;
      $("#strip_own li.active, #strip_tribe li.active").removeClass("active");
      $("#all_tabs .panel.active, #all_tribe_tabs .panel.active").removeClass("active");
      $(this).addClass("active");
      $("#" + $(this).attr("rel")).addClass("active");
    });

    $(".tribe_save").off("click").on("click", async function () {
      const id = this.dataset.id;
      const panel = document.getElementById("panelTribe_" + id);
      const status = panel.querySelector(".tribe_status");
      const coords = panel.querySelector("textarea").value;
      const name = $(`#strip_tribe li[rel="panelTribe_${id}"]`).text().trim() || id;
      status.className = "tfh-meta tribe_status";
      status.textContent = "Publishing…";
      try {
        const out = await apiPutTab(id, { name, coords, by: game_data.player.name });
        status.className = "tfh-ok tribe_status";
        status.textContent = `Published ${out.count} coord(s).`;
      } catch (e) {
        status.className = "tfh-err tribe_status";
        status.textContent = e.message || "Publish failed.";
      }
    });

    $(".tribe_delete").off("click").on("click", async function () {
      const id = this.dataset.id;
      if (!window.confirm(`Delete shared tab "${id}"?`)) return;
      try {
        await apiDeleteTab(id);
        loadSharedTabs();
      } catch (e) {
        alert(e.message || "Delete failed.");
      }
    });
  }

  async function loadSharedTabs() {
    $("#strip_tribe").empty();
    $("#all_tribe_tabs").empty();
    let data;
    try {
      data = await apiGetTabs();
    } catch (e) {
      if (e.unauthorized) {
        $("#strip_tribe").html(`<li class="tfh-err" style="background:none">read key needed — see login above</li>`);
        showLogin(true);
        return;
      }
      $("#strip_tribe").html(`<li class="tfh-err" style="background:none">couldn't reach the server</li>`);
      return;
    }
    const tabs = data.tabs || [];
    tabs.forEach(renderTribeTab);

    if (isAdmin()) {
      $("#strip_tribe").append(`<li id="add_tribe_tab" title="new shared tab">＋shared</li>`);
      $("#add_tribe_tab").on("click", async () => {
        const id = (window.prompt("New shared tab id (letters/numbers, e.g. front1):") || "").trim();
        if (!id) return;
        if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) { alert("id must be letters/numbers/_/-"); return; }
        try {
          await apiPutTab(id, { name: id, coords: "", by: game_data.player.name });
          loadSharedTabs();
        } catch (e) { alert(e.message || "create failed"); }
      });
    }
    wireTribeTabEvents();
  }

  /* ------------------------------------------------------------------ *
   *  Login UI (read key for members, admin key for leaders)
   * ------------------------------------------------------------------ */
  function showLogin(forceOpen) {
    const open = forceOpen || (!getReadKey() && !getAdminKey());
    $("#tfh_login").html(`
      <details class="tfh-sub" ${open ? "open" : ""} style="margin-bottom:8px">
        <summary style="cursor:pointer;font-weight:bold">Keys (read / leader)</summary>
        <div style="margin-top:6px">
          <div class="tfh-meta">Read key (everyone, paste once):</div>
          <input type="password" id="tfh_readin" class="scriptInput" style="width:100%;box-sizing:border-box" value="${esc(getReadKey())}">
          <div class="tfh-meta" style="margin-top:6px">Admin key (leaders only):</div>
          <input type="password" id="tfh_adminin" class="scriptInput" style="width:100%;box-sizing:border-box" value="${esc(getAdminKey())}">
          <div style="margin-top:6px">
            <input class="btn evt-confirm-btn" type="button" id="tfh_savekeys" value="Save keys on this device">
            <input class="btn evt-confirm-btn" type="button" id="tfh_forgetkeys" value="Forget">
          </div>
          <div class="tfh-meta">Stored only on this device.</div>
        </div>
      </details>`);

    $("#tfh_savekeys").on("click", () => {
      const r = document.getElementById("tfh_readin").value.trim();
      const a = document.getElementById("tfh_adminin").value.trim();
      if (r) localStorage.setItem(LS_READ_KEY, r); else localStorage.removeItem(LS_READ_KEY);
      if (a) localStorage.setItem(LS_ADMIN_KEY, a); else localStorage.removeItem(LS_ADMIN_KEY);
      $("#tfh_role").text(isAdmin() ? " (leader)" : "");
      loadSharedTabs();
    });
    $("#tfh_forgetkeys").on("click", () => {
      localStorage.removeItem(LS_READ_KEY);
      localStorage.removeItem(LS_ADMIN_KEY);
      showLogin(true);
      loadSharedTabs();
    });
  }

  /* ================================================================== *
   *  ENGINE — speeds, distance, village info cache
   * ================================================================== */
  function getSpeedConstant() {
    const cached = localStorage.getItem(game_data.world + "speedWorld");
    if (cached !== null) return JSON.parse(cached);
    const data = httpGet("/interface.php?func=get_config");
    const doc = new DOMParser().parseFromString(data, "text/html");
    const obj = {
      worldSpeed: Number(doc.getElementsByTagName("speed")[0].innerHTML),
      unitSpeed: Number(doc.getElementsByTagName("unit_speed")[0].innerHTML),
    };
    localStorage.setItem(game_data.world + "speedWorld", JSON.stringify(obj));
    return obj;
  }

  let _speeds = null;
  function getSpeeds() {
    if (_speeds) return _speeds;
    const c = getSpeedConstant();
    const f = (base) => (base * 1000) / (c.worldSpeed * c.unitSpeed); // ms per field
    _speeds = {
      noble: f(2100), ram: f(1800), sword: f(1320),
      axe: f(1080), light: f(600), scout: f(540),
    };
    return _speeds;
  }

  function calcDistance(c1, c2) {
    const [x1, y1] = c1.split("|").map(Number);
    const [x2, y2] = c2.split("|").map(Number);
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
  }

  function shuffleArray(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
  }

  function parseDate(time) {
    const d = new Date(time);
    const p = (n) => ("00" + n).slice(-2);
    return `${p(d.getMonth() + 1)}/${p(d.getDate())}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  }

  function serverNowMs() {
    const t = document.getElementById("serverTime").innerText;
    const d = document.getElementById("serverDate").innerText.split("/"); // dd/mm/yyyy
    return new Date(`${d[1]}/${d[0]}/${d[2]} ${t}`).getTime();
  }

  function calculateLandingTime(origin, target, speedTroop) {
    return parseDate(serverNowMs() + calcDistance(origin, target) * speedTroop);
  }

  function innoReplaceSpecialCaracters(text) {
    return text
      .replaceAll("+", " ").replaceAll("%21", "!").replaceAll("%23", "#")
      .replaceAll("%24", "$").replaceAll("%25", "%").replaceAll("%28", "(")
      .replaceAll("%29", ")").replaceAll("%2A", "*").replaceAll("%2B", "+")
      .replaceAll("%2C", ",").replaceAll("%2F ", "/").replaceAll("%3A", ":")
      .replaceAll("%3D", "=").replaceAll("%3F", "?").replaceAll("%40", "@")
      .replaceAll("%5B", "[").replaceAll("%5D", "]").replaceAll("%7C", "|");
  }

  function replaceSpecialCaracters(data) {
    const map = { "ț": "t", "Ț": "T", "Ă": "A", "ă": "a", "Â": "A", "Ș": "S", "ș": "s", "Î": "I", "î": "i" };
    let out = "";
    for (const ch of data) out += map[ch] != null ? map[ch] : ch;
    return out;
  }

  // Coord -> village info, cached in IndexedDB (localforage), refreshed hourly.
  async function getInfoVillages() {
    const cacheKey = game_data.world + "infoVillages";
    const url = window.location.href.split("/game.php")[0];
    const currentMs = serverNowMs();

    const build = () => {
      const dataVillage = httpGet(url + "/map/village.txt").split(/\r?\n/);
      const dataPlayer = httpGet(url + "/map/player.txt").split(/\r?\n/);
      const dataAlly = httpGet(url + "/map/ally.txt").split(/\r?\n/);
      const mapAlly = new Map();
      const mapPlayer = new Map();
      const mapVillage = new Map();
      for (let i = 0; i < dataAlly.length - 1; i++) {
        const c = dataAlly[i].split(",");
        mapAlly.set(c[0], innoReplaceSpecialCaracters(c[1]));
      }
      for (let i = 0; i < dataPlayer.length - 1; i++) {
        const c = dataPlayer[i].split(",");
        mapPlayer.set(c[0], {
          allyId: c[2],
          playerName: innoReplaceSpecialCaracters(c[1]),
          tribeName: mapAlly.get(c[2]) == undefined ? "none" : mapAlly.get(c[2]),
        });
      }
      for (let i = 0; i < dataVillage.length; i++) {
        const c = dataVillage[i].split(",");
        const p = mapPlayer.get(c[4]);
        if (p != undefined) {
          mapVillage.set(c[2] + "|" + c[3], {
            villageId: c[0], playerId: c[4], points: c[5],
            allyId: p.allyId, playerName: p.playerName, tribeName: p.tribeName,
          });
        }
      }
      return mapVillage;
    };

    let mapVillage;
    const cached = window.localforage ? await window.localforage.getItem(cacheKey).catch(() => null) : null;
    if (cached == undefined) {
      mapVillage = build();
      const payload = replaceSpecialCaracters(JSON.stringify({ datetime: currentMs, data: Array.from(mapVillage.entries()) }));
      if (window.localforage) await window.localforage.setItem(cacheKey, payload).catch(() => {});
    } else {
      const obj = JSON.parse(cached);
      mapVillage = new Map(obj.data);
      if (currentMs - new Date(obj.datetime).getTime() > 3600 * 1000) {
        mapVillage = build();
        const payload = replaceSpecialCaracters(JSON.stringify({ datetime: currentMs, data: Array.from(mapVillage.entries()) }));
        if (window.localforage) await window.localforage.setItem(cacheKey, payload).catch(() => {});
      }
    }
    return mapVillage;
  }

  /* ------------------------------------------------------------------ *
   *  startFakes — FAKES path (nukes/fangs land in Phase 4;
   *  night-bonus + land-window land in Phase 6)
   * ------------------------------------------------------------------ */
  async function startFakes() {
    const selectAttack = document.getElementById("select_type_attack").value;
    if (document.getElementById("combined_table") == null) {
      alert("Run this from Overview → Combined (overview_villages&mode=combined).");
      window.location.href = game_data.link_base_pure + "overview_villages&mode=combined";
      return;
    }
    if ($(".set_troops input[type=checkbox][value=land_specific]:visible").prop("checked")) {
      UI.SuccessMessage("Landing window isn't enabled yet (Phase 6) — sending without it.", 2500);
    }

    try {
      const speeds = getSpeeds();
      const mapInfoVillages = await getInfoVillages();
      const selectMod = document.getElementById("select_option_fakes").value;

      let nrFakes = parseInt(document.getElementById("nr_fakes").value);
      let nrSplits = parseInt(document.getElementById("nr_split").value);
      let nrFakesPerVillage = parseInt(document.getElementById("nr_fakes_per_village").value);
      nrSplits = Number.isNaN(nrSplits) || nrSplits === 0 ? 5 : nrSplits;
      nrFakes = Number.isNaN(nrFakes) || nrFakes === 0 ? 1 : nrFakes;
      nrFakesPerVillage = Number.isNaN(nrFakesPerVillage) || nrFakesPerVillage === 0 ? 4 : nrFakesPerVillage;
      nrFakesPerVillage--;

      // No ally list in this model -> nothing filtered out as "ally". (See README.)
      const ally_tribe = [];

      // If re-running after opening a batch, refresh the combined table HTML.
      if (document.getElementsByClassName("open_tab").length > 0) {
        const text = httpGet(window.location.href);
        const table = text.match(/<table id="combined_table"((.|\n)+)/)[0].split("</table>")[0] + "</table>";
        document.getElementById("combined_table").innerHTML = table;
      }

      // --- read the per-unit "send" template (min/number) ---
      const mapTroupes = new Map();
      for (let i = 0; i < unitsLength; i++) {
        mapTroupes.set(units[i], document.getElementById(units[i] + "Troupe").value);
      }

      const limitFake = getFakeLimit() / 100;
      const table = document.getElementById("combined_table").getElementsByTagName("tr");
      const listFakesTemplate = [];

      if (selectAttack !== "fakes") {
        // --- nukes / fangs: send up to (available - reserve), keep if pop >= minPop ---
        const minPop = (() => {
          const v = parseInt($(".min_pop:visible").val());
          return Number.isNaN(v) || v === 0 ? 200 : v;
        })();
        const send_troops = Array.from($(".allinputTroops input:visible")).map((e) => parseInt(e.value));
        const reserve_troops = Array.from($(".allinputTroopsRes input:visible")).map((e) => parseInt(e.value));
        for (let i = 0; i < send_troops.length; i++) {
          send_troops[i] = Number.isNaN(send_troops[i]) || send_troops[i] < 0 ? 0 : send_troops[i];
          reserve_troops[i] = Number.isNaN(reserve_troops[i]) || reserve_troops[i] < 0 ? 0 : reserve_troops[i];
        }

        for (let i = 1; i < table.length; i++) {
          const vectorTroupes = Array.from(table[i].getElementsByClassName("unit-item")).map((e) => parseInt(e.innerText));
          const currentCoord = table[i].getElementsByClassName("quickedit-label")[0].innerText.match(/\d+\|\d+/)[0];
          const linkBase = table[i].getElementsByClassName("quickedit-content")[0].getElementsByTagName("a")[0].href.replace("overview", "place");

          const availableTroupes = {};
          let pop = 0;
          for (let j = 0; j < send_troops.length; j++) {
            const name = units[j];
            const avail = vectorTroupes[j] - reserve_troops[j];
            let v = Math.min(avail, send_troops[j]);
            v = v <= 0 ? 0 : v;
            availableTroupes[name] = v;
            pop += troupesPop[name] * v;
          }

          // slowest present unit sets the speed
          let speedTroop = speeds.ram;
          if (availableTroupes["snob"] > 0) speedTroop = speeds.noble;
          else if (availableTroupes["ram"] > 0 || availableTroupes["catapult"] > 0) speedTroop = speeds.ram;
          else if (availableTroupes["sword"] > 0) speedTroop = speeds.sword;
          else if (availableTroupes["spear"] > 0 || availableTroupes["axe"] > 0 || availableTroupes["archer"] > 0) speedTroop = speeds.axe;
          else if (availableTroupes["light"] > 0 || availableTroupes["heavy"] > 0 || availableTroupes["marcher"] > 0) speedTroop = speeds.axe;
          else speedTroop = speeds.scout;

          if (pop >= minPop) {
            listFakesTemplate.push({
              templateFakes: availableTroupes, linkBase, coordOrigin: currentCoord,
              speedTroop, nrFakes: 1, nrCells: send_troops.length,
            });
          }
        }
      } else if (limitFake > 0) {
        // Build a minimal-population fake template that still clears the fake limit.
        for (let i = 1; i < table.length; i++) {
          const vectorTroupes = Array.from(table[i].getElementsByClassName("unit-item")).map((e) => parseInt(e.innerText));
          const currentCoord = table[i].getElementsByClassName("quickedit-label")[0].innerText.match(/\d+\|\d+/)[0];
          const linkBase = table[i].getElementsByClassName("quickedit-content")[0].getElementsByTagName("a")[0].href.replace("overview", "place");
          const info = mapInfoVillages.get(currentCoord);
          if (!info) continue;
          const limitPop = parseInt(info.points * limitFake) + 10;

          const availableTroupes = {};
          let totalPop = 0;
          Array.from(mapTroupes.keys()).forEach((key, index) => {
            const sel = mapTroupes.get(key);
            const cur = vectorTroupes[index];
            if (sel != 0 && cur > nrFakes) {
              if (sel > 0 && cur >= sel * nrFakes) {
                availableTroupes[key] = { value: sel * nrFakes, static: "true" };
                totalPop += nrFakes * troupesPop[key] * sel;
              } else {
                availableTroupes[key] = { value: cur, static: "false" };
                totalPop += cur * troupesPop[key];
              }
            }
          });

          const availableFakesTotal = totalPop / limitPop;
          const templateFakes = {};
          let totalPopTemplate = 0;
          Object.keys(availableTroupes).forEach((key) => {
            if (availableFakesTotal > 1.2) {
              const t = availableTroupes[key];
              const troupe = t.static === "false"
                ? Math.ceil(t.value / availableFakesTotal)
                : t.value / nrFakes;
              templateFakes[key] = troupe;
              totalPopTemplate += troupe * troupesPop[key];
            }
          });

          for (let k = 0; k < 30; k++) {
            Object.keys(templateFakes).forEach((key) => {
              const pop = troupesPop[key];
              if (totalPopTemplate - limitPop >= 1 && pop === 1) { templateFakes[key]--; totalPopTemplate -= 1; }
              if (totalPopTemplate - limitPop >= 2 && pop === 2 && k % 2 === 0 && availableTroupes[key].static === "false") { templateFakes[key]--; totalPopTemplate -= 2; }
              if (totalPopTemplate - limitPop >= 4 && pop === 4 && k % 2 === 0) { templateFakes[key]--; totalPopTemplate -= 4; }
              if (totalPopTemplate - limitPop >= 6 && pop === 6 && k % 4 === 0) { templateFakes[key]--; totalPopTemplate -= 6; }
              if (totalPopTemplate - limitPop >= 5 && pop === 5 && k % 5 === 0 && templateFakes[key] > 1) { templateFakes[key]--; totalPopTemplate -= 5; }
              if (totalPopTemplate - limitPop >= 8 && pop === 8 && k % 5 === 0 && templateFakes[key] > 1) { templateFakes[key]--; totalPopTemplate -= 8; }
              if (templateFakes[key] === 0) delete templateFakes[key];
            });
            if (totalPopTemplate === limitPop) break;
          }

          const minFakes = Math.min(nrFakes, parseInt(availableFakesTotal));
          if (availableFakesTotal > 1.2 && (templateFakes["ram"] >= 1 || templateFakes["catapult"] >= 1)) {
            listFakesTemplate.push({
              templateFakes, nrFakes: minFakes, limitPop, totalPopTemplate,
              linkBase, coordOrigin: currentCoord, speedTroop: speeds.ram, nrCells: mapTroupes.size,
            });
          }
        }
      } else {
        // No fake limit: just send the chosen spy/ram/cat counts.
        for (let i = 1; i < table.length; i++) {
          const vectorTroupes = Array.from(table[i].getElementsByClassName("unit-item")).map((e) => parseInt(e.innerText));
          const currentCoord = table[i].getElementsByClassName("quickedit-label")[0].innerText.match(/\d+\|\d+/)[0];
          const linkBase = table[i].getElementsByClassName("quickedit-content")[0].getElementsByTagName("a")[0].href.replace("overview", "place");
          const availableTroupes = {};
          Array.from(mapTroupes.keys()).forEach((key, index) => {
            const sel = mapTroupes.get(key);
            const cur = vectorTroupes[index];
            if (sel > 0 && sel !== "min" && (key === "spy" || key === "ram" || key === "catapult")) {
              if (cur >= sel * nrFakes) availableTroupes[key] = sel * nrFakes;
            }
          });
          const templateFakes = {};
          if (availableTroupes["spy"] >= nrFakes && availableTroupes["ram"] >= nrFakes) {
            templateFakes["spy"] = parseInt(availableTroupes["spy"] / nrFakes);
            templateFakes["ram"] = parseInt(availableTroupes["ram"] / nrFakes);
          } else if (availableTroupes["spy"] >= nrFakes && availableTroupes["catapult"] >= nrFakes) {
            templateFakes["spy"] = parseInt(availableTroupes["spy"] / nrFakes);
            templateFakes["catapult"] = parseInt(availableTroupes["catapult"] / nrFakes);
          } else if (availableTroupes["ram"] >= nrFakes) {
            templateFakes["ram"] = parseInt(availableTroupes["ram"] / nrFakes);
          } else if (availableTroupes["catapult"] >= nrFakes) {
            templateFakes["catapult"] = parseInt(availableTroupes["catapult"] / nrFakes);
          }
          if (templateFakes["ram"] >= 1 || templateFakes["catapult"] >= 1) {
            listFakesTemplate.push({
              templateFakes, nrFakes, limitPop: 0, totalPopTemplate: 0,
              linkBase, coordOrigin: currentCoord, speedTroop: speeds.ram, nrCells: mapTroupes.size,
            });
          }
        }
      }

      shuffleArray(listFakesTemplate);

      // --- target coords from the active tab ---
      const activePanel = document.getElementsByClassName("panel active")[0];
      let list_coords = activePanel ? (activePanel.getElementsByTagName("textarea")[0].value.match(/\d+\|\d+/g) || []) : [];
      if (list_coords.length === 0) { UI.ErrorMessage("No target coords in the active tab.", 2000); return; }
      if (selectAttack === "fakes") list_coords = Array.from(new Set(list_coords)); // dedupe for fakes only

      // drop non-existent, barbs, and (if any) allied villages
      list_coords = list_coords.filter((c) => {
        const info = mapInfoVillages.get(c);
        if (!info || info.playerId === "0") return false;
        if (ally_tribe.length && ally_tribe.includes(info.allyId)) return false;
        return true;
      });
      if (list_coords.length === 0) { UI.ErrorMessage("No valid targets after filtering.", 2000); return; }
      shuffleArray(list_coords);

      // --- distribute (bonus off / window off) ---
      const list_href = [];
      const list_info_launch = [];
      const map_nr_destination = new Map();
      let k = 0;

      const addLaunch = (obj, target) => {
        let href = obj.linkBase + "&";
        Object.keys(obj.templateFakes).forEach((key) => { href += key + "=" + obj.templateFakes[key] + "&"; });
        href += "x=" + target.split("|")[0] + "&y=" + target.split("|")[1] + "&";
        obj.coordDestination = target;
        obj.nr_from += 1;
        obj.landing_time = calculateLandingTime(obj.coordOrigin, target, obj.speedTroop);
        obj.coordOriginId = mapInfoVillages.get(obj.coordOrigin)?.villageId;
        obj.coordDestinationId = mapInfoVillages.get(target)?.villageId;
        map_nr_destination.set(target, (map_nr_destination.get(target) || 0) + 1);
        list_info_launch.push({ ...obj });
        list_href.push(href);
      };

      if (selectAttack === "fakes") {
        for (const obj of listFakesTemplate) {
          obj.nr_from = 0;
          for (let j = 0; j < obj.nrFakes; j++) {
            if (list_coords.length === 0) break;
            // respect "fakes per village": skip a target that's already full
            let tries = 0;
            while ((map_nr_destination.get(list_coords[k % list_coords.length]) || 0) > nrFakesPerVillage && tries < list_coords.length) {
              k++; tries++;
            }
            addLaunch(obj, list_coords[k % list_coords.length]);
            k++;
          }
        }
      } else {
        // nukes / fangs: one per source village, each target used once (spliced out)
        for (const obj of listFakesTemplate) {
          obj.nr_from = 0;
          if (list_coords.length === 0) break;
          const target = list_coords.shift(); // consume a target
          addLaunch(obj, target);
        }
      }

      for (const info of list_info_launch) info.nr_to = map_nr_destination.get(info.coordDestination);
      list_info_launch.sort((a, b) => new Date(a.landing_time) - new Date(b.landing_time));

      $(".hide_btn_show").show();
      $("#btn_show").off("click").on("click", () => showLaunches(list_info_launch));

      // Delete used target coords from the active tab (nukes/fangs on a personal tab).
      const activeIsOwn = document.getElementsByClassName("panel active")[0]?.classList.contains("own");
      if (selectAttack !== "fakes" && activeIsOwn) {
        $(".hide_btn_delete").show();
        $("#btn_delete").off("click").on("click", () => {
          if (!window.confirm("Remove the used target coords from this list?")) return;
          const ta = document.getElementsByClassName("panel active")[0].getElementsByTagName("textarea")[0];
          let remaining = ta.value.match(/\d+\|\d+/g) || [];
          const used = new Set(list_info_launch.map((o) => o.coordDestination));
          remaining = remaining.filter((c) => !used.has(c));
          ta.value = remaining.join(" ");
          saveOwnData();
        });
      } else {
        $(".hide_btn_delete").hide();
      }

      shuffleArray(list_href);
      launch(list_href, selectMod, nrSplits);
    } catch (error) {
      console.log(error);
      if (String(error).includes("points") || String(error).includes("current_interval")) {
        UI.ErrorMessage("Village database stale — running again will rebuild it.", 2500);
        if (window.localforage) await window.localforage.removeItem(game_data.world + "infoVillages").catch(() => {});
      } else {
        UI.ErrorMessage("Something went wrong — see console.", 2500);
      }
    }
  }

  /* ------------------------------------------------------------------ *
   *  Launcher: open tabs in batches, or queue a "go to rally" walk
   * ------------------------------------------------------------------ */
  function launch(list_href, selectMod, nrSplits) {
    $(".open_tab").remove();
    if (selectMod === "open tabs") {
      const nrButtons = Math.ceil(list_href.length / nrSplits);
      let delayTab = parseInt(document.getElementById("delay_tabs").value);
      delayTab = Number.isNaN(delayTab) || delayTab < 200 ? 200 : delayTab;
      for (let i = 0; i < nrButtons; i++) {
        const from = i * nrSplits;
        const to = Math.min(from + nrSplits, list_href.length);
        const btn = document.createElement("button");
        btn.className = "btn evt-confirm-btn open_tab";
        btn.innerText = `[ ${from} - ${to} ]`;
        btn.onclick = function () {
          const hrefs = list_href.slice(from, to);
          for (let j = 0; j < hrefs.length; j++) {
            window.setTimeout(() => window.open(hrefs[j], "_blank"), delayTab * j);
          }
          $(".open_tab").prop("disabled", true);
          window.setTimeout(() => $(".open_tab").prop("disabled", false), delayTab * (to - from));
        };
        document.getElementById("div_open_tabs").appendChild(btn);
      }
    } else if (selectMod === "go to rally") {
      const current = list_href.pop();
      localStorage.setItem(game_data.world + "launchFakes", JSON.stringify(list_href));
      window.open(current);
    } else {
      UI.ErrorMessage("Pick a launch option.", 1500);
    }
  }

  /* ------------------------------------------------------------------ *
   *  Show planned launches (simple table)
   * ------------------------------------------------------------------ */
  function showLaunches(list) {
    let html = `<table class="scriptTable"><tr><td>nr</td><td>from</td><td>to</td>`;
    for (const u of units) if (u !== "militia" && u !== "snob")
      html += `<td><img src="https://dsen.innogamescdn.com/asset/1d2499b/graphic/unit/unit_${u}.png"></td>`;
    html += `<td>landing</td></tr>`;
    list.forEach((o, i) => {
      html += `<tr><td>${i}</td><td>${esc(o.coordOrigin)}</td><td>${esc(o.coordDestination)}</td>`;
      for (let j = 0; j < o.nrCells; j++) {
        const v = o.templateFakes[units[j]];
        html += `<td>${v == undefined ? 0 : v}</td>`;
      }
      html += `<td>${esc(o.landing_time)}</td></tr>`;
    });
    html += `</table>`;
    if (typeof Dialog !== "undefined") Dialog.show("nc_launches", html);
    else { const d = document.getElementById("div_open_tabs"); d.insertAdjacentHTML("beforeend", html); }
  }

  /* ================================================================== *
   *  BOOT
   * ================================================================== */
  function main() {
    injectCSS();
    createMainInterface();
    showLogin(false);
    saveNrFakes();
    initializationNrFakes();
    initializationTroupes();
    initializationOptionAttack();
    initializationOwnTabs();
    loadSharedTabs();

    $("#select_type_attack").on("change", applyAttackTypeVisibility);
    $("#btn_start").on("click", startFakes);
  }

  (async () => {
    await loadLocalforage();
    try {
      checkPageRun();
    } catch (e) {
      return; // "go to rally" consumed a queued launch and navigated away
    }
    main();
  })();
})();
