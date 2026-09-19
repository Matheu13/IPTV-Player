/**
 * Validation Script: Panel 2 Category Hierarchy & Provider Mapping Integrity
 *
 * Verifies:
 * 1. Correct normalization of raw provider strings (e.g. 'Sweden | Expressen Play' -> Sweden -> Expressen Play).
 * 2. Unmapped and composite strings fall into the 'Other' group with zero channel loss.
 * 3. Accurate channel counts and bidirectional channel-to-group mapping.
 * 4. Flattened tree generation and expand/collapse hierarchy state consistency.
 */

import {
  normalizeCategoryString,
  buildHierarchicalCategoryTree,
  flattenHierarchyTree,
  formatRegionLabel,
  filterChannelsByHierarchySelection,
} from '../src/lib/categoryHierarchy';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  }
}

console.log('🧪 [Test 1] Testing normalizeCategoryString parsing logic...');

// 1. Sweden subcategories tests
const seExpressen = normalizeCategoryString('Sweden | Expressen Play');
assert(seExpressen.country === 'Sweden', 'Expressen Play country must be Sweden');
assert(seExpressen.childCategory === 'Expressen Play', 'Child category must be Expressen Play');
assert(!seExpressen.isOther, 'Expressen Play should not be in Other');

const seDisney = normalizeCategoryString('Sweden | Disney+');
assert(seDisney.country === 'Sweden', 'Disney+ country must be Sweden');
assert(seDisney.childCategory === 'Disney+', 'Child category must be Disney+');

const seMax = normalizeCategoryString('Sweden | Max Sports 1');
assert(seMax.country === 'Sweden', 'Max Sports country must be Sweden');
assert(seMax.childCategory === 'Max Sports', 'Child category must be Max Sports');

const seTelia = normalizeCategoryString('Sweden | TeliaPlay Events');
assert(seTelia.country === 'Sweden', 'TeliaPlay country must be Sweden');
assert(seTelia.childCategory === 'TeliaPlay Events', 'Child category must be TeliaPlay Events');

const seViaplay = normalizeCategoryString('Sweden | ViaPlay Events Direct');
assert(seViaplay.country === 'Sweden', 'ViaPlay country must be Sweden');
assert(seViaplay.childCategory === 'ViaPlay Events', 'Child category must be ViaPlay Events');

// 2. UK, Canada, Norway tests
const ukSports = normalizeCategoryString('UK | Sky Sports Premier League');
assert(ukSports.country === 'UK', 'UK Sports country must be UK');
assert(ukSports.childCategory === 'Sky & TNT Sports', 'UK Sky Sports mapped to Sky & TNT Sports');

const caTsn = normalizeCategoryString('Canada | TSN 1 HD');
assert(caTsn.country === 'Canada', 'Canada TSN country must be Canada');
assert(caTsn.childCategory === 'Sports (TSN & Sportsnet)', 'TSN mapped to Sports (TSN & Sportsnet)');

const noTv2 = normalizeCategoryString('Norway | TV2 Sport');
assert(noTv2.country === 'Norway', 'Norway TV2 country must be Norway');
assert(noTv2.childCategory === 'TV2 Sport & Events', 'TV2 Sport mapped to TV2 Sport & Events');

// 3. Composite metadata tag tests (fall into 'Other')
const composite = normalizeCategoryString('Animation;Family;Kids');
assert(composite.country === 'Other', 'Composite tag must fall into Other');
assert(composite.isOther === true, 'Composite tag isOther flag must be true');

// 4. Non-country prefix test (fall into 'Other')
const nonCountry = normalizeCategoryString('4K | Ultra HD Master Stream');
assert(nonCountry.country === 'Other', '4K prefix must fall into Other');
assert(nonCountry.isOther === true, '4K prefix isOther flag must be true');

console.log('✅ [Test 1] Category normalization strings parsed successfully.');

console.log('🧪 [Test 2] Testing zero channel loss and provider mapping integrity...');

