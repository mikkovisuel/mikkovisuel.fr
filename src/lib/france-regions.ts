// Carte de prospection par région (demande du 2026-08-17) — la région n'est
// pas un champ saisi par l'admin (choix explicite : pas de champ de plus à
// remplir en plus de la ville) mais devinée depuis `Prospect.city`, texte
// libre. Approximatif par nature (ville mal orthographiée, homonyme, ville
// absente de la liste ci-dessous → non comptabilisée dans la carte, mais
// jamais perdue ailleurs dans l'app) — compromis accepté explicitement.
//
// Géométrie réelle (tracé + centroïde de chaque région) dans
// src/lib/france-map-geometry.ts, généré depuis un vrai GeoJSON plutôt que
// dessiné à la main (premier essai en silhouette stylisée jugé pas assez
// reconnaissable, voir la note dans ce fichier).
import { FRANCE_REGION_GEOMETRY } from "@/lib/france-map-geometry";

export const FRENCH_REGIONS = FRANCE_REGION_GEOMETRY.map(({ slug, label }) => ({ slug, label }));

// Villes reconnues par région — préfectures/sous-préfectures et villes
// notables de chaque département, pas un gazetteer exhaustif des ~35 000
// communes françaises (hors de portée ici, et non nécessaire : ce sont des
// salles/clubs/marques, très majoritairement en ville).
const CITIES_BY_REGION: Record<string, string[]> = {
  "hauts-de-france": [
    "Lille", "Amiens", "Roubaix", "Tourcoing", "Dunkerque", "Calais", "Boulogne-sur-Mer",
    "Arras", "Saint-Quentin", "Compiègne", "Beauvais", "Valenciennes", "Douai", "Cambrai",
    "Lens", "Béthune", "Maubeuge", "Villeneuve-d'Ascq", "Saint-Omer", "Laon", "Soissons",
    "Château-Thierry", "Creil", "Senlis", "Abbeville", "Berck", "Le Touquet", "Hazebrouck",
    "Armentières", "Wattrelos", "Marcq-en-Baroeul", "Liévin", "Hénin-Beaumont", "Bruay-la-Buissière",
  ],
  normandie: [
    "Rouen", "Le Havre", "Caen", "Cherbourg-en-Cotentin", "Cherbourg", "Évreux", "Dieppe",
    "Alençon", "Saint-Lô", "Vernon", "Lisieux", "Bayeux", "Vire", "Flers", "Louviers",
    "Bernay", "Argentan", "Granville", "Fécamp", "Elbeuf", "Sotteville-lès-Rouen",
    "Deauville", "Honfleur", "Colombelles", "Hérouville-Saint-Clair",
  ],
  bretagne: [
    "Rennes", "Brest", "Quimper", "Lorient", "Vannes", "Saint-Malo", "Saint-Brieuc",
    "Lanester", "Concarneau", "Fougères", "Vitré", "Landerneau", "Douarnenez", "Morlaix",
    "Guingamp", "Lannion", "Dinan", "Ploërmel", "Pontivy", "Auray", "Quimperlé",
    "Redon", "Saint-Malo", "Bruz", "Cesson-Sévigné",
  ],
  "ile-de-france": [
    "Paris", "Boulogne-Billancourt", "Saint-Denis", "Argenteuil", "Montreuil", "Nanterre",
    "Créteil", "Versailles", "Colombes", "Aulnay-sous-Bois", "Rueil-Malmaison", "Aubervilliers",
    "Champigny-sur-Marne", "Saint-Maur-des-Fossés", "Drancy", "Issy-les-Moulineaux",
    "Levallois-Perret", "Noisy-le-Grand", "Antony", "Neuilly-sur-Seine", "Sarcelles",
    "Vitry-sur-Seine", "Clichy", "Ivry-sur-Seine", "Pantin", "Cergy", "Fontenay-sous-Bois",
    "Villejuif", "Meaux", "Melun", "Évry", "Massy", "Corbeil-Essonnes", "Chelles",
    "Épinay-sur-Seine", "Bondy", "Le Blanc-Mesnil", "Sartrouville", "Vincennes",
    "Charenton-le-Pont", "Bobigny", "Franconville", "Gennevilliers", "Maisons-Alfort",
    "La Courneuve", "Poissy", "Bagneux", "Choisy-le-Roi", "Étampes", "Fontainebleau",
    "Provins", "Mantes-la-Jolie", "Conflans-Sainte-Honorine", "Saint-Germain-en-Laye",
    "Montmorency", "Enghien-les-Bains", "Clamart", "Meudon", "Sèvres", "Puteaux", "Courbevoie",
  ],
  "grand-est": [
    "Strasbourg", "Reims", "Metz", "Nancy", "Mulhouse", "Colmar", "Troyes",
    "Charleville-Mézières", "Châlons-en-Champagne", "Épinal", "Verdun", "Thionville",
    "Forbach", "Saint-Dizier", "Haguenau", "Sélestat", "Sarreguemines", "Sarrebourg",
    "Épernay", "Vitry-le-François", "Chaumont", "Bar-le-Duc", "Longwy", "Saint-Avold",
    "Schiltigheim", "Illkirch-Graffenstaden", "Vandœuvre-lès-Nancy", "Mundolsheim",
  ],
  "pays-de-la-loire": [
    "Nantes", "Angers", "Le Mans", "Saint-Nazaire", "Laval", "La Roche-sur-Yon", "Cholet",
    "Saumur", "Les Sables-d'Olonne", "Château-Gontier", "Fontenay-le-Comte", "Sablé-sur-Sarthe",
    "Rezé", "Saint-Herblain", "Vertou", "Orvault", "Bouguenais", "Challans", "Cholet",
  ],
  "centre-val-de-loire": [
    "Orléans", "Tours", "Bourges", "Blois", "Chartres", "Châteauroux", "Dreux", "Vierzon",
    "Joué-lès-Tours", "Saint-Cyr-sur-Loire", "Romorantin-Lanthenay", "Vendôme", "Issoudun",
    "Amboise", "Loches", "Chinon", "Pithiviers", "Montargis",
  ],
  "bourgogne-franche-comte": [
    "Dijon", "Besançon", "Belfort", "Montbéliard", "Chalon-sur-Saône", "Mâcon", "Auxerre",
    "Nevers", "Sens", "Le Creusot", "Dole", "Lons-le-Saunier", "Vesoul", "Gray", "Beaune",
    "Autun", "Chenôve", "Montceau-les-Mines", "Chevigny-Saint-Sauveur",
  ],
  "nouvelle-aquitaine": [
    "Bordeaux", "Limoges", "Poitiers", "Pau", "Bayonne", "La Rochelle", "Angoulême",
    "Périgueux", "Agen", "Mont-de-Marsan", "Niort", "Brive-la-Gaillarde", "Rochefort",
    "Saintes", "Cognac", "Guéret", "Tulle", "Biarritz", "Anglet", "Mérignac", "Pessac",
    "Talence", "Villenave-d'Ornon", "Bègles", "Libourne", "Arcachon", "Dax", "Châtellerault",
    "Bressuire", "Gujan-Mestras", "Andernos-les-Bains", "Cap Ferret", "Lège-Cap-Ferret",
  ],
  "auvergne-rhone-alpes": [
    "Lyon", "Villeurbanne", "Grenoble", "Saint-Étienne", "Clermont-Ferrand", "Annecy",
    "Chambéry", "Valence", "Bourg-en-Bresse", "Vienne", "Roanne", "Montluçon", "Moulins",
    "Aurillac", "Le Puy-en-Velay", "Privas", "Annonay", "Aubenas", "Thonon-les-Bains",
    "Annemasse", "Cluses", "Albertville", "Aix-les-Bains", "Voiron", "Bourgoin-Jallieu",
    "Vénissieux", "Oyonnax", "Firminy", "Rive-de-Gier", "Riom", "Issoire", "Thiers",
    "Meythet", "Seynod", "Écully", "Caluire-et-Cuire",
  ],
  occitanie: [
    "Toulouse", "Montpellier", "Nîmes", "Perpignan", "Béziers", "Albi", "Carcassonne",
    "Castres", "Narbonne", "Rodez", "Alès", "Sète", "Tarbes", "Cahors", "Auch", "Foix",
    "Mende", "Montauban", "Colomiers", "Tournefeuille", "Millau", "Agde", "Lunel",
    "Frontignan", "Balma", "Blagnac", "Lattes",
  ],
  "provence-alpes-cote-d-azur": [
    "Marseille", "Nice", "Toulon", "Aix-en-Provence", "Avignon", "Cannes", "Antibes",
    "La Seyne-sur-Mer", "Hyères", "Fréjus", "Arles", "Gap", "Digne-les-Bains", "Grasse",
    "Draguignan", "Salon-de-Provence", "Martigues", "Aubagne", "Istres", "Vitrolles",
    "Menton", "Cagnes-sur-Mer", "Le Cannet", "Mandelieu-la-Napoule", "Sanary-sur-Mer",
    "Six-Fours-les-Plages", "Carpentras", "Orange", "Manosque", "Saint-Raphaël", "Golfe-Juan",
    "Juan-les-Pins", "Cassis", "La Ciotat",
  ],
  corse: ["Ajaccio", "Bastia", "Porto-Vecchio", "Corte", "Calvi", "Sartène", "Bonifacio", "Propriano", "L'Île-Rousse"],
  // DROM (demande du 2026-08-17 "ajouter les DOM TOM") — "Saint-Denis" existe
  // à la fois ici (préfecture de La Réunion) et en Île-de-France
  // (Seine-Saint-Denis) : homonyme non résolu, même compromis assumé que le
  // reste de ce fichier (celui déclaré en dernier l'emporte dans la table).
  guadeloupe: [
    "Pointe-à-Pitre", "Basse-Terre", "Les Abymes", "Le Gosier", "Sainte-Anne", "Saint-François",
    "Baie-Mahault", "Petit-Bourg", "Le Moule", "Capesterre-Belle-Eau", "Morne-à-l'Eau", "Sainte-Rose",
  ],
  martinique: [
    "Fort-de-France", "Le Lamentin", "Le Robert", "Sainte-Marie", "Le François", "Schœlcher",
    "Ducos", "Rivière-Pilote", "Sainte-Luce", "Le Marin", "La Trinité",
  ],
  guyane: ["Cayenne", "Matoury", "Saint-Laurent-du-Maroni", "Kourou", "Rémire-Montjoly", "Macouria"],
  "la-reunion": [
    "Saint-Denis", "Saint-Paul", "Saint-Pierre", "Le Tampon", "Saint-André", "Saint-Louis",
    "Sainte-Marie", "Le Port", "Saint-Benoît", "Saint-Joseph",
  ],
  mayotte: ["Mamoudzou", "Koungou", "Dzaoudzi", "Sada", "Dembéni", "Tsingoni"],
};

function normalizeCity(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['\s-]+/g, " ")
    .trim();
}

const CITY_TO_REGION = new Map<string, string>();
for (const [regionSlug, cities] of Object.entries(CITIES_BY_REGION)) {
  for (const city of cities) {
    CITY_TO_REGION.set(normalizeCity(city), regionSlug);
  }
}

// Renvoie le slug de région deviné depuis un texte de ville libre, ou `null`
// si la ville est absente/non reconnue — l'appelant doit alors ignorer ce
// prospect pour la carte plutôt que le compter dans une région au hasard.
export function guessRegionSlug(city: string | null | undefined): string | null {
  if (!city) return null;
  return CITY_TO_REGION.get(normalizeCity(city)) ?? null;
}
