// Simple Pokédex logic in plain JS (no React)

const TYPE_META = {
  normal: { label: "Normal", emoji: "⚪", bg: "from-gray-100 to-gray-200 text-gray-800" },
  fire: { label: "Fire", emoji: "🔥", bg: "from-orange-300 to-red-400 text-white" },
  water: { label: "Water", emoji: "💧", bg: "from-blue-300 to-blue-500 text-white" },
  electric: { label: "Electric", emoji: "⚡", bg: "from-yellow-300 to-yellow-500 text-gray-900" },
  grass: { label: "Grass", emoji: "🌿", bg: "from-green-300 to-emerald-500 text-white" },
  ice: { label: "Ice", emoji: "❄️", bg: "from-cyan-200 to-cyan-400 text-gray-900" },
  fighting: { label: "Fighting", emoji: "🥊", bg: "from-rose-300 to-rose-500 text-white" },
  poison: { label: "Poison", emoji: "☠️", bg: "from-violet-300 to-purple-600 text-white" },
  ground: { label: "Ground", emoji: "🟤", bg: "from-amber-200 to-amber-400 text-gray-900" },
  flying: { label: "Flying", emoji: "🕊️", bg: "from-sky-200 to-indigo-200 text-gray-900" },
  psychic: { label: "Psychic", emoji: "🔮", bg: "from-pink-200 to-pink-400 text-white" },
  bug: { label: "Bug", emoji: "🐞", bg: "from-lime-200 to-emerald-300 text-gray-900" },
  rock: { label: "Rock", emoji: "🪨", bg: "from-stone-200 to-stone-400 text-gray-900" },
  ghost: { label: "Ghost", emoji: "👻", bg: "from-indigo-400 to-violet-700 text-white" },
  dragon: { label: "Dragon", emoji: "🐉", bg: "from-indigo-600 to-indigo-900 text-white" },
  dark: { label: "Dark", emoji: "🌑", bg: "from-stone-700 to-stone-900 text-white" },
  steel: { label: "Steel", emoji: "🔩", bg: "from-slate-200 to-slate-400 text-gray-900" },
  fairy: { label: "Fairy", emoji: "🧚", bg: "from-pink-100 to-pink-300 text-gray-900" }
};

const TYPE_FRAME = {
  fire: "border-orange-300 shadow-[0_0_25px_rgba(248,113,113,0.6)]",
  water: "border-sky-300 shadow-[0_0_25px_rgba(56,189,248,0.6)]",
  grass: "border-emerald-300 shadow-[0_0_25px_rgba(52,211,153,0.6)]",
  electric: "border-yellow-300 shadow-[0_0_25px_rgba(250,204,21,0.7)]",
  ice: "border-cyan-300 shadow-[0_0_25px_rgba(34,211,238,0.6)]",
  psychic: "border-pink-300 shadow-[0_0_25px_rgba(244,114,182,0.6)]",
  dragon: "border-indigo-500 shadow-[0_0_25px_rgba(129,140,248,0.7)]",
  dark: "border-slate-600 shadow-[0_0_25px_rgba(30,64,175,0.6)]",
  fairy: "border-pink-200 shadow-[0_0_25px_rgba(251,113,133,0.6)]"
};

const REGIONS = {
  all: { label: "All regions", range: [1, 1010] },
  kanto: { label: "Kanto (1–151)", range: [1, 151] },
  johto: { label: "Johto (152–251)", range: [152, 251] },
  hoenn: { label: "Hoenn (252–386)", range: [252, 386] },
  sinnoh: { label: "Sinnoh (387–493)", range: [387, 493] },
  unova: { label: "Unova (494–649)", range: [494, 649] },
  kalos: { label: "Kalos (650–721)", range: [650, 721] },
  alola: { label: "Alola (722–809)", range: [722, 809] },
  galar: { label: "Galar (810–898)", range: [810, 898] },
  paldea: { label: "Paldea (899–1010)", range: [899, 1010] }
};

const CRY_URL = "https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg";

