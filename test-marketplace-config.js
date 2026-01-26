#!/usr/bin/env node

/**
 * Test script for marketplace configuration
 *
 * This script tests:
 * 1. Reading marketplace URL and cache TTL from config
 * 2. Setting custom marketplace URL and cache TTL
 * 3. Fetching skills catalog with retry mechanism
 */

import {
  getMarketplaceUrl,
  setMarketplaceUrl,
  getMarketplaceCacheTTL,
  setMarketplaceCacheTTL
} from './packages/shared/src/config/storage.ts';

import {
  getSkillsCatalog,
  fetchSkillsCatalog
} from './packages/shared/src/skills/catalog.ts';

async function testMarketplaceConfig() {
  console.log('🧪 Testing Marketplace Configuration\n');

  // Test 1: Get default marketplace URL
  console.log('1️⃣ Testing default marketplace URL...');
  const defaultUrl = getMarketplaceUrl();
  console.log(`   ✓ Default URL: ${defaultUrl}`);
  console.log('');

  // Test 2: Get default cache TTL
  console.log('2️⃣ Testing default cache TTL...');
  const defaultTTL = getMarketplaceCacheTTL();
  console.log(`   ✓ Default TTL: ${defaultTTL}ms (${defaultTTL / (1000 * 60 * 60)} hours)`);
  console.log('');

  // Test 3: Set custom marketplace URL
  console.log('3️⃣ Testing custom marketplace URL...');
  const customUrl = 'https://github.com/test-org/test-skills';
  setMarketplaceUrl(customUrl);
  const updatedUrl = getMarketplaceUrl();
  console.log(`   ✓ Set custom URL: ${customUrl}`);
  console.log(`   ✓ Retrieved URL: ${updatedUrl}`);
  console.log(`   ${updatedUrl === customUrl ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');

  // Test 4: Set custom cache TTL
  console.log('4️⃣ Testing custom cache TTL...');
  const customTTL = 1000 * 60 * 60 * 12; // 12 hours
  setMarketplaceCacheTTL(customTTL);
  const updatedTTL = getMarketplaceCacheTTL();
  console.log(`   ✓ Set custom TTL: ${customTTL}ms (${customTTL / (1000 * 60 * 60)} hours)`);
  console.log(`   ✓ Retrieved TTL: ${updatedTTL}ms (${updatedTTL / (1000 * 60 * 60)} hours)`);
  console.log(`   ${updatedTTL === customTTL ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');

  // Test 5: Restore default settings
  console.log('5️⃣ Restoring default settings...');
  setMarketplaceUrl(defaultUrl);
  setMarketplaceCacheTTL(defaultTTL);
  console.log(`   ✓ Restored URL: ${getMarketplaceUrl()}`);
  console.log(`   ✓ Restored TTL: ${getMarketplaceCacheTTL()}ms`);
  console.log('');

  // Test 6: Fetch catalog with retry (optional - may hit rate limits)
  console.log('6️⃣ Testing catalog fetch with retry mechanism...');
  console.log('   ⚠️  This may take a while if rate limited...');
  try {
    const catalog = await getSkillsCatalog(false, defaultUrl, defaultTTL);
    console.log(`   ✅ Successfully fetched catalog with ${catalog.skills.length} skills`);
    console.log(`   ✓ Last fetched: ${catalog.lastFetched}`);
    if (catalog.skills.length > 0) {
      console.log(`   ✓ Sample skill: ${catalog.skills[0].name} (${catalog.skills[0].slug})`);
    }
  } catch (error) {
    console.log(`   ❌ Failed to fetch catalog: ${error.message}`);
    console.log('   ℹ️  This is expected if GitHub API rate limit is exceeded');
  }
  console.log('');

  console.log('✅ All configuration tests completed!');
}

// Run tests
testMarketplaceConfig().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
