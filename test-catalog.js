// Test script to verify catalog fetching
import { fetchSkillsCatalog } from './packages/shared/src/skills/catalog.ts';

console.log('Fetching skills catalog from GitHub...\n');

try {
  const catalog = await fetchSkillsCatalog();

  console.log(`✅ Successfully fetched ${catalog.skills.length} skills\n`);

  console.log('First 5 skills:');
  catalog.skills.slice(0, 5).forEach((skill, index) => {
    console.log(`\n${index + 1}. ${skill.name}`);
    console.log(`   Slug: ${skill.slug}`);
    console.log(`   Description: ${skill.description.substring(0, 100)}...`);
    console.log(`   Author: ${skill.author}`);
    console.log(`   Version: ${skill.version}`);
    console.log(`   URL: ${skill.downloadUrl}`);
  });

  console.log(`\n✅ Catalog test passed!`);
} catch (error) {
  console.error('❌ Error fetching catalog:', error);
  process.exit(1);
}
