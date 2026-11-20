import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseIngredientInput,
  mergeIngredients,
  removeIngredient,
  validateRecommendRequest,
  extractYouTubeVideoId,
  parseYouTubeSearchHtml,
  parseGroundedVideoLines,
  parseBatchedGroundedVideos,
  resolveTwoYouTubeLinks,
  filterRecipes,
  calculateRecipeStats,
} from './pantryLogic';
import type { RecipeRecommendation } from '../types/recipe';

test('parseIngredientInput splits commas, semicolons, and newlines and deduplicates case-insensitively', () => {
  const parsed = parseIngredientInput('  Paneer, spinach; Tomato\npaneer,  - green chili ');
  assert.deepEqual(parsed, ['Paneer', 'spinach', 'Tomato', 'green chili']);
});

test('mergeIngredients appends only new ingredients and deduplicates simple plurals', () => {
  const merged = mergeIngredients(
    ['Spinach', 'Paneer', 'Tomato'],
    ['paneer', 'Tomatoes', 'Ginger', 'Potato', 'Potatoes']
  );
  assert.deepEqual(merged, ['Spinach', 'Paneer', 'Tomato', 'Ginger', 'Potato']);
});

test('parseYouTubeSearchHtml extracts real videoRenderer items from ytInitialData', () => {
  const fakeHtml = `<html><script>var ytInitialData = {"contents":{"twoColumnSearchResultsRenderer":{"primaryContents":{"sectionListRenderer":{"contents":[{"itemSectionRenderer":{"contents":[{"videoRenderer":{"videoId":"5lVLxEr_qgM","title":{"runs":[{"text":"Dhaba Palak Paneer Recipe"}]},"ownerText":{"runs":[{"text":"Chef Ranveer Brar"}]}}},{"videoRenderer":{"videoId":"K1137tTUVv8","title":{"runs":[{"text":"Easy Palak Paneer"}]},"ownerText":{"runs":[{"text":"Hebbars Kitchen"}]}}}]}}]}}}}};</script></html>`;
  const videos = parseYouTubeSearchHtml(fakeHtml, 'Palak Paneer', 2);
  assert.equal(videos.length, 2);
  assert.equal(videos[0].url, 'https://www.youtube.com/watch?v=5lVLxEr_qgM');
  assert.equal(videos[0].title, 'Dhaba Palak Paneer Recipe');
  assert.equal(videos[0].channel, 'Chef Ranveer Brar');
  assert.equal(videos[1].url, 'https://www.youtube.com/watch?v=K1137tTUVv8');
});

test('parseGroundedVideoLines parses pipe-delimited title, channel, and YouTube URLs', () => {
  const sample = [
    '- Dhaba Palak Paneer | Ranveer Brar | https://www.youtube.com/watch?v=5lVLxEr_qgM',
    '2. Quick Palak Paneer | Hebbars Kitchen | https://youtu.be/K1137tTUVv8?t=10',
  ].join('\n');
  const parsed = parseGroundedVideoLines(sample, 'Palak Paneer');
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].title, 'Dhaba Palak Paneer');
  assert.equal(parsed[0].channel, 'Ranveer Brar');
  assert.equal(parsed[0].url, 'https://www.youtube.com/watch?v=5lVLxEr_qgM');
  assert.equal(parsed[1].url, 'https://www.youtube.com/watch?v=K1137tTUVv8');
});

test('parseBatchedGroundedVideos splits multi-dish search grounding output accurately', () => {
  const sample = [
    'DISH: Palak Paneer',
    'Palak Paneer | Ranveer Brar | https://www.youtube.com/watch?v=5lVLxEr_qgM',
    'Easy Palak Paneer | Hebbars Kitchen | https://www.youtube.com/watch?v=K1137tTUVv8',
    '',
    'DISH: Aloo Gobi',
    'Aloo Gobi Masala | Your Food Lab | https://www.youtube.com/watch?v=abc123XYZ_0',
  ].join('\n');
  const map = parseBatchedGroundedVideos(sample, ['Palak Paneer', 'Aloo Gobi']);
  assert.equal(map['Palak Paneer'].length, 2);
  assert.equal(map['Aloo Gobi'].length, 1);
  assert.equal(map['Aloo Gobi'][0].channel, 'Your Food Lab');
});

