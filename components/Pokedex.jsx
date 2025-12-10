import React, { useEffect, useState, useRef } from 'react';

// Pokedex.jsx
// Device-style, kid-friendly Pokédex — bright, playful, and evolution-aware
// - Hardware layout inspired by classic anime Pokédex (left & right leaf)
// - Website UI lives entirely inside the Pokédex "screens"
// - Type-specific colorful badges with emojis + type-based card accents
// - Caching for Pokémon, species, and evolution chains
// - Card flip animation when switching Pokémon
// - Tiny sound hook when Pokémon changes (swap CRY_URL with your own asset if you want)
// - Autocomplete search + keyboard shortcuts
// Uses PokeAPI endpoints: /pokemon, /pokemon-species, /evolution-chain
// NOTE: Tailwind CSS recommended. If you don't use Tailwind, convert classes to your CSS.

const TYPE_META = {
  normal: { label: 'Normal', emoji: '⚪', bg: 'from-gray-100 to-gray-200 text-gray-800' },
  fire: { label: 'Fire', emoji: '🔥', bg: 'from-orange-300 to-red-400 text-white' },
  water: { label: 'Water', emoji: '💧', bg: 'from-blue-300 to-blue-500 text-white' },
  electric: { label: 'Electric', emoji: '⚡', bg: 'from-yellow-300 to-yellow-500 text-gray-900' },
  grass: { label: 'Grass', emoji: '🌿', bg: 'from-green-300 to-emerald-500 text-white' },
  ice: { label: 'Ice', emoji: '❄️', bg: 'from-cyan-200 to-cyan-400 text-gray-900' },
  fighting: { label: 'Fighting', emoji: '🥊', bg: 'from-rose-300 to-rose-500 text-white' },
  poison: { label: 'Poison', emoji: '☠️', bg: 'from-violet-300 to-purple-600 text-white' },
  ground: { label: 'Ground', emoji: '🟤', bg: 'from-amber-200 to-amber-400 text-gray-900' },
  flying: { label: 'Flying', emoji: '🕊️', bg: 'from-sky-200 to-indigo-200 text-gray-900' },
  psychic: { label: 'Psychic', emoji: '🔮', bg: 'from-pink-200 to-pink-400 text-white' },
  bug: { label: 'Bug', emoji: '🐞', bg: 'from-lime-200 to-emerald-300 text-gray-900' },
  rock: { label: 'Rock', emoji: '🪨', bg: 'from-stone-200 to-stone-400 text-gray-900' },
  ghost: { label: 'Ghost', emoji: '👻', bg: 'from-indigo-400 to-violet-700 text-white' },
  dragon: { label: 'Dragon', emoji: '🐉', bg: 'from-indigo-600 to-indigo-900 text-white' },
  dark: { label: 'Dark', emoji: '🌑', bg: 'from-stone-700 to-stone-900 text-white' },
  steel: { label: 'Steel', emoji: '🔩', bg: 'from-slate-200 to-slate-400 text-gray-900' },
  fairy: { label: 'Fairy', emoji: '🧚', bg: 'from-pink-100 to-pink-300 text-gray-900' },
} as const;

// Type-based frame accents for the main card
const TYPE_FRAME: Record<string, string> = {
  fire: 'border-orange-300 shadow-[0_0_25px_rgba(248,113,113,0.6)]',
  water: 'border-sky-300 shadow-[0_0_25px_rgba(56,189,248,0.6)]',
  grass: 'border-emerald-300 shadow-[0_0_25px_rgba(52,211,153,0.6)]',
  electric: 'border-yellow-300 shadow-[0_0_25px_rgba(250,204,21,0.7)]',
  ice: 'border-cyan-300 shadow-[0_0_25px_rgba(34,211,238,0.6)]',
  psychic: 'border-pink-300 shadow-[0_0_25px_rgba(244,114,182,0.6)]',
  dragon: 'border-indigo-500 shadow-[0_0_25px_rgba(129,140,248,0.7)]',
  dark: 'border-slate-600 shadow-[0_0_25px_rgba(30,64,175,0.6)]',
  fairy: 'border-pink-200 shadow-[0_0_25px_rgba(251,113,133,0.6)]',
};

// Simple in-memory caches (module-level, shared across component mounts)
const pokemonCache = new Map<string, any>(); // key: id or name -> full pokemon JSON
const speciesCache = new Map<string, any>(); // key: species url -> species JSON
const evoChainCache = new Map<string, any>(); // key: evo chain url -> evo JSON

// Tiny sound (placeholder). Replace with your own cry URL if you want.
const CRY_URL = 'https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg';

