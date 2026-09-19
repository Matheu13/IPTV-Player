import assert from 'assert';
import {
  buildHierarchicalCategoryTree,
  flattenHierarchyTree,
  filterChannelsByHierarchySelection,
  normalizeCategoryString,
} from '../src/lib/categoryHierarchy';

console.log('🧪 Testing Dynamic Sources with diverse international and genre playlists...');

// 1. A playlist with USA, France, Germany, and Spain (NO Sweden/UK/Canada/Norway)
const internationalChannels = [
  { id: 'us-1', name: 'NBC News', category: 'USA | News', groupTitle: 'USA | News' },
  { id: 'us-2', name: 'ESPN Live', category: 'USA | Sports', groupTitle: 'USA | Sports' },
  { id: 'us-3', name: 'HBO Cinema', category: 'USA | Cinema', groupTitle: 'USA | Cinema' },
  { id: 'fr-1', name: 'TF1 HD', category: 'France | National', groupTitle: 'France | National' },
  { id: 'fr-2', name: 'Canal+ Sport', category: 'France | Sports', groupTitle: 'France | Sports' },
  { id: 'de-1', name: 'ZDF HD', category: 'Germany | Allgemein', groupTitle: 'Germany | Allgemein' },
  { id: 'de-2', name: 'Sky Bundesliga', category: 'Germany | Sports', groupTitle: 'Germany | Sports' },
  { id: 'es-1', name: 'La 1 UHD', category: 'Spain | General', groupTitle: 'Spain | General' },
  { id: 'es-2', name: 'Movistar LaLiga', category: 'Spain | Deportes', groupTitle: 'Spain | Deportes' },
];

const intlTree = buildHierarchicalCategoryTree(internationalChannels);

console.log('   Country Groups generated:', intlTree.countryGroups.map(g => `${g.label} (${g.count})`));

// Verify NO hardcoded empty countries were generated!
assert(
  !intlTree.countryGroups.some((g) => g.label === 'Sweden' || g.label === 'Norway'),
  'Must NOT contain empty Sweden or Norway when source does not have them'
);

// Verify USA, France, Germany, Spain are present with correct counts
const usaGroup = intlTree.countryGroups.find((g) => g.label === 'USA');
assert(usaGroup && usaGroup.count === 3, 'USA group must have 3 channels');

const frGroup = intlTree.countryGroups.find((g) => g.label === 'France');
assert(frGroup && frGroup.count === 2, 'France group must have 2 channels');

const deGroup = intlTree.countryGroups.find((g) => g.label === 'Germany');
assert(deGroup && deGroup.count === 2, 'Germany group must have 2 channels');

const esGroup = intlTree.countryGroups.find((g) => g.label === 'Spain');
assert(esGroup && esGroup.count === 2, 'Spain group must have 2 channels');

// Verify filtering when USA is selected
const usaChannels = filterChannelsByHierarchySelection(internationalChannels, usaGroup.id, intlTree);
assert(usaChannels.length === 3, `Expected 3 USA channels, got ${usaChannels.length}`);
assert(usaChannels.some(c => c.id === 'us-1') && usaChannels.some(c => c.id === 'us-2'), 'Correct channels returned');

// Verify filtering when Germany Sports is selected
const deSportsChild = deGroup.children.find(c => c.label.toLowerCase().includes('sport'));
assert(deSportsChild, 'Germany sports child category must exist');
const deSportsChannels = filterChannelsByHierarchySelection(internationalChannels, deSportsChild.id, intlTree);
assert(deSportsChannels.length === 1 && deSportsChannels[0].id === 'de-2', 'Correct Germany Sports channel returned');

// 2. A playlist with flat genres (Pluto TV style: "Comedy", "Drama", "Crime", "Gaming")
const plutoChannels = [
  { id: 'p-1', name: 'Pluto Comedy Central', category: 'Comedy' },
  { id: 'p-2', name: 'FailArmy TV', category: 'Comedy' },
  { id: 'p-3', name: 'Crime Investigation', category: 'Crime' },
  { id: 'p-4', name: 'IGN Gaming TV', category: 'Gaming' },
];

const plutoTree = buildHierarchicalCategoryTree(plutoChannels);
assert(plutoTree.totalChannelsCount === 4, 'All 4 Pluto channels indexed');

// Verify all channels can be filtered and none are lost
const allPluto = filterChannelsByHierarchySelection(plutoChannels, 'all', plutoTree);
assert(allPluto.length === 4, 'All channels returned when "all" selected');

console.log('✅ All dynamic sources tests passed successfully!');