test('removeIngredient removes target regardless of case', () => {
  const next = removeIngredient(['Spinach', 'Paneer', 'Tomato'], 'paneer');
  assert.deepEqual(next, ['Spinach', 'Tomato']);
});

test('validateRecommendRequest rejects empty images and empty ingredients', () => {
  const empty = validateRecommendRequest(0, []);
  assert.equal(empty.valid, false);
  assert.ok(empty.error);

  assert.equal(validateRecommendRequest(1, []).valid, true);
  assert.equal(validateRecommendRequest(0, ['Potato']).valid, true);
});

test('extractYouTubeVideoId handles watch, youtu.be, shorts, and invalid URLs', () => {
  assert.equal(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractYouTubeVideoId('https://youtu.be/abc123XYZ_0?si=test'), 'abc123XYZ_0');
  assert.equal(extractYouTubeVideoId('https://www.youtube.com/shorts/9bZkp7q19f0'), '9bZkp7q19f0');
  assert.equal(extractYouTubeVideoId('https://www.youtube.com/results?search_query=palak+paneer'), null);
  assert.equal(extractYouTubeVideoId('not-a-url'), null);
});

test('resolveTwoYouTubeLinks prioritizes grounded video URLs and pads to 2 links', () => {
  const links = resolveTwoYouTubeLinks(
    'Palak Paneer',
    ['Palak Paneer Ranveer Brar', 'Easy Palak Paneer'],
    [
      { web: { uri: 'https://www.youtube.com/watch?v=1234567890a', title: 'Dhaba Style Palak Paneer - YouTube' } },
      { web: { uri: 'https://www.youtube.com/watch?v=1234567890a', title: 'Duplicate' } },
      { web: { uri: 'https://example.com/blog', title: 'Blog Post' } },
    ]
  );

  assert.equal(links.length, 2);
  assert.equal(links[0].url, 'https://www.youtube.com/watch?v=1234567890a');
  assert.equal(links[0].title, 'Dhaba Style Palak Paneer');
  assert.equal(links[0].kind, 'video');
  assert.equal(links[1].kind, 'search');
  assert.ok(links[1].url.startsWith('https://www.youtube.com/results?search_query='));
});

test('filterRecipes and calculateRecipeStats filter by region, cook time, and query', () => {
  const sample: RecipeRecommendation[] = [
    {
      id: '1',
      title: 'Palak Paneer',
      cuisine: 'North Indian',
      isIndianInspired: true,
      prepMinutes: 10,
      cookMinutes: 20,
      servings: 2,
      spiceLevel: 'Medium',
      summary: 'Creamy spiced spinach curry with paneer cubes.',
      fridgeIngredientsUsed: ['Spinach', 'Paneer', 'Tomato'],
      pantryStaplesNeeded: ['Cumin', 'Turmeric'],
      steps: ['Blanch spinach', 'Simmer with paneer'],
      youtubeVideos: [],
    },
    {
      id: '2',
      title: 'Roasted Bell Pepper & Chickpea Skillet',
      cuisine: 'Mediterranean Veg',
      isIndianInspired: false,
      prepMinutes: 15,
      cookMinutes: 25,
      servings: 2,
      spiceLevel: 'Mild',
      summary: 'Charred peppers and crispy chickpeas with herbs.',
      fridgeIngredientsUsed: ['Bell Pepper', 'Chickpeas'],
      pantryStaplesNeeded: ['Olive Oil', 'Paprika'],
      steps: ['Roast peppers', 'Toss chickpeas'],
      youtubeVideos: [],
    },
  ];

  assert.equal(filterRecipes(sample, '', null, 'indian').length, 1);
  assert.equal(filterRecipes(sample, '', 30, 'all').length, 1);
  assert.equal(filterRecipes(sample, 'chickpea', null, 'all').length, 1);

  const stats = calculateRecipeStats(sample);
  assert.equal(stats.count, 2);
  assert.equal(stats.indianCount, 1);
  assert.equal(stats.avgMinutes, 35);
});