// caches
const pokemonCache = new Map();
const speciesCache = new Map();
const evoChainCache = new Map();

// state
let allNames = [];
let currentPokemon = null;
let currentRegion = "all";
let showAll = false;
let regionList = [];
let regionDetails = [];
let regionPage = 0;
let isLoading = false;
let isLoadingRegion = false;
let suggestIndex = -1;

// elements
let searchForm,
  searchInput,
  searchBtn,
  regionSelect,
  showAllBtn,
  randomBtn,
  clearBtn,
  errorBox,
  scanOverlay,
  portraitScreen,
  entryStatus,
  dataScreen,
  statusRegion,
  statusMode,
  statusEntries,
  suggestionsList,
  dpadUp,
  dpadDown,
  dpadLeft,
  dpadRight,
  dpadCenter,
  btnA,
  btnB,
  bigRandom;

function capitalize(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function getPokemonJson(idOrName) {
  const key = String(idOrName).toLowerCase();
  if (pokemonCache.has(key)) return pokemonCache.get(key);

  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${key}`);
  if (!res.ok) throw new Error("Failed to fetch Pokémon data");
  const json = await res.json();

  pokemonCache.set(String(json.id), json);
  pokemonCache.set(json.name.toLowerCase(), json);
  return json;
}

async function fetchEvolutionData(speciesUrl) {
  try {
    let species = speciesCache.get(speciesUrl);
    if (!species) {
      const speciesRes = await fetch(speciesUrl);
      if (!speciesRes.ok) return { species: null, evolutions: [] };
      species = await speciesRes.json();
      speciesCache.set(speciesUrl, species);
    }

    if (!species.evolution_chain || !species.evolution_chain.url) {
      return { species, evolutions: [] };
    }

    let evoJson = evoChainCache.get(species.evolution_chain.url);
    if (!evoJson) {
      const evoRes = await fetch(species.evolution_chain.url);
      if (!evoRes.ok) return { species, evolutions: [] };
      evoJson = await evoRes.json();
      evoChainCache.set(species.evolution_chain.url, evoJson);
    }

    const evolutions = [];
    function traverse(node) {
      if (!node) return;
      if (node.species) evolutions.push({ name: node.species.name });
      if (node.evolves_to && node.evolves_to.length) {
        node.evolves_to.forEach((child) => traverse(child));
      }
    }
    traverse(evoJson.chain);
    return { species, evolutions };
  } catch (e) {
    console.warn("evolution fetch failed", e);
    return { species: null, evolutions: [] };
  }
}

// helpers to show/hide loading
function setLoading(flag) {
  isLoading = flag;
  if (scanOverlay) {
    scanOverlay.classList.toggle("hidden", !flag);
  }
  if (searchBtn) {
    searchBtn.textContent = flag ? "Searching…" : "Search";
    searchBtn.disabled = flag;
  }
}

// render functions

function createTypeBadges(types) {
  return types
    .map((t) => {
      const meta = TYPE_META[t] || {
        label: t,
        emoji: "✨",
        bg: "from-gray-100 to-gray-200 text-gray-800"
      };
      return `
        <div
          class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-gradient-to-r ${meta.bg} shadow-md border border-white/60"
          title="${meta.label}"
        >
          <span class="text-base sm:text-lg">${meta.emoji}</span>
          <span class="capitalize tracking-wide">${t}</span>
        </div>
      `;
    })
    .join("");
}

function renderPortrait() {
  if (!portraitScreen) return;

  if (!currentPokemon) {
    portraitScreen.innerHTML = `
      <div class="text-center">
        <div class="text-lg font-bold mb-1">No Pokémon selected</div>
        <p class="text-xs sm:text-sm text-indigo-700/90 max-w-xs mx-auto">
          Search by name or ID, press <span class="font-bold">Random</span>, or use the d-pad / keyboard arrows to explore entries.
        </p>
      </div>
    `;
    if (entryStatus) entryStatus.textContent = "Ready to scan";
    return;
  }

  const primaryType = currentPokemon.types[0];
  const frameClass = TYPE_FRAME[primaryType] || "border-yellow-200/80 shadow-xl";

  portraitScreen.innerHTML = `
    <div
      class="relative mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border-[6px] ${frameClass} card-flip"
    >
      <div class="flex flex-col">
        <div class="p-4 bg-gradient-to-b from-white to-red-50 flex flex-col items-center justify-center">
          <div class="w-full p-3 rounded-2xl bg-white/80 backdrop-blur-sm border-4 border-pink-100 shadow-inner">
            <div class="w-full h-44 flex items-center justify-center">
              ${
                currentPokemon.sprite
                  ? `<img src="${currentPokemon.sprite}" alt="${currentPokemon.name}" class="w-full h-full object-contain drop-shadow-2xl" />`
                  : `<div class="w-full h-full rounded bg-gray-100 flex items-center justify-center">No image</div>`
              }
            </div>
            <div class="mt-3 text-center">
              <div class="text-xs text-indigo-500 font-semibold">
                #${String(currentPokemon.id).padStart(3, "0")}
              </div>
              <h2 class="text-2xl font-extrabold capitalize mt-1 text-blue-900 drop-shadow-sm">
                ${capitalize(currentPokemon.name)}
              </h2>
              <div class="mt-2 flex gap-2 justify-center flex-wrap">
                ${createTypeBadges(currentPokemon.types)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  if (entryStatus) {
    entryStatus.textContent = `Entry #${currentPokemon.id}`;
  }
}

function renderDataScreen() {
  if (!dataScreen) return;

  const regionConf = REGIONS[currentRegion] || REGIONS.all;
  const totalEntries = regionConf.range[1] - regionConf.range[0] + 1;
  const modeLabel = showAll ? "BROWSE" : currentPokemon ? "ENTRY" : "IDLE";
  const entryCountLabel = showAll
    ? `${regionDetails.length}/${totalEntries}`
    : currentPokemon
    ? `1/${totalEntries}`
    : `0/${totalEntries}`;

  if (statusRegion) statusRegion.textContent = regionConf.label;
  if (statusMode) statusMode.textContent = modeLabel;
  if (statusEntries) statusEntries.textContent = entryCountLabel;

  if (showAll) {
    // grid mode
    dataScreen.innerHTML = `
      <div class="mt-1 max-h-[260px] overflow-auto pr-1">
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3" id="gridContainer">
          ${regionDetails
            .map((p) => {
              return `
                <div
                  class="bg-slate-900/80 rounded-2xl shadow-md p-2 text-center border border-slate-600 hover:border-yellow-300 hover:shadow-lg transition-colors cursor-pointer flex flex-col gap-1"
                  data-pname="${p.name}"
                >
                  <div class="w-full h-16 flex items-center justify-center bg-slate-800 rounded-xl">
                    ${
                      p.sprite
                        ? `<img src="${p.sprite}" alt="${p.name}" class="w-12 h-12 object-contain" />`
                        : `<div class="w-12 h-12 bg-slate-700 rounded"></div>`
                    }
                  </div>
                  <div>
                    <div class="text-[9px] text-sky-300 font-semibold">
                      #${String(p.id).padStart(3, "0")}
                    </div>
                    <div class="text-[10px] sm:text-xs font-extrabold capitalize text-slate-50">
                      ${p.name}
                    </div>
                  </div>
                  <div class="mt-1 flex items-center justify-center gap-1 flex-wrap">
                    ${p.types
                      .map(
                        (t) =>
                          `<span class="px-1.5 py-0.5 rounded-full bg-slate-800 text-[9px] capitalize border border-slate-600">${t}</span>`
                      )
                      .join("")}
                  </div>
                  ${
                    p.evolutions && p.evolutions.length
                      ? `<div class="mt-1 flex items-center justify-center gap-1">
                          ${p.evolutions
                            .slice(0, 2)
                            .map(
                              (e) => `
                            <button
                              type="button"
                              class="flex flex-col items-center text-[8px] px-1 py-0.5 rounded bg-slate-800/90 border border-slate-600 hover:bg-yellow-500/20"
                              data-evo="${e.name}"
                            >
                              ${
                                e.sprite
                                  ? `<img src="${e.sprite}" alt="${e.name}" class="w-5 h-5 object-contain mb-0.5" />`
                                  : `<div class="w-5 h-5 bg-slate-700 rounded mb-0.5"></div>`
                              }
                              <span class="capitalize max-w-[2.5rem] truncate">${e.name}</span>
                            </button>`
                            )
                            .join("")}
                        </div>`
                      : `<div class="mt-1 text-[8px] text-slate-400">No evolution</div>`
                  }
                  <div class="mt-1 flex items-center justify-center gap-1">
                    <div class="text-[8px] text-slate-300">HP</div>
                    <div class="w-12 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        class="h-1.5 rounded-full bg-red-400"
                        style="width: ${Math.min(100, (p.hp / 255) * 100)}%;"
                      ></div>
                    </div>
                    <div class="text-[8px] font-mono text-slate-200">${p.hp}</div>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
        ${
          regionDetails.length < regionList.length
            ? `<div class="mt-3 text-center">
                <button
                  id="loadMoreBtn"
                  type="button"
                  class="px-3 py-1.5 rounded-full bg-sky-500 text-white shadow text-[11px] font-semibold"
                >
                  ${isLoadingRegion ? "Loading more…" : "Load more cards"}
                </button>
              </div>`
            : ""
        }
      </div>
    `;
  } else if (currentPokemon) {
    // detailed entry mode
    const abilitiesHtml = currentPokemon.abilities
      .map(
        (a) =>
          `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize bg-slate-800 border border-slate-600">
            ✨ ${a.name}${a.hidden ? " (hidden)" : ""}
          </span>`
      )
      .join("");

    const statsHtml = currentPokemon.stats
      .map(
        (s) => `
        <div class="flex items-center gap-2">
          <div class="w-20 text-[9px] capitalize text-slate-200 font-semibold">${s.name}</div>
          <div class="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              class="h-2 rounded-full"
              style="width:${Math.min(100, (s.value / 255) * 100)}%; background:linear-gradient(90deg,#34d399,#10b981);"
            ></div>
          </div>
          <div class="w-8 text-right font-mono text-[9px] text-slate-100">${s.value}</div>
        </div>`
      )
      .join("");

    const movesHtml = currentPokemon.moves
      .slice(0, 10)
      .map(
        (m) => `
        <div class="px-2 py-0.5 rounded-lg border border-slate-600 text-[9px] capitalize bg-slate-800 flex items-center gap-1">
          <span class="text-xs">⚡</span>
          <span class="truncate">${m}</span>
        </div>`
      )
      .join("");

    const evoHtml = currentPokemon.evolutions && currentPokemon.evolutions.length
      ? currentPokemon.evolutions
          .map(
            (e, idx) => `
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="flex flex-col items-center w-20 p-1.5 bg-slate-900 rounded-2xl shadow-md border border-slate-600 hover:border-yellow-300 hover:shadow-lg transition-colors cursor-pointer"
            data-evo="${e.name}"
          >
            ${
              e.sprite
                ? `<img src="${e.sprite}" alt="${e.name}" class="w-10 h-10 object-contain mb-0.5" />`
                : `<div class="w-10 h-10 bg-slate-700 rounded mb-0.5"></div>`
            }
            <div class="text-[9px] mt-0.5 capitalize font-semibold">${e.name}</div>
          </button>
          ${
            idx < currentPokemon.evolutions.length - 1
              ? `<span class="text-base text-slate-400">➜</span>`
              : ""
          }
        </div>`
          )
          .join("")
      : `<div class="text-[9px] text-slate-400">No evolution data</div>`;

    dataScreen.innerHTML = `
      <div class="mt-1 max-h-[260px] overflow-auto pr-1 text-[11px] sm:text-xs leading-relaxed">
        <div class="flex items-start justify-between gap-2 flex-wrap mb-3">
          <div class="flex gap-2 flex-wrap">
            <div class="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-400/60 min-w-[72px] text-center">
              <div class="text-[9px] text-amber-200 font-semibold">Height</div>
              <div class="text-sm font-extrabold text-amber-100 mt-0.5">${currentPokemon.height} dm</div>
            </div>
            <div class="px-2 py-1 rounded-lg bg-sky-500/20 border border-sky-400/60 min-w-[72px] text-center">
              <div class="text-[9px] text-sky-200 font-semibold">Weight</div>
              <div class="text-sm font-extrabold text-sky-100 mt-0.5">${currentPokemon.weight} hg</div>
            </div>
          </div>
          <div class="text-[9px] text-slate-300 text-right">
            <div>Data from</div>
            <a href="https://pokeapi.co" target="_blank" rel="noreferrer" class="font-semibold text-red-300 underline">
              PokeAPI
            </a>
          </div>
        </div>

        <div class="mb-3">
          <div class="text-[10px] font-bold text-sky-200 mb-1">Abilities</div>
          <div class="flex gap-1.5 flex-wrap">
            ${abilitiesHtml}
          </div>
        </div>

        <div class="mb-3">
          <div class="text-[10px] font-bold text-sky-200 mb-1">Base stats</div>
          <div class="space-y-1.5">
            ${statsHtml}
          </div>
        </div>

        <div class="mb-3">
          <div class="text-[10px] font-bold text-sky-200 mb-1">Top moves</div>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            ${movesHtml}
          </div>
        </div>

        <div class="mb-1">
          <div class="text-[10px] font-bold text-sky-200 mb-1 flex items-center gap-2">
            Evolution
            <span class="text-[9px] text-slate-300">(tap to jump)</span>
          </div>
          <div class="flex items-center gap-2 overflow-x-auto py-1">
            ${evoHtml}
          </div>
        </div>

        <div class="mt-1 text-[9px] text-slate-300">
          Tip: tap evolutions, region tiles, or press R / arrows to hop quickly between entries.
        </div>
      </div>
    `;
  } else {
    dataScreen.innerHTML = `
      <div class="mt-4 text-[11px] text-slate-200 text-center">
        Press <span class="font-bold">Show all</span> to browse cards from this region, or search for a Pokémon to view detailed data here.
      </div>
    `;
  }

  // grid / evo click delegation
  const gridContainer = document.getElementById("gridContainer");
  if (gridContainer) {
    gridContainer.onclick = (e) => {
      const evoBtn = e.target.closest("[data-evo]");
      if (evoBtn) {
        const name = evoBtn.getAttribute("data-evo");
        if (name) fetchPokemon(name);
        return;
      }
      const tile = e.target.closest("[data-pname]");
      if (tile) {
        const name = tile.getAttribute("data-pname");
        if (name) fetchPokemon(name);
      }
    };
  }

  const loadMoreBtn = document.getElementById("loadMoreBtn");
  if (loadMoreBtn) {
    loadMoreBtn.onclick = () => {
      if (!isLoadingRegion) fetchRegionPage(regionPage + 1);
    };
  }

  // evo strip clicks in detail mode
  const evoButtons = dataScreen.querySelectorAll("[data-evo]");
  evoButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.getAttribute("data-evo");
      if (name) fetchPokemon(name);
    });
  });
}

function renderError(message) {
  if (!errorBox) return;
  if (!message) {
    errorBox.classList.add("hidden");
    errorBox.textContent = "";
    return;
  }
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

async function fetchPokemon(q) {
  const trimmed = String(q || "").trim().toLowerCase();
  if (!trimmed) return;
  setLoading(true);
  renderError(null);
  currentPokemon = null;
  renderPortrait();
  renderDataScreen();

  try {
    const d = await getPokemonJson(trimmed);
    const normalized = {
      id: d.id,
      name: d.name,
      height: d.height,
      weight: d.weight,
      types: d.types.map((t) => t.type.name),
      sprite:
        (d.sprites.other &&
          d.sprites.other["official-artwork"] &&
          d.sprites.other["official-artwork"].front_default) ||
        d.sprites.front_default,
      stats: d.stats.map((s) => ({ name: s.stat.name, value: s.base_stat })),
      abilities: d.abilities.map((a) => ({ name: a.ability.name, hidden: a.is_hidden })),
      moves: d.moves.map((m) => m.move.name),
      evolutions: []
    };

    try {
      const speciesUrl = d.species.url;
      const evoData = await fetchEvolutionData(speciesUrl);
      if (evoData && evoData.evolutions && evoData.evolutions.length) {
        const evoFull = await Promise.all(
          evoData.evolutions.map(async (e) => {
            try {
              const pJson = await getPokemonJson(e.name);
              return {
                name: e.name,
                sprite:
                  (pJson.sprites.other &&
                    pJson.sprites.other["official-artwork"] &&
                    pJson.sprites.other["official-artwork"].front_default) ||
                  pJson.sprites.front_default
              };
            } catch {
              return { name: e.name, sprite: null };
            }
          })
        );
        normalized.evolutions = evoFull;
      }
    } catch {
      // ignore
    }

    currentPokemon = normalized;
    showAll = false;

    // tiny sound
    try {
      const audio = new Audio(CRY_URL);
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch {}

    renderPortrait();
    renderDataScreen();

    // update search input with proper name
    if (searchInput) searchInput.value = currentPokemon.name;
  } catch (err) {
    console.error(err);
    renderError(err.message || "Something went wrong");
  } finally {
    setLoading(false);
  }
}

async function prepareRegionList(regionKey) {
  const conf = REGIONS[regionKey] || REGIONS.all;
  const [from, to] = conf.range;
  const arr = [];
  for (let i = from; i <= to; i++) arr.push(String(i));
  regionList = arr;
}

async function fetchRegionPage(page, pageSize = 30) {
  if (!regionList.length) return;
  isLoadingRegion = true;
  renderDataScreen();

  const start = page * pageSize;
  const slice = regionList.slice(start, start + pageSize);

  try {
    const details = await Promise.all(
      slice.map(async (idOrName) => {
        const d = await getPokemonJson(idOrName);
        const base = {
          id: d.id,
          name: d.name,
          types: d.types.map((t) => t.type.name),
          sprite:
            (d.sprites.other &&
              d.sprites.other["official-artwork"] &&
              d.sprites.other["official-artwork"].front_default) ||
            d.sprites.front_default,
          hp: (d.stats.find((s) => s.stat.name === "hp") || {}).base_stat || 0,
          evolutions: []
        };

        try {
          const speciesUrl = d.species.url;
          const evoData = await fetchEvolutionData(speciesUrl);
          if (evoData && evoData.evolutions && evoData.evolutions.length) {
            const evoSmall = await Promise.all(
              evoData.evolutions.slice(0, 3).map(async (evo) => {
                try {
                  const pJson = await getPokemonJson(evo.name);
                  return {
                    name: evo.name,
                    sprite:
                      (pJson.sprites.other &&
                        pJson.sprites.other["official-artwork"] &&
                        pJson.sprites.other["official-artwork"].front_default) ||
                      pJson.sprites.front_default
                  };
                } catch {
                  return { name: evo.name, sprite: null };
                }
              })
            );
            base.evolutions = evoSmall;
          }
        } catch {
          // ignore
        }

        return base;
      })
    );

    regionDetails = regionDetails.concat(details);
    regionPage = page;
  } catch (e) {
    console.error(e);
    renderError("Failed to load region Pokémon");
  } finally {
    isLoadingRegion = false;
    renderDataScreen();
  }
}

async function onShowAll() {
  showAll = true;
  currentPokemon = null;
  regionDetails = [];
  renderPortrait();
  renderDataScreen();
  if (!regionList.length) {
    await prepareRegionList(currentRegion);
  }
  await fetchRegionPage(0);
}

function clearAll() {
  if (searchInput) searchInput.value = "";
  currentPokemon = null;
  regionDetails = [];
  regionList = [];
  showAll = false;
  renderError(null);
  renderPortrait();
  renderDataScreen();
}

async function randomPokemon() {
  try {
    if (currentRegion !== "all") {
      if (!regionList.length) await prepareRegionList(currentRegion);
      if (regionList.length) {
        const nameOrId = regionList[Math.floor(Math.random() * regionList.length)];
        fetchPokemon(nameOrId);
        return;
      }
    }
    if (allNames.length) {
      const name = allNames[Math.floor(Math.random() * allNames.length)];
      fetchPokemon(name);
      return;
    }
    const id = Math.floor(Math.random() * 1010) + 1;
    fetchPokemon(id);
  } catch {
    renderError("Could not pick a random Pokémon");
  }
}

function browseById(delta) {
  if (!currentPokemon) return;
  let nextId = currentPokemon.id + delta;
  if (nextId < 1) nextId = 1;
  fetchPokemon(nextId);
}

function updateQuickRegionButtons() {
  const buttons = document.querySelectorAll(".quickRegion");
  buttons.forEach((btn) => {
    const key = btn.getAttribute("data-region-short");
    if (key === currentRegion) {
      btn.classList.remove("bg-sky-500", "border-sky-300", "text-white");
      btn.classList.add("bg-sky-400", "border-sky-200", "text-slate-900");
    } else {
      btn.classList.add("bg-sky-500", "border-sky-300", "text-white");
      btn.classList.remove("bg-sky-400", "border-sky-200", "text-slate-900");
    }
  });
}

function setupGlobalShortcuts() {
  window.addEventListener("keydown", (e) => {
    const target = e.target;
    const tag = (target && target.tagName && target.tagName.toLowerCase()) || "";
    const isTyping =
      tag === "input" || tag === "textarea" || (target && target.isContentEditable);
    if (isTyping) return;

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      browseById(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      browseById(1);
    } else if ((e.key === "r" || e.key === "R") && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      randomPokemon();
    } else if (e.key === "s" || e.key === "/") {
      e.preventDefault();
      if (searchInput) searchInput.focus();
    }
  });
}

function renderSuggestions() {
  if (!suggestionsList || !searchInput) return;
  const q = searchInput.value.trim().toLowerCase();
  if (q.length < 2) {
    suggestionsList.classList.add("hidden");
    suggestionsList.innerHTML = "";
    suggestIndex = -1;
    return;
  }
  const matches = allNames.filter((name) => name.startsWith(q)).slice(0, 8);
  if (!matches.length) {
    suggestionsList.classList.add("hidden");
    suggestionsList.innerHTML = "";
    suggestIndex = -1;
    return;
  }
  suggestionsList.innerHTML = matches
    .map(
      (name, idx) => `
      <li
        class="px-3 py-1 cursor-pointer hover:bg-pink-50 ${
          idx === suggestIndex ? "bg-pink-100" : ""
        }"
        data-suggest="${name}"
      >
        ${name}
      </li>`
    )
    .join("");
  suggestionsList.classList.remove("hidden");
}

async function initAllNames() {
  try {
    const res = await fetch("https://pokeapi.co/api/v2/pokemon?limit=20000");
    const data = await res.json();
    allNames = data.results.map((r) => r.name);
  } catch (e) {
    console.warn("Could not load full index of Pokémon names", e);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // grab elements
  searchForm = document.getElementById("searchForm");
  searchInput = document.getElementById("searchInput");
  searchBtn = document.getElementById("searchBtn");
  regionSelect = document.getElementById("regionSelect");
  showAllBtn = document.getElementById("showAllBtn");
  randomBtn = document.getElementById("randomBtn");
  clearBtn = document.getElementById("clearBtn");
  errorBox = document.getElementById("errorBox");
  scanOverlay = document.getElementById("scanOverlay");
  portraitScreen = document.getElementById("portraitScreen");
  entryStatus = document.getElementById("entryStatus");
  dataScreen = document.getElementById("dataScreen");
  statusRegion = document.getElementById("statusRegion");
  statusMode = document.getElementById("statusMode");
  statusEntries = document.getElementById("statusEntries");
  suggestionsList = document.getElementById("suggestionsList");

  dpadUp = document.getElementById("dpadUp");
  dpadDown = document.getElementById("dpadDown");
  dpadLeft = document.getElementById("dpadLeft");
  dpadRight = document.getElementById("dpadRight");
  dpadCenter = document.getElementById("dpadCenter");
  btnA = document.getElementById("btnA");
  btnB = document.getElementById("btnB");
  bigRandom = document.getElementById("bigRandom");

  // initial render
  renderPortrait();
  renderDataScreen();
  updateQuickRegionButtons();
  setupGlobalShortcuts();
  initAllNames();

  // events
  if (searchForm) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (searchInput) fetchPokemon(searchInput.value);
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      suggestIndex = -1;
      renderSuggestions();
    });
    searchInput.addEventListener("keydown", (e) => {
      const items = suggestionsList
        ? suggestionsList.querySelectorAll("[data-suggest]")
        : [];
      if (!items.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        suggestIndex = (suggestIndex + 1) % items.length;
        renderSuggestions();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        suggestIndex = (suggestIndex - 1 + items.length) % items.length;
        renderSuggestions();
      } else if (e.key === "Enter") {
        if (suggestIndex >= 0 && suggestIndex < items.length) {
          e.preventDefault();
          const name = items[suggestIndex].getAttribute("data-suggest");
          if (name) {
            searchInput.value = name;
            suggestionsList.classList.add("hidden");
            fetchPokemon(name);
            suggestIndex = -1;
          }
        }
      }
    });
  }

  if (suggestionsList) {
    suggestionsList.addEventListener("mousedown", (e) => {
      const li = e.target.closest("[data-suggest]");
      if (!li || !searchInput) return;
      const name = li.getAttribute("data-suggest");
      if (!name) return;
      searchInput.value = name;
      suggestionsList.classList.add("hidden");
      fetchPokemon(name);
      suggestIndex = -1;
    });
  }

  if (regionSelect) {
    regionSelect.addEventListener("change", async () => {
      currentRegion = regionSelect.value;
      updateQuickRegionButtons();
      regionList = [];
      regionDetails = [];
      showAll = false;
      renderDataScreen();
    });
  }

  if (showAllBtn) showAllBtn.addEventListener("click", onShowAll);
  if (randomBtn) randomBtn.addEventListener("click", randomPokemon);
  if (bigRandom) bigRandom.addEventListener("click", randomPokemon);
  if (clearBtn) clearBtn.addEventListener("click", clearAll);
  if (btnB) btnB.addEventListener("click", clearAll);
  if (btnA) {
    btnA.addEventListener("click", () => {
      if (searchInput) fetchPokemon(searchInput.value);
    });
  }

  if (dpadUp) dpadUp.addEventListener("click", randomPokemon);
  if (dpadDown) dpadDown.addEventListener("click", onShowAll);
  if (dpadLeft) dpadLeft.addEventListener("click", () => browseById(-1));
  if (dpadRight) dpadRight.addEventListener("click", () => browseById(1));
  if (dpadCenter) {
    dpadCenter.addEventListener("click", () => {
      if (searchInput && searchInput.value.trim()) {
        fetchPokemon(searchInput.value);
      } else if (currentPokemon) {
        fetchPokemon(currentPokemon.id);
      } else {
        fetchPokemon(1);
      }
    });
  }

  // quick region buttons
  document.querySelectorAll(".quickRegion").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const key = btn.getAttribute("data-region-short");
      if (!key) return;
      currentRegion = key;
      if (regionSelect) regionSelect.value = key;
      updateQuickRegionButtons();
      regionList = [];
      regionDetails = [];
      showAll = true;
      renderDataScreen();
      await prepareRegionList(key);
      await fetchRegionPage(0);
    });
  });
});