// Synthesize diverse test channel collection mimicking real M3U provider feeds
const mockChannels = [
  { id: 'se-1', name: 'Expressen Live 1', category: 'Sweden | Expressen Play' },
  { id: 'se-2', name: 'Expressen Live 2', category: 'Sweden | Expressen Play' },
  { id: 'se-3', name: 'Disney Channel SE', category: 'Sweden | Disney+' },
  { id: 'se-4', name: 'Max Sport 1 SE', category: 'Sweden | Max Sports' },
  { id: 'se-5', name: 'TeliaPlay Event 1', category: 'Sweden | TeliaPlay Events' },
  { id: 'se-6', name: 'ViaPlay Motor SE', category: 'Sweden | ViaPlay Events' },
  { id: 'se-7', name: 'SVT 1 HD', category: 'Sweden | SVT' },
  { id: 'uk-1', name: 'Sky Sports Main Event', category: 'UK | Sky Sports' },
  { id: 'uk-2', name: 'BBC One HD', category: 'UK | BBC' },
  { id: 'ca-1', name: 'TSN 1', category: 'Canada | TSN' },
  { id: 'ca-2', name: 'Sportsnet Ontario', category: 'Canada | Sportsnet' },
  { id: 'ca-3', name: 'CBC Vancouver', category: 'Canada | CBC' },
  { id: 'no-1', name: 'TV2 Direkte', category: 'Norway | TV2 Sport' },
  { id: 'no-2', name: 'NRK 1', category: 'Norway | NRK' },
  { id: 'oth-1', name: 'Disney Animation', category: 'Animation;Family;Kids' },
  { id: 'oth-2', name: '4K Tears of Steel', category: '4K | Master Cinema' },
  { id: 'oth-3', name: 'General Docs', category: 'DOCUMENTARY' },
];

const totalRawChannels = mockChannels.length;
const tree = buildHierarchicalCategoryTree(mockChannels);

// Verify total channels across all groups equals total raw channels
let totalCategorizedCount = 0;
for (const country of tree.countryGroups) {
  totalCategorizedCount += country.count;
}
totalCategorizedCount += tree.otherGroup.count;

console.log(`   Total raw channels: ${totalRawChannels}`);
console.log(`   Total in tree: ${tree.totalChannelsCount}`);
console.log(`   Channels across country groups + other: ${totalCategorizedCount}`);

assert(tree.totalChannelsCount === totalRawChannels, 'Zero channel loss: tree total must match raw channels');
assert(totalCategorizedCount >= totalRawChannels, 'All channels must be represented in country groups or other');

// Verify Sweden group contains expected subcategories
const swedenGroup = tree.countryGroups.find((g) => g.label === 'Sweden');
assert(Boolean(swedenGroup), 'Sweden group must exist in countryGroups');

const swedenSubLabels = swedenGroup!.children.map((c) => c.label);
assert(swedenSubLabels.includes('Expressen Play'), 'Sweden must have Expressen Play');
assert(swedenSubLabels.includes('Disney+'), 'Sweden must have Disney+');
assert(swedenSubLabels.includes('Max Sports'), 'Sweden must have Max Sports');
assert(swedenSubLabels.includes('TeliaPlay Events'), 'Sweden must have TeliaPlay Events');
assert(swedenSubLabels.includes('ViaPlay Events'), 'Sweden must have ViaPlay Events');

console.log('✅ [Test 2] Zero channel loss and provider mapping integrity confirmed.');

console.log('🧪 [Test 3] Testing Collapsible / Expandable Tree Flattening...');

// When Sweden is expanded, its children should be present in the rows
const expandedState = { Sweden: true, UK: false, Canada: false, Norway: false, Other: false };
const flattenedRows = flattenHierarchyTree(tree, expandedState);

const rowLabels = flattenedRows.map((r) => r.displayLabel);
assert(rowLabels.includes('ALL CHANNELS'), 'Tree must have ALL CHANNELS');
assert(rowLabels.includes('Categorized by COuntry'), 'Tree must have Categorized by COuntry header');
assert(rowLabels.includes('Sweden'), 'Tree must have Sweden');
assert(rowLabels.includes('Expressen Play'), 'Expanded Sweden must reveal Expressen Play');
assert(rowLabels.includes('Disney+'), 'Expanded Sweden must reveal Disney+');
assert(rowLabels.includes('Max Sports'), 'Expanded Sweden must reveal Max Sports');
assert(rowLabels.includes('TeliaPlay Events'), 'Expanded Sweden must reveal TeliaPlay Events');
assert(rowLabels.includes('ViaPlay Events'), 'Expanded Sweden must reveal ViaPlay Events');

// When UK is collapsed, UK child categories should NOT be in the flattened list
assert(!rowLabels.includes('Sky & TNT Sports'), 'Collapsed UK must not show Sky & TNT Sports');

// Collapsing Sweden
const collapsedState = { Sweden: false, UK: false, Canada: false, Norway: false, Other: false };
const collapsedRows = flattenHierarchyTree(tree, collapsedState);
const collapsedLabels = collapsedRows.map((r) => r.displayLabel);
assert(!collapsedLabels.includes('Expressen Play'), 'Collapsed Sweden must hide Expressen Play');

console.log('✅ [Test 3] Collapsible / Expandable tree flattening works accurately.');

console.log('🧪 [Test 4] Testing channelIds association and direct channel pulling per country/subcategory...');

