/**
 * THE EVALUATION CORPUS
 * =====================
 *
 * Ten short, deliberately dense passages across subjects, committed to the repo so
 * the ablation is reproducible. Each is an original composition written for this
 * project (not copied from any textbook), pitched at roughly high-school register
 * so the loop has real work to do bringing it down to the target grade.
 *
 * scripts/evaluate.ts runs each one through both the naive one-shot and the LEXA
 * loop, at the same target, scored by the same Measurer, and writes the honest
 * numbers to data/evidence.json.
 */

import type { CorpusPassage } from "./types";

export const CORPUS: CorpusPassage[] = [
  {
    id: "photosynthesis",
    subject: "Biology",
    title: "Photosynthesis",
    target: 6,
    text: "Photosynthesis is the process by which plants convert light energy into chemical energy stored in glucose. Within chloroplasts, the pigment chlorophyll absorbs light, which drives the splitting of water molecules and releases oxygen. The resulting energy carriers fuel the Calvin cycle, in which atmospheric carbon dioxide is fixed into sugar. Stomata on the leaf surface regulate the exchange of these gases while limiting water loss.",
  },
  {
    id: "cell-membrane",
    subject: "Biology",
    title: "The Cell Membrane",
    target: 5,
    text: "The plasma membrane is a selectively permeable barrier composed of a phospholipid bilayer studded with proteins. Its hydrophobic interior repels water-soluble molecules, so small nonpolar substances diffuse across freely while ions and large polar molecules require transport proteins. Some proteins act as channels; others actively pump substances against their concentration gradient, consuming cellular energy in the process.",
  },
  {
    id: "plate-tectonics",
    subject: "Earth Science",
    title: "Plate Tectonics",
    target: 6,
    text: "Earth's rigid outer shell is fractured into tectonic plates that drift atop the ductile asthenosphere. Where plates diverge, molten rock rises to forge new oceanic crust; where they converge, denser crust subducts beneath its neighbor, generating earthquakes and volcanic arcs. The gradual accumulation and sudden release of stress along these boundaries accounts for much of the planet's seismic activity.",
  },
  {
    id: "newtons-laws",
    subject: "Physics",
    title: "Newton's Laws of Motion",
    target: 7,
    text: "Newton's first law asserts that an object persists in uniform motion unless acted upon by a net external force. The second law quantifies this relationship, stating that acceleration is proportional to the applied force and inversely proportional to mass. The third law holds that every force is accompanied by an equal and opposite reaction, so interacting bodies exert reciprocal forces upon one another.",
  },
  {
    id: "chemical-bonding",
    subject: "Chemistry",
    title: "Chemical Bonding",
    target: 7,
    text: "Atoms combine to attain more stable electron configurations. In ionic bonding, electrons are transferred between atoms, producing oppositely charged ions held together by electrostatic attraction. In covalent bonding, atoms share electron pairs, and when that sharing is unequal the bond becomes polar. The nature of these bonds dictates a compound's melting point, solubility, and electrical conductivity.",
  },
  {
    id: "water-cycle",
    subject: "Earth Science",
    title: "The Water Cycle",
    target: 4,
    text: "The water cycle describes the continuous circulation of water through the environment. Solar energy evaporates water from oceans and lakes into vapor, which rises, cools, and condenses into clouds. When droplets coalesce sufficiently, precipitation returns water to the surface, where it either infiltrates the soil to replenish groundwater or flows across the land as runoff toward the sea.",
  },
  {
    id: "supply-demand",
    subject: "Economics",
    title: "Supply and Demand",
    target: 8,
    text: "In a competitive market, the price of a good is determined by the interaction of supply and demand. As price rises, producers are willing to supply more while consumers demand less; as price falls, the reverse occurs. Equilibrium is reached at the price where the quantity supplied equals the quantity demanded, and external shocks to either curve shift that equilibrium accordingly.",
  },
  {
    id: "three-branches",
    subject: "Civics",
    title: "Separation of Powers",
    target: 6,
    text: "The United States government distributes authority among three branches to prevent any one from dominating. The legislative branch enacts laws, the executive branch enforces them, and the judicial branch interprets them. A system of checks and balances allows each branch to constrain the others, so that ambition is made to counteract ambition and no single institution accumulates unchecked power.",
  },
  {
    id: "immune-system",
    subject: "Health",
    title: "The Immune System",
    target: 5,
    text: "The immune system defends the body against pathogens through layered mechanisms. Physical barriers such as skin block most invaders, while the innate response mounts a rapid, general attack on those that breach it. The adaptive response is slower but specific: it produces antibodies tailored to a particular pathogen and retains a memory of it, enabling a faster defense upon subsequent exposure.",
  },
  {
    id: "electromagnetic-spectrum",
    subject: "Physics",
    title: "The Electromagnetic Spectrum",
    target: 7,
    text: "The electromagnetic spectrum encompasses all frequencies of electromagnetic radiation, from long-wavelength radio waves to high-energy gamma rays. Although these forms differ enormously in wavelength and energy, they all propagate through a vacuum at the speed of light. Visible light occupies only a narrow band of the spectrum, which is why instruments are required to detect the radiation our eyes cannot perceive.",
  },
];
