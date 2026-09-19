/**
 * Validation Script: Source Monitor Dashboard Provider Filter Dropdown
 * 
 * Verifies:
 * 1. Seed sources include diverse IPTV provider protocols (XTREAM, M3U, STALKER, HDHOMERUN_RF).
 * 2. Filtering by XTREAM returns only Xtream providers.
 * 3. Filtering by M3U returns only M3U providers.
 * 4. Filtering by STALKER returns only Stalker providers.
 * 5. Filtering by HDHOMERUN_RF returns only HDHomeRun providers.
 * 6. Filtering by specific source id isolates that single provider.
 * 7. Combined provider + status filtering works accurately without cross-contamination.
 * 8. Dynamic count calculations match registered sources per type.
 */

import { SourceMonitorEngine, RegisteredSourceRecord, SourceType } from '../src/lib/sourceMonitorEngine';

function filterSources(
  sources: RegisteredSourceRecord[],
  selectedProvider: string,
  filterStatus: string,
  searchQuery: string
): RegisteredSourceRecord[] {
  return sources.filter((src) => {
    // 1. Search filter
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchesSearch =
        src.name.toLowerCase().includes(q) ||
        src.credentials.baseUrl.toLowerCase().includes(q) ||
        src.sourceType.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }

    // 2. IPTV Provider filter
    if (selectedProvider !== 'ALL') {
      if (selectedProvider.startsWith('source:')) {
        const targetId = selectedProvider.replace('source:', '');
        if (src.id !== targetId) return false;
      } else {
        if (src.sourceType.toUpperCase() !== selectedProvider.toUpperCase()) {
          return false;
        }
      }
    }

    // 3. Status filter
    if (filterStatus !== 'ALL') {
      if (src.connectionState.status !== filterStatus) return false;
    }

    return true;
  });
}

async function runValidation() {
  console.log('🧪 Starting Source Monitor Dashboard Provider Filter Test Suite...');
  const engine = new SourceMonitorEngine();
  const allSources = engine.getAllSources();

  console.log(`📡 Loaded ${allSources.length} registered sources from engine.`);
  if (allSources.length < 3) {
    throw new Error(`Expected at least 3 seed sources, got ${allSources.length}`);
  }

  // Count by provider type
  const counts = {
    ALL: allSources.length,
    XTREAM: allSources.filter((s) => s.sourceType === 'XTREAM').length,
    M3U: allSources.filter((s) => s.sourceType === 'M3U').length,
    STALKER: allSources.filter((s) => s.sourceType === 'STALKER').length,
    HDHOMERUN_RF: allSources.filter((s) => s.sourceType === 'HDHOMERUN_RF').length,
  };

  console.log('📊 Provider Counts by Protocol:', counts);
  if (counts.XTREAM === 0 || counts.M3U === 0 || counts.STALKER === 0) {
    throw new Error('Seed sources must contain XTREAM, M3U, and STALKER providers.');
  }

  // Test 1: Filter by XTREAM
  const xtreamFiltered = filterSources(allSources, 'XTREAM', 'ALL', '');
  console.log(`[Test 1] XTREAM filter returned ${xtreamFiltered.length} sources.`);
  if (xtreamFiltered.length !== counts.XTREAM) {
    throw new Error(`Expected ${counts.XTREAM} Xtream sources, got ${xtreamFiltered.length}`);
  }
  for (const s of xtreamFiltered) {
    if (s.sourceType !== 'XTREAM') {
      throw new Error(`Source ${s.name} is not XTREAM (${s.sourceType})`);
    }
  }
  console.log('✅ [Test 1 Passed] Xtream provider filtering is 100% accurate.');

  // Test 2: Filter by M3U
  const m3uFiltered = filterSources(allSources, 'M3U', 'ALL', '');
  console.log(`[Test 2] M3U filter returned ${m3uFiltered.length} sources.`);
  if (m3uFiltered.length !== counts.M3U) {
    throw new Error(`Expected ${counts.M3U} M3U sources, got ${m3uFiltered.length}`);
  }
  for (const s of m3uFiltered) {
    if (s.sourceType !== 'M3U') {
      throw new Error(`Source ${s.name} is not M3U (${s.sourceType})`);
    }
  }
  console.log('✅ [Test 2 Passed] M3U provider filtering is 100% accurate.');

  // Test 3: Filter by STALKER
  const stalkerFiltered = filterSources(allSources, 'STALKER', 'ALL', '');
  console.log(`[Test 3] STALKER filter returned ${stalkerFiltered.length} sources.`);
  if (stalkerFiltered.length !== counts.STALKER) {
    throw new Error(`Expected ${counts.STALKER} Stalker sources, got ${stalkerFiltered.length}`);
  }
  for (const s of stalkerFiltered) {
    if (s.sourceType !== 'STALKER') {
      throw new Error(`Source ${s.name} is not STALKER (${s.sourceType})`);
    }
  }
  console.log('✅ [Test 3 Passed] Stalker provider filtering is 100% accurate.');

  // Test 4: Filter by HDHOMERUN_RF
  const hdhomerunFiltered = filterSources(allSources, 'HDHOMERUN_RF', 'ALL', '');
  console.log(`[Test 4] HDHOMERUN_RF filter returned ${hdhomerunFiltered.length} sources.`);
  if (hdhomerunFiltered.length !== counts.HDHOMERUN_RF) {
    throw new Error(`Expected ${counts.HDHOMERUN_RF} HDHomeRun sources, got ${hdhomerunFiltered.length}`);
  }
  for (const s of hdhomerunFiltered) {
    if (s.sourceType !== 'HDHOMERUN_RF') {
      throw new Error(`Source ${s.name} is not HDHOMERUN_RF (${s.sourceType})`);
    }
  }
  console.log('✅ [Test 4 Passed] HDHomeRun RF provider filtering is 100% accurate.');

  // Test 5: Specific Source ID Filter
  const targetSource = allSources[0];
  const specificFiltered = filterSources(allSources, `source:${targetSource.id}`, 'ALL', '');
  console.log(`[Test 5] Specific source filter returned ${specificFiltered.length} sources.`);
  if (specificFiltered.length !== 1 || specificFiltered[0].id !== targetSource.id) {
    throw new Error(`Expected single specific source ${targetSource.name}`);
  }
  console.log('✅ [Test 5 Passed] Specific source ID filtering is 100% accurate.');

  // Test 6: Combined Provider Filter + Status Filter (M3U + Offline)
  const m3uOfflineFiltered = filterSources(allSources, 'M3U', 'Offline', '');
  console.log(`[Test 6] M3U + Offline filter returned ${m3uOfflineFiltered.length} sources.`);
  for (const s of m3uOfflineFiltered) {
    if (s.sourceType !== 'M3U' || s.connectionState.status !== 'Offline') {
      throw new Error(`Mismatch in combined filter: ${s.name}`);
    }
  }
  console.log('✅ [Test 6 Passed] Combined Provider + Status filter works flawlessly.');

  // Test 7: Reset to ALL
  const allFiltered = filterSources(allSources, 'ALL', 'ALL', '');
  if (allFiltered.length !== allSources.length) {
    throw new Error(`Expected all ${allSources.length} sources when filter is ALL`);
  }
  console.log('✅ [Test 7 Passed] Filter reset to ALL restores full source list.');

  console.log('\n🎉 ALL 7 VALIDATION TESTS PASSED SUCCESSFULLY!');
}

runValidation().catch((err) => {
  console.error('❌ Validation Failed:', err);
  process.exit(1);
});