// 1. Verify Sweden country channelIds and child channelIds
assert(swedenGroup!.channelIds.length === 7, `Sweden must have 7 channels, found ${swedenGroup!.channelIds.length}`);
assert(swedenGroup!.channelIds.includes('se-1'), 'Sweden must contain se-1');
assert(swedenGroup!.channelIds.includes('se-2'), 'Sweden must contain se-2');
assert(swedenGroup!.channelIds.includes('se-7'), 'Sweden must contain se-7');

const expressenChild = swedenGroup!.children.find((c) => c.label === 'Expressen Play');
assert(Boolean(expressenChild), 'Expressen Play child must exist');
assert(expressenChild!.channelIds.length === 2, `Expressen Play must have 2 channels, found ${expressenChild!.channelIds.length}`);
assert(expressenChild!.channelIds.includes('se-1'), 'Expressen Play must have se-1');
assert(expressenChild!.channelIds.includes('se-2'), 'Expressen Play must have se-2');

const disneyChild = swedenGroup!.children.find((c) => c.label === 'Disney+');
assert(Boolean(disneyChild), 'Disney+ child must exist');
assert(disneyChild!.channelIds.includes('se-3'), 'Disney+ must have se-3');

const maxSportsChild = swedenGroup!.children.find((c) => c.label === 'Max Sports');
assert(Boolean(maxSportsChild), 'Max Sports child must exist');
assert(maxSportsChild!.channelIds.includes('se-4'), 'Max Sports must have se-4');

const teliaChild = swedenGroup!.children.find((c) => c.label === 'TeliaPlay Events');
assert(Boolean(teliaChild), 'TeliaPlay Events child must exist');
assert(teliaChild!.channelIds.includes('se-5'), 'TeliaPlay Events must have se-5');

const viaplayChild = swedenGroup!.children.find((c) => c.label === 'ViaPlay Events');
assert(Boolean(viaplayChild), 'ViaPlay Events child must exist');
assert(viaplayChild!.channelIds.includes('se-6'), 'ViaPlay Events must have se-6');

// 2. Verify UK, Canada, Norway, Other channelIds
const ukGroup = tree.countryGroups.find((g) => g.label === 'UK');
assert(Boolean(ukGroup), 'UK group must exist');
assert(ukGroup!.channelIds.length === 2, `UK must have 2 channels, found ${ukGroup!.channelIds.length}`);
assert(ukGroup!.channelIds.includes('uk-1') && ukGroup!.channelIds.includes('uk-2'), 'UK must contain uk-1 and uk-2');

const canadaGroup = tree.countryGroups.find((g) => g.label === 'Canada');
assert(Boolean(canadaGroup), 'Canada group must exist');
assert(canadaGroup!.channelIds.length === 3, `Canada must have 3 channels, found ${canadaGroup!.channelIds.length}`);
assert(canadaGroup!.channelIds.includes('ca-1') && canadaGroup!.channelIds.includes('ca-2') && canadaGroup!.channelIds.includes('ca-3'), 'Canada must contain ca-1, ca-2, ca-3');

const norwayGroup = tree.countryGroups.find((g) => g.label === 'Norway');
assert(Boolean(norwayGroup), 'Norway group must exist');
assert(norwayGroup!.channelIds.length === 2, `Norway must have 2 channels, found ${norwayGroup!.channelIds.length}`);
assert(norwayGroup!.channelIds.includes('no-1') && norwayGroup!.channelIds.includes('no-2'), 'Norway must contain no-1 and no-2');

assert(tree.otherGroup.channelIds.length === 3, `Other must have 3 channels, found ${tree.otherGroup.channelIds.length}`);
assert(tree.otherGroup.channelIds.includes('oth-1'), 'Other must contain oth-1');

// 3. Test filterChannelsByHierarchySelection with country and subcategory IDs
const swedenChannels = filterChannelsByHierarchySelection(mockChannels, swedenGroup!.id, tree);
assert(swedenChannels.length === 7, `filterChannelsByHierarchySelection for Sweden must return 7 channels, got ${swedenChannels.length}`);

const expressenChannels = filterChannelsByHierarchySelection(mockChannels, expressenChild!.id, tree);
assert(expressenChannels.length === 2, `filterChannelsByHierarchySelection for Expressen Play must return 2 channels, got ${expressenChannels.length}`);
assert(expressenChannels.map((c) => c.id).includes('se-1'), 'Expressen filtered channels must include se-1');
assert(expressenChannels.map((c) => c.id).includes('se-2'), 'Expressen filtered channels must include se-2');

const ukChannels = filterChannelsByHierarchySelection(mockChannels, ukGroup!.id, tree);
assert(ukChannels.length === 2, `filterChannelsByHierarchySelection for UK must return 2 channels, got ${ukChannels.length}`);

console.log('✅ [Test 4] Channel IDs association and direct channel pulling verified with 100% integrity.');

console.log('🎉 ALL TESTS PASSED: Panel 2 category hierarchy and provider mapping validated successfully!');
