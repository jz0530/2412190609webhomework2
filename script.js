// 根据老师《1.5菜谱搜索器.md》组织：搜索、渲染卡片、按 id 获取详情。
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const mealsContainer = document.getElementById('meals');
const resultHeading = document.getElementById('result-heading');
const errorContainer = document.getElementById('error-container');
const mealDetails = document.getElementById('meal-details');
const mealDetailsContent = document.querySelector('.meal-details-content');
const backBtn = document.getElementById('back-btn');
const BASE_URL = 'https://www.themealdb.com/api/json/v1/1/';
const SEARCH_URL = `${BASE_URL}search.php?s=`;
const LOOKUP_URL = `${BASE_URL}lookup.php?i=`;
let detailRequest = 0;
let selectedCard = null;

document.getElementById('search-form').addEventListener('submit', searchMeals);
mealsContainer.addEventListener('click', handleMealClick);
backBtn.addEventListener('click', () => {
  detailRequest++;
  mealDetails.classList.add('hidden');
  if (selectedCard?.isConnected) selectedCard.focus();
});

function showError(message) {
  errorContainer.textContent = message;
  errorContainer.classList.remove('hidden');
}
async function fetchMeals(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.meals !== null && !Array.isArray(data.meals)) throw new Error('Invalid response');
    return data.meals;
  } finally { clearTimeout(timer); }
}
async function searchMeals(event) {
  event.preventDefault();
  if (searchBtn.disabled) return;
  const searchTerm = searchInput.value.trim();
  if (!searchTerm) { showError('Please enter a search term.'); searchInput.focus(); return; }
  detailRequest++;
  mealDetails.classList.add('hidden');
  errorContainer.classList.add('hidden');
  mealsContainer.replaceChildren();
  resultHeading.textContent = `Searching for "${searchTerm}"…`;
  searchBtn.disabled = true;
  searchBtn.textContent = 'Searching…';
  try {
    const meals = await fetchMeals(SEARCH_URL + encodeURIComponent(searchTerm));
    if (!meals?.length) {
      resultHeading.textContent = '';
      showError(`No recipes found for "${searchTerm}". Try another search term!`);
      return;
    }
    resultHeading.textContent = `Search results for "${searchTerm}" (${meals.length}):`;
    displayMeals(meals);
  } catch (error) {
    resultHeading.textContent = '';
    showError('Could not connect to TheMealDB. Please check your connection and try again.');
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = 'Search';
  }
}
// 使用 textContent 写入接口返回文字，避免把外部文字当作 HTML 执行。
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function mealImage(meal, className) {
  const img = element('img', className);
  img.alt = meal.strMeal;
  try {
    const url = new URL(meal.strMealThumb);
    if (url.protocol === 'https:') img.src = url.href;
  } catch { /* 缺失图片时仍显示菜名。 */ }
  img.loading = 'lazy';
  return img;
}
function displayMeals(meals) {
  mealsContainer.replaceChildren();
  meals.forEach(meal => {
    const card = element('button', 'meal');
    card.type = 'button';
    card.dataset.mealId = meal.idMeal;
    const info = element('div', 'meal-info');
    info.append(element('h3', 'meal-title', meal.strMeal));
    if (meal.strCategory) info.append(element('span', 'meal-category', meal.strCategory));
    card.append(mealImage(meal, ''), info);
    mealsContainer.append(card);
  });
}
async function handleMealClick(event) {
  const card = event.target.closest('.meal');
  if (!card) return;
  selectedCard = card;
  const request = ++detailRequest;
  errorContainer.classList.add('hidden');
  mealDetails.classList.remove('hidden');
  mealDetailsContent.replaceChildren(element('p', '', 'Loading recipe…'));
  try {
    const meals = await fetchMeals(LOOKUP_URL + encodeURIComponent(card.dataset.mealId));
    if (request !== detailRequest) return;
    if (!meals?.[0]) throw new Error('Recipe unavailable');
    const meal = meals[0];
    const category = element('div', 'meal-details-category');
    category.append(element('span', '', meal.strCategory || 'Uncategorized'));
    const instructions = element('div', 'meal-details-instructions');
    instructions.append(element('h3', '', 'Instructions'), element('p', '', meal.strInstructions || 'No instructions available.'));
    const ingredients = element('div', 'meal-details-ingredients');
    const list = element('ul', 'ingredients-list');
    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}`]?.trim();
      if (ingredient) list.append(element('li', '', `${meal[`strMeasure${i}`]?.trim() || ''} ${ingredient}`.trim()));
    }
    ingredients.append(element('h3', '', 'Ingredients'), list);
    mealDetailsContent.replaceChildren(mealImage(meal, 'meal-details-img'), element('h2', 'meal-details-title', meal.strMeal), category, instructions, ingredients);
    try {
      const url = new URL(meal.strYoutube);
      if (url.protocol === 'https:' && ['youtube.com','www.youtube.com','youtu.be'].includes(url.hostname)) {
        const video = element('a', 'youtube-link', '▶ Watch Video');
        video.href = url.href; video.target = '_blank'; video.rel = 'noopener noreferrer';
        mealDetailsContent.append(video);
      }
    } catch { /* 没有视频时不显示链接。 */ }
    backBtn.focus({ preventScroll: true });
    mealDetails.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    if (request !== detailRequest) return;
    mealDetails.classList.add('hidden');
    showError('Could not load recipe details. Please try again later.');
  }
}
