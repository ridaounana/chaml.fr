/**
 * Helpers for French Address auto-completion and housing zone classification
 */

export const searchAddress = async (query) => {
  if (!query || query.length < 3) return [];
  try {
    const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=5`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.features || [];
  } catch (err) {
    console.error("Address search API error:", err);
    return [];
  }
};

export const getZoneFromPostcode = (postcode) => {
  if (!postcode) return "C";
  const dep = postcode.slice(0, 2);
  
  // Zone A: Paris, Hauts-de-Seine, Seine-Saint-Denis, Val-de-Marne
  if (["75", "92", "93", "94"].includes(dep)) {
    return "A";
  }
  
  // Yvelines, Essonne, Val-d'Oise, Seine-et-Marne, Alpes-Maritimes
  if (["78", "91", "95", "77", "06"].includes(dep)) {
    return "A";
  }

  // Zone B: Large metropolitan departments
  if ([
    "69", // Rhône (Lyon)
    "13", // Bouches-du-Rhône (Marseille)
    "59", // Nord (Lille)
    "31", // Haute-Garonne (Toulouse)
    "33", // Gironde (Bordeaux)
    "44", // Loire-Atlantique (Nantes)
    "35", // Ille-et-Vilaine (Rennes)
    "67", // Bas-Rhin (Strasbourg)
    "38", // Isère (Grenoble)
    "83", // Var (Toulon)
    "34", // Hérault (Montpellier)
    "45", // Loiret (Orléans)
    "51", // Marne (Reims)
    "63", // Puy-de-Dôme (Clermont-Ferrand)
    "80", // Somme (Amiens)
    "76", // Seine-Maritime (Rouen)
    "21", // Côte-d'Or (Dijon)
    "37"  // Indre-et-Loire (Tours)
  ].includes(dep)) {
    return "B";
  }
  
  // Default to C for other rural / smaller towns
  return "C";
};