function TypeBadge({ type }: { type: string }) {
  const meta = TYPE_META[type as keyof typeof TYPE_META] || {
    label: type,
    emoji: '✨',
    bg: 'from-gray-100 to-gray-200 text-gray-800',
  };
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-gradient-to-r ${meta.bg} shadow-md border border-white/60`}
      title={meta.label}
    >
      <span className="text-base sm:text-lg">{meta.emoji}</span>
      <span className="capitalize tracking-wide">{type}</span>
    </div>
  );
}

function PokeballLogo({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-lg"
    >
      <circle cx="50" cy="50" r="48" fill="#fff" stroke="#000" strokeWidth="4" />
      <path d="M2 50a48 48 0 0 0 96 0" fill="#FF1F3B" />
      <circle cx="50" cy="50" r="14" fill="#fff" stroke="#000" strokeWidth="4" />
      <circle cx="50" cy="50" r="6" fill="#000" />
    </svg>
  );
}

// Helper: cached fetch for /pokemon
async function getPokemonJson(idOrName: string | number) {
  const key = String(idOrName).toLowerCase();
  if (pokemonCache.has(key)) return pokemonCache.get(key);

  const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${key}`);
  if (!res.ok) throw new Error('Failed to fetch Pokémon data');
  const json = await res.json();

  // store under both id and name for reuse
  pokemonCache.set(String(json.id), json);
  pokemonCache.set(json.name.toLowerCase(), json);
  return json;
}

// Helper: fetch species data and evolution chain for a pokemon species URL (cached)
async function fetchEvolutionData(speciesUrl: string) {
  try {
    let species = speciesCache.get(speciesUrl);
    if (!species) {
      const speciesRes = await fetch(speciesUrl);
      if (!speciesRes.ok) return null;
      species = await speciesRes.json();
      speciesCache.set(speciesUrl, species);
    }

    if (!species.evolution_chain?.url) return { species, evolutions: [] as { name: string }[] };

    let evoJson = evoChainCache.get(species.evolution_chain.url);
    if (!evoJson) {
      const evoRes = await fetch(species.evolution_chain.url);
      if (!evoRes.ok) return { species, evolutions: [] as { name: string }[] };
      evoJson = await evoRes.json();
      evoChainCache.set(species.evolution_chain.url, evoJson);
    }

    const evolutions: { name: string }[] = [];
    function traverse(node: any) {
      if (!node) return;
      if (node.species) evolutions.push({ name: node.species.name });
      if (node.evolves_to && node.evolves_to.length) {
        node.evolves_to.forEach((child: any) => traverse(child));
      }
    }
    traverse(evoJson.chain);

    return { species, evolutions };
  } catch (e) {
    console.warn('evolution fetch failed', e);
    return null;
  }
}

export default function Pokedex() {
  const [query, setQuery] = useState('');
  const [pokemon, setPokemon] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allNames, setAllNames] = useState<string[]>([]);
  const [region, setRegion] = useState<'all' | 'kanto' | 'johto' | 'hoenn' | 'sinnoh' | 'unova' | 'kalos' | 'alola' | 'galar' | 'paldea'>('all');
  const [showAll, setShowAll] = useState(false);
  const [regionList, setRegionList] = useState<string[]>([]);
  const [regionDetails, setRegionDetails] = useState<any[]>([]);
  const [loadingRegion, setLoadingRegion] = useState(false);
  const [regionPage, setRegionPage] = useState(0);
  const [suggestIndex, setSuggestIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const REGIONS: Record<string, { label: string; range: [number, number] }> = {
    all: { label: 'All regions', range: [1, 1010] },
    kanto: { label: 'Kanto (1–151)', range: [1, 151] },
    johto: { label: 'Johto (152–251)', range: [152, 251] },
    hoenn: { label: 'Hoenn (252–386)', range: [252, 386] },
    sinnoh: { label: 'Sinnoh (387–493)', range: [387, 493] },
    unova: { label: 'Unova (494–649)', range: [494, 649] },
    kalos: { label: 'Kalos (650–721)', range: [650, 721] },
    alola: { label: 'Alola (722–809)', range: [722, 809] },
    galar: { label: 'Galar (810–898)', range: [810, 898] },
    paldea: { label: 'Paldea (899–1010)', range: [899, 1010] },
  };

  const normalizedQuery = query.trim().toLowerCase();
  const suggestions = normalizedQuery.length >= 2
    ? allNames.filter((name) => name.startsWith(normalizedQuery)).slice(0, 8)
    : [];

  const primaryType: string | null = pokemon?.types?.[0] ?? null;
  const typeFrameClass = primaryType && TYPE_FRAME[primaryType]
    ? TYPE_FRAME[primaryType]
    : 'border-yellow-200/80 shadow-xl';

  const regionConfig = REGIONS[region] || REGIONS.all;
  const totalEntries = regionConfig.range[1] - regionConfig.range[0] + 1;
  const modeLabel = showAll ? 'BROWSE' : pokemon ? 'ENTRY' : 'IDLE';
  const entryCountLabel = showAll
    ? `${regionDetails.length}/${totalEntries}`
    : pokemon
      ? `1/${totalEntries}`
      : `0/${totalEntries}`;

  // fetch full index once
  useEffect(() => {
    let mounted = true;
    async function fetchAllNames() {
      try {
        const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=20000');
        const data = await res.json();
        if (!mounted) return;
        setAllNames(data.results.map((r: any) => r.name));
      } catch (e) {
        console.warn('Could not load full index of Pokémon names', e);
      }
    }
    fetchAllNames();
    return () => {
      mounted = false;
    };
  }, []);

  // tiny sound effect when pokemon changes
  useEffect(() => {
    if (!pokemon) return;
    try {
      const audio = new Audio(CRY_URL);
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {
      // ignore
    }
  }, [pokemon?.id]);

  // global keyboard shortcuts
  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase() || '';
      const isTyping = tag === 'input' || tag === 'textarea' || (target as any)?.isContentEditable;
      if (isTyping) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        browseById(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        browseById(1);
      } else if ((e.key === 'r' || e.key === 'R') && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        randomPokemon();
      } else if (e.key === 's' || e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  });

  async function prepareRegionList(selRegion = region) {
    const range = REGIONS[selRegion]?.range || REGIONS.all.range;
    const [from, to] = range;
    const names: string[] = [];
    for (let id = from; id <= to; id++) names.push(String(id));
    setRegionList(names);
  }

  // fetch a page of region pokemon and species/evolution info for tile hints
  async function fetchRegionPage(page = 0, pageSize = 30) {
    if (regionList.length === 0) return;
    setLoadingRegion(true);
    setError(null);
    const start = page * pageSize;
    const slice = regionList.slice(start, start + pageSize);
    try {
      const details = await Promise.all(
        slice.map(async (idOrName) => {
          const d = await getPokemonJson(idOrName);
          const base: any = {
            id: d.id,
            name: d.name,
            types: d.types.map((t: any) => t.type.name),
            sprite:
              d.sprites.other?.['official-artwork']?.front_default ||
              d.sprites.front_default,
            hp: d.stats.find((s: any) => s.stat.name === 'hp')?.base_stat || 0,
            evolutions: [],
          };

          try {
            const speciesUrl = d.species.url;
            const evoData = await fetchEvolutionData(speciesUrl);
            if (evoData && evoData.evolutions && evoData.evolutions.length) {
              const evoSmall = await Promise.all(
                evoData.evolutions.slice(0, 3).map(async (evo: any) => {
                  try {
                    const pJson = await getPokemonJson(evo.name);
                    return {
                      name: evo.name,
                      sprite:
                        pJson.sprites.other?.['official-artwork']?.front_default ||
                        pJson.sprites.front_default,
                    };
                  } catch (err) {
                    return { name: evo.name, sprite: null };
                  }
                })
              );
              base.evolutions = evoSmall;
            }
          } catch (e) {
            // ignore
          }

          return base;
        })
      );

      setRegionDetails((prev) => [...prev, ...details]);
      setRegionPage(page);
    } catch (e) {
      console.error(e);
      setError('Failed to load region Pokémon');
    } finally {
      setLoadingRegion(false);
    }
  }

  // fetch single pokemon + full evolution chain
  async function fetchPokemon(q: string | number) {
    const trimmed = String(q).trim().toLowerCase();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setPokemon(null);

    try {
      const d = await getPokemonJson(trimmed);
      const normalized: any = {
        id: d.id,
        name: d.name,
        height: d.height,
        weight: d.weight,
        types: d.types.map((t: any) => t.type.name),
        sprite:
          d.sprites.other?.['official-artwork']?.front_default ||
          d.sprites.front_default,
        stats: d.stats.map((s: any) => ({ name: s.stat.name, value: s.base_stat })),
        abilities: d.abilities.map((a: any) => ({ name: a.ability.name, hidden: a.is_hidden })),
        moves: d.moves.map((m: any) => m.move.name),
        evolutions: [],
      };

      try {
        const speciesUrl = d.species.url;
        const evoData = await fetchEvolutionData(speciesUrl);
        if (evoData && evoData.evolutions && evoData.evolutions.length) {
          const evoFull = await Promise.all(
            evoData.evolutions.map(async (e: any) => {
              try {
                const pJson = await getPokemonJson(e.name);
                return {
                  name: e.name,
                  sprite:
                    pJson.sprites.other?.['official-artwork']?.front_default ||
                    pJson.sprites.front_default,
                };
              } catch (err) {
                return { name: e.name, sprite: null };
              }
            })
          );
          normalized.evolutions = evoFull;
        }
      } catch (e) {
        // ignore
      }

      setPokemon(normalized);
      setQuery(String(normalized.name));
      setShowAll(false);
      setSuggestIndex(-1);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function onSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    fetchPokemon(query);
  }

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>, currentSuggestions: string[]) {
    if (currentSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestIndex((prev) => {
        const next = prev + 1;
        return next >= currentSuggestions.length ? 0 : next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? currentSuggestions.length - 1 : next;
      });
    } else if (e.key === 'Enter') {
      if (suggestIndex >= 0 && suggestIndex < currentSuggestions.length) {
        e.preventDefault();
        const selected = currentSuggestions[suggestIndex];
        setQuery(selected);
        fetchPokemon(selected);
        setSuggestIndex(-1);
      }
    }
  }

  // region-aware random
  async function randomPokemon() {
    try {
      if (region !== 'all') {
        if (regionList.length === 0) await prepareRegionList(region);
        if (regionList.length > 0) {
          const nameOrId = regionList[Math.floor(Math.random() * regionList.length)];
          fetchPokemon(nameOrId);
          return;
        }
      }
      if (allNames.length > 0) {
        const name = allNames[Math.floor(Math.random() * allNames.length)];
        fetchPokemon(name);
        return;
      }
      const id = Math.floor(Math.random() * 1010) + 1;
      fetchPokemon(id);
    } catch (e) {
      setError('Could not pick a random Pokémon');
    }
  }

  function browseById(increment: number) {
    if (!pokemon) return;
    let nextId = pokemon.id + increment;
    if (nextId < 1) nextId = 1;
    fetchPokemon(nextId);
  }

  async function onShowAll() {
    setShowAll(true);
    setPokemon(null);
    setRegionDetails([]);
    await prepareRegionList(region);
    await fetchRegionPage(0);
  }

  function clearAll() {
    setQuery('');
    setPokemon(null);
    setError(null);
    setShowAll(false);
    setRegionDetails([]);
    setSuggestIndex(-1);
  }

  function capitalize(s: string | null | undefined) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  return (
    <div className="min-h-screen bg-slate-900 py-10 px-4 flex items-center justify-center">
      <div className="w-full max-w-6xl relative">
        {/* Card flip & scan animation styles */}
        <style>{`
          @keyframes cardFlip {
            0% { transform: rotateY(90deg); opacity: 0; }
            60% { transform: rotateY(-10deg); opacity: 1; }
            100% { transform: rotateY(0deg); opacity: 1; }
          }
          .card-flip {
            animation: cardFlip 0.5s ease-out;
            transform-style: preserve-3d;
          }
          @keyframes scanLine {
            0% { transform: translateY(-120%); opacity: 0; }
            10% { opacity: 0.7; }
            100% { transform: translateY(140%); opacity: 0; }
          }
          .scan-line {
            animation: scanLine 0.9s ease-out;
            background: linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%);
          }
        `}</style>

        {/* Pokedex outer shell */}
        <div className="relative bg-gradient-to-b from-red-600 to-red-800 rounded-[2.5rem] border-[10px] border-red-900 shadow-[0_25px_60px_rgba(0,0,0,0.8)] p-4 sm:p-6 overflow-hidden">
          {/* decorative inner pokeball */}
          <div className="absolute -bottom-24 -right-20 opacity-20 pointer-events-none transform rotate-6">
            <svg
              width="320"
              height="320"
              viewBox="0 0 420 420"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="210" cy="210" r="200" fill="#fff" stroke="#000" strokeWidth="6" />
              <path d="M10 210a200 200 0 0 0 400 0" fill="#FF6B6B" />
              <circle cx="210" cy="210" r="40" fill="#FFF" stroke="#000" strokeWidth="6" />
            </svg>
          </div>

          {/* top lens + LEDs */}
          <div className="relative z-10 flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-300 to-sky-600 border-[4px] border-sky-100 shadow-inner" />
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-green-400 shadow-sm" />
                <div className="w-3 h-3 rounded-full bg-yellow-300 shadow-sm" />
                <div className="w-3 h-3 rounded-full bg-red-400 shadow-sm" />
              </div>
            </div>
            <div className="hidden sm:flex gap-2 opacity-80">
              <div className="w-10 h-3 rounded bg-slate-900/40" />
              <div className="w-10 h-3 rounded bg-slate-900/40" />
              <div className="w-10 h-3 rounded bg-slate-900/40" />
            </div>
          </div>

          {/* Title chip */}
          <header className="mb-4 text-center relative z-10">
            <div className="inline-flex items-center gap-4 bg-white/95 backdrop-blur rounded-full px-5 py-3 shadow-2xl border-4 border-yellow-200">
              <PokeballLogo size={52} />
              <div className="text-left">
                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-blue-900 drop-shadow-sm">
                  Pokédex
                </h1>
                <p className="text-xs sm:text-sm text-pink-700 font-medium">
                  Web Pokédex — like the handheld, but bigger and brighter ✨
                </p>
              </div>
            </div>
          </header>

          {/* Control panel (inside the device) */}
          <div className="relative z-10 mb-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <form onSubmit={onSubmit} className="flex-1">
              <div className="flex gap-3 items-center">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setSuggestIndex(-1);
                    }}
                    onKeyDown={(e) => handleSearchKeyDown(e, suggestions)}
                    placeholder="Type a Pokémon name (pikachu) or id (25)"
                    className="w-full px-4 py-3 rounded-full border-4 border-yellow-200 focus:outline-none focus:border-pink-400 shadow-lg bg-white text-sm sm:text-base"
                  />

                  {suggestions.length > 0 && normalizedQuery.length >= 2 && (
                    <ul className="absolute left-0 right-0 mt-1 bg-white rounded-2xl border border-pink-100 shadow-lg max-h-56 overflow-auto text-xs sm:text-sm z-30">
                      {suggestions.map((name, idx) => (
                        <li
                          key={name}
                          className={`px-3 py-1 cursor-pointer hover:bg-pink-50 ${idx === suggestIndex ? 'bg-pink-100' : ''}`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setQuery(name);
                            fetchPokemon(name);
                            setSuggestIndex(-1);
                          }}
                        >
                          {name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm sm:text-base font-bold hover:scale-105 transition-transform shadow-2xl"
                  disabled={loading}
                >
                  {loading ? 'Searching…' : 'Search'}
                </button>
              </div>
            </form>

            <div className="flex gap-2 items-center justify-between sm:justify-end">
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as any)}
                className="px-3 py-2 rounded-full border-4 border-sky-200 bg-white shadow text-xs sm:text-sm"
              >
                {Object.entries(REGIONS).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={onShowAll}
                className="px-3 py-2 rounded-full bg-gradient-to-r from-yellow-300 to-orange-400 text-white text-xs sm:text-sm font-semibold shadow-lg"
              >
                Show all
              </button>

              <button
                type="button"
                onClick={randomPokemon}
                className="px-3 py-2 rounded-full bg-gradient-to-r from-indigo-400 to-emerald-400 text-white text-xs sm:text-sm font-semibold shadow-lg"
              >
                Random
              </button>

              <button
                type="button"
                onClick={clearAll}
                className="px-3 py-2 rounded-full border-4 border-gray-200 bg-white text-xs sm:text-sm hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          </div>

          {error && (
            <div className="relative z-10 mb-3 p-3 rounded-xl border-2 border-red-200 bg-red-50 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Inner dual leaves: left & right, like the classic Pokédex */}
          <div className="relative z-10 flex flex-col lg:flex-row gap-4">
            {/* Left leaf: main portrait screen + d-pad */}
            <div className="flex-1 bg-gradient-to-b from-red-700 to-red-900 rounded-[1.75rem] border-[6px] border-red-900 shadow-inner p-3 sm:p-4 flex flex-col gap-3">
              {/* left screen */}
              <div className="relative rounded-2xl bg-gradient-to-b from-[#FFF8D6] to-[#FFE4F3] border-[4px] border-slate-800 shadow-inner px-3 py-3 min-h-[260px]">
                {loading && (
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.35),transparent_60%)]" />
                    <div className="scan-line absolute left-0 right-0 h-20 -top-24" />
                  </div>
                )}

                {pokemon ? (
                  <div
                    key={pokemon.id}
                    className={`relative z-10 mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border-[6px] ${typeFrameClass} card-flip`}
                  >
                    <div className="flex flex-col">
                      <div className="p-4 bg-gradient-to-b from-white to-red-50 flex flex-col items-center justify-center">
                        <div className="w-full p-3 rounded-2xl bg-white/80 backdrop-blur-sm border-4 border-pink-100 shadow-inner">
                          <div className="w-full h-44 flex items-center justify-center">
                            {pokemon?.sprite ? (
                              <img
                                src={pokemon.sprite}
                                alt={pokemon.name}
                                className="w-full h-full object-contain drop-shadow-2xl"
                              />
                            ) : (
                              <div className="w-full h-full rounded bg-gray-100 flex items-center justify-center">
                                No image
                              </div>
                            )}
                          </div>

                          <div className="mt-3 text-center">
                            <div className="text-xs text-indigo-500 font-semibold">
                              #{String(pokemon.id).padStart(3, '0')}
                            </div>
                            <h2 className="text-2xl font-extrabold capitalize mt-1 text-blue-900 drop-shadow-sm">
                              {capitalize(pokemon.name)}
                            </h2>
                            <div className="mt-2 flex gap-2 justify-center flex-wrap">
                              {pokemon.types.map((t: string) => (
                                <TypeBadge key={t} type={t} />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative z-10 h-full flex flex-col items-center justify-center text-indigo-800 text-sm sm:text-base font-medium">
                    <div className="text-lg font-bold mb-1">No Pokémon selected</div>
                    <p className="text-xs sm:text-sm text-indigo-700/90 text-center max-w-xs">
                      Search by name or ID, press <span className="font-bold">Random</span>, or use the d-pad / arrows to explore
                      entries.
                    </p>
                  </div>
                )}
              </div>

              {/* d-pad + small green panel under screen (left hardware) */}
              <div className="flex items-center justify-between gap-4 mt-1">
                {/* small indicator screen */}
                <div className="hidden sm:block flex-1 max-w-[130px]">
                  <div className="rounded-xl bg-emerald-700 border-[3px] border-emerald-300 shadow-inner h-14 flex items-center justify-center">
                    <span className="text-[11px] text-emerald-50 font-semibold">
                      {pokemon ? `Entry #${pokemon.id}` : 'Ready to scan'}
                    </span>
                  </div>
                </div>

                {/* d-pad */}
                <div className="flex items-center justify-center flex-1">
                  <div className="grid grid-cols-3 grid-rows-3 gap-1">
                    <div />
                    <button
                      type="button"
                      onClick={randomPokemon}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-slate-900 text-white text-[10px] flex items-center justify-center shadow-inner hover:bg-slate-700"
                      title="Up = Random"
                    >
                      ▲
                    </button>
                    <div />

                    <button
                      type="button"
                      onClick={() => browseById(-1)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-slate-900 text-white text-[10px] flex items-center justify-center shadow-inner hover:bg-slate-700"
                      title="Left = Previous"
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      onClick={() => fetchPokemon(query || (pokemon?.id ?? '1'))}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-slate-700 text-white text-[10px] flex items-center justify-center shadow-inner hover:bg-slate-600"
                      title="Center = Scan"
                    >
                      ●
                    </button>
                    <button
                      type="button"
                      onClick={() => browseById(1)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-slate-900 text-white text-[10px] flex items-center justify-center shadow-inner hover:bg-slate-700"
                      title="Right = Next"
                    >
                      ▶
                    </button>

                    <div />
                    <button
                      type="button"
                      onClick={onShowAll}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded bg-slate-900 text-white text-[10px] flex items-center justify-center shadow-inner hover:bg-slate-700"
                      title="Down = Show all"
                    >
                      ▼
                    </button>
                    <div />
                  </div>
                </div>
              </div>
            </div>

            {/* Right leaf: data screen + buttons like anime layout */}
            <div className="flex-1 bg-gradient-to-b from-red-700 to-red-900 rounded-[1.75rem] border-[6px] border-red-900 shadow-inner p-3 sm:p-4 flex flex-col gap-3">
              {/* top dark screen for data / grid */}
              <div className="rounded-2xl bg-gradient-to-b from-slate-900 to-slate-800 border-[4px] border-slate-950 shadow-inner px-3 py-3 min-h-[220px] text-slate-50">
                {/* Status bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] text-slate-200 mb-2">
                  <span>
                    REGION: <span className="font-semibold">{regionConfig.label}</span>
                  </span>
                  <span>
                    MODE: <span className="font-semibold">{modeLabel}</span>
                  </span>
                  <span>
                    ENTRIES: <span className="font-mono">{entryCountLabel}</span>
                  </span>
                </div>

                {showAll ? (
                  <div className="mt-1 max-h-[260px] overflow-auto pr-1">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {regionDetails.map((p) => (
                        <div
                          key={p.id}
                          className="bg-slate-900/80 rounded-2xl shadow-md p-2 text-center border border-slate-600 hover:border-yellow-300 hover:shadow-lg transition-colors cursor-pointer flex flex-col gap-1"
                          onClick={() => fetchPokemon(p.name)}
                        >
                          <div className="w-full h-16 flex items-center justify-center bg-slate-800 rounded-xl">
                            {p.sprite ? (
                              <img src={p.sprite} alt={p.name} className="w-12 h-12 object-contain" />
                            ) : (
                              <div className="w-12 h-12 bg-slate-700 rounded" />
                            )}
                          </div>
                          <div>
                            <div className="text-[9px] text-sky-300 font-semibold">
                              #{String(p.id).padStart(3, '0')}
                            </div>
                            <div className="text-[10px] sm:text-xs font-extrabold capitalize text-slate-50">
                              {p.name}
                            </div>
                          </div>

                          <div className="mt-1 flex items-center justify-center gap-1 flex-wrap">
                            {p.types.map((t: string) => (
                              <span
                                key={t}
                                className="px-1.5 py-0.5 rounded-full bg-slate-800 text-[9px] capitalize border border-slate-600"
                              >
                                {t}
                              </span>
                            ))}
                          </div>

                          {p.evolutions && p.evolutions.length ? (
                            <div className="mt-1 flex items-center justify-center gap-1">
                              {p.evolutions.slice(0, 2).map((e: any) => (
                                <button
                                  key={e.name}
                                  type="button"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    fetchPokemon(e.name);
                                  }}
                                  className="flex flex-col items-center text-[8px] px-1 py-0.5 rounded bg-slate-800/90 border border-slate-600 hover:bg-yellow-500/20"
                                >
                                  {e.sprite ? (
                                    <img
                                      src={e.sprite}
                                      alt={e.name}
                                      className="w-5 h-5 object-contain mb-0.5"
                                    />
                                  ) : (
                                    <div className="w-5 h-5 bg-slate-700 rounded" />
                                  )}
                                  <span className="capitalize max-w-[2.5rem] truncate">{e.name}</span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-1 text-[8px] text-slate-400">No evolution</div>
                          )}

                          <div className="mt-1 flex items-center justify-center gap-1">
                            <div className="text-[8px] text-slate-300">HP</div>
                            <div className="w-12 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                              <div
                                style={{ width: `${Math.min(100, (p.hp / 255) * 100)}%` }}
                                className="h-1.5 rounded-full bg-red-400"
                              />
                            </div>
                            <div className="text-[8px] font-mono text-slate-200">{p.hp}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {regionDetails.length < regionList.length && (
                      <div className="mt-3 text-center">
                        <button
                          type="button"
                          onClick={() => fetchRegionPage(regionPage + 1)}
                          className="px-3 py-1.5 rounded-full bg-sky-500 text-white shadow text-[11px] font-semibold"
                        >
                          {loadingRegion ? 'Loading more…' : 'Load more cards'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : pokemon ? (
                  <div className="mt-1 max-h-[260px] overflow-auto pr-1 text-[11px] sm:text-xs leading-relaxed">
                    {/* Measurements */}
                    <div className="flex items-start justify-between gap-2 flex-wrap mb-3">
                      <div className="flex gap-2 flex-wrap">
                        <div className="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-400/60 min-w-[72px] text-center">
                          <div className="text-[9px] text-amber-200 font-semibold">Height</div>
                          <div className="text-sm font-extrabold text-amber-100 mt-0.5">
                            {pokemon.height} dm
                          </div>
                        </div>
                        <div className="px-2 py-1 rounded-lg bg-sky-500/20 border border-sky-400/60 min-w-[72px] text-center">
                          <div className="text-[9px] text-sky-200 font-semibold">Weight</div>
                          <div className="text-sm font-extrabold text-sky-100 mt-0.5">
                            {pokemon.weight} hg
                          </div>
                        </div>
                      </div>
                      <div className="text-[9px] text-slate-300 text-right">
                        <div>Data from</div>
                        <a
                          href="https://pokeapi.co"
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-red-300 underline"
                        >
                          PokeAPI
                        </a>
                      </div>
                    </div>

                    {/* Abilities */}
                    <div className="mb-3">
                      <div className="text-[10px] font-bold text-sky-200 mb-1">Abilities</div>
                      <div className="flex gap-1.5 flex-wrap">
                        {pokemon.abilities.map((a: any) => (
                          <span
                            key={a.name}
                            className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize bg-slate-800 border border-slate-600"
                          >
                            ✨ {a.name}
                            {a.hidden ? ' (hidden)' : ''}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Base stats */}
                    <div className="mb-3">
                      <div className="text-[10px] font-bold text-sky-200 mb-1">Base stats</div>
                      <div className="space-y-1.5">
                        {pokemon.stats.map((s: any) => (
                          <div key={s.name} className="flex items-center gap-2">
                            <div className="w-20 text-[9px] capitalize text-slate-200 font-semibold">
                              {s.name}
                            </div>
                            <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div
                                className="h-2 rounded-full"
                                style={{
                                  width: `${Math.min(100, (s.value / 255) * 100)}%`,
                                  background: 'linear-gradient(90deg,#34d399,#10b981)',
                                }}
                              />
                            </div>
                            <div className="w-8 text-right font-mono text-[9px] text-slate-100">
                              {s.value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top moves */}
                    <div className="mb-3">
                      <div className="text-[10px] font-bold text-sky-200 mb-1">Top moves</div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {pokemon.moves.slice(0, 10).map((m: string) => (
                          <div
                            key={m}
                            className="px-2 py-0.5 rounded-lg border border-slate-600 text-[9px] capitalize bg-slate-800 flex items-center gap-1"
                          >
                            <span className="text-xs">⚡</span>
                            <span className="truncate">{m}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Evolution strip */}
                    <div className="mb-1">
                      <div className="text-[10px] font-bold text-sky-200 mb-1 flex items-center gap-2">
                        Evolution
                        <span className="text-[9px] text-slate-300">(tap to jump)</span>
                      </div>
                      <div className="flex items-center gap-2 overflow-x-auto py-1">
                        {pokemon.evolutions && pokemon.evolutions.length ? (
                          pokemon.evolutions.map((e: any, index: number) => (
                            <React.Fragment key={e.name}>
                              <button
                                type="button"
                                onClick={() => fetchPokemon(e.name)}
                                className="flex flex-col items-center w-20 p-1.5 bg-slate-900 rounded-2xl shadow-md border border-slate-600 hover:border-yellow-300 hover:shadow-lg transition-colors cursor-pointer"
                              >
                                {e.sprite ? (
                                  <img
                                    src={e.sprite}
                                    alt={e.name}
                                    className="w-10 h-10 object-contain mb-0.5"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-slate-700 rounded mb-0.5" />
                                )}
                                <div className="text-[9px] mt-0.5 capitalize font-semibold">
                                  {e.name}
                                </div>
                              </button>
                              {index < pokemon.evolutions.length - 1 && (
                                <span className="text-base text-slate-400">➜</span>
                              )}
                            </React.Fragment>
                          ))
                        ) : (
                          <div className="text-[9px] text-slate-400">No evolution data</div>
                        )}
                      </div>
                    </div>

                    <div className="mt-1 text-[9px] text-slate-300">
                      Tip: tap evolutions, region tiles, or press R / arrows to hop quickly between entries.
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 text-[11px] text-slate-200 text-center">
                    Press <span className="font-bold">Show all</span> to browse cards from this region, or search for a Pokémon to
                    view detailed data here.
                  </div>
                )}
              </div>

              {/* hardware buttons: blue squares + A/B + big yellow */}
              <div className="mt-2 flex flex-col gap-2">
                {/* blue buttons row (quick region presets) */}
                <div className="flex justify-center gap-2">
                  {[
                    { key: 'kanto', label: 'KA' },
                    { key: 'johto', label: 'JO' },
                    { key: 'hoenn', label: 'HO' },
                    { key: 'sinnoh', label: 'SI' },
                  ].map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => {
                        setRegion(r.key as any);
                        setShowAll(true);
                        setRegionDetails([]);
                        prepareRegionList(r.key as any).then(() => fetchRegionPage(0));
                      }}
                      className={`w-10 h-8 rounded-lg border-[3px] shadow-inner text-[10px] font-bold tracking-tight ${
                        region === r.key ? 'bg-sky-400 border-sky-200 text-slate-900' : 'bg-sky-500 border-sky-300 text-white'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between gap-3 mt-1">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center gap-0.5">
                      <button
                        type="button"
                        onClick={onSubmit}
                        className="w-10 h-10 rounded-lg bg-white border-[3px] border-slate-500 shadow-md flex items-center justify-center text-xs font-bold text-slate-900 hover:bg-slate-100"
                      >
                        A
                      </button>
                      <span className="text-[9px] text-slate-200">Search</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <button
                        type="button"
                        onClick={clearAll}
                        className="w-10 h-10 rounded-lg bg-white border-[3px] border-slate-500 shadow-md flex items-center justify-center text-xs font-bold text-slate-900 hover:bg-slate-100"
                      >
                        B
                      </button>
                      <span className="text-[9px] text-slate-200">Clear</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={randomPokemon}
                    className="w-12 h-12 rounded-full bg-yellow-400 border-[4px] border-amber-200 shadow-lg flex items-center justify-center text-xs font-bold text-slate-900 hover:bg-yellow-300"
                  >
                    Random
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
