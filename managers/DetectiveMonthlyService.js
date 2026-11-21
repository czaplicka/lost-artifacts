import { MainStoryManager } from './MainStoryManager.js';
import { saveGameState } from '../gameStatePersistence.js';
import { inventoryManager } from './InventoryManager.js';
import { loadJson } from '../config/loadJson.js';

export const MONTHLY_KEY = 'detective_monthly_v1';
const TRUST_KEY = 'alex_trust';
export function validateMonthlyIssue(data) {
  if (data?.version !== 1 || !/^[a-z0-9_]+$/.test(data.id) || !Array.isArray(data.articles) || !data.articles.length) throw Error('Invalid Detective Monthly issue.');
  const ids = new Set();
  for (const article of data.articles) {
    if (!/^[a-z0-9_]+$/.test(article.id) || ids.has(article.id)) throw Error('Invalid article id.');
    ids.add(article.id);
    for (const field of ['title', 'deck', 'prompt']) if (typeof article[field] !== 'string' || !article[field].trim()) throw Error('Missing article text.');
    for (const lines of [article.paragraphs, article.alex?.lines, article.alex?.recall]) if (!Array.isArray(lines) || !lines.length || lines.some(line => typeof line !== 'string' || !line.trim())) throw Error('Invalid article text.');
    if (!Number.isInteger(article.alex.delta) || article.alex.delta < 0 || article.alex.delta > 2) throw Error('Invalid trust effect.');
  }
  return structuredClone(data);
}
export const monthlyIssue = validateMonthlyIssue(await loadJson('../assets/data/detectiveMonthly.json', import.meta.url));
export const monthlySession = () => MainStoryManager.sideClues;
export const hasMonthly = () => inventoryManager.hasItem('detective_monthly');
export function monthlyState(raw = MainStoryManager.getSideClue(MONTHLY_KEY)) {
  if (raw == null) return { version: 1, issues: {} };
  if (raw.version !== 1 || !raw.issues || typeof raw.issues !== 'object' || Array.isArray(raw.issues)) throw Error('Invalid saved magazine state.');
  const record = raw.issues[monthlyIssue.id];
  if (record && (!Array.isArray(record.read) || record.read.some(id => typeof id !== 'string') || (record.alex && !monthlyIssue.articles.some(a => a.id === record.alex.articleId)))) throw Error('Invalid saved magazine record.');
  return structuredClone(raw);
}
export function currentMonthlyRecord() {
  return monthlyState().issues[monthlyIssue.id] || { read: [], alex: null };
}
function write(key, value) {
  try { MainStoryManager.setSideClue(key, value); }
  catch (error) {
    if (JSON.stringify(MainStoryManager.getSideClue(key)) !== JSON.stringify(value)) throw error;
    console.warn('[Detective Monthly] State updated; a notification failed:', error);
  }
}
function commit(patches) {
  const before = patches.map(([key]) => [key, structuredClone(MainStoryManager.getSideClue(key))]);
  try {
    for (const [key, value] of patches) write(key, value);
    if (saveGameState() !== true) throw Error('Could not save. Magazine progress and trust have not been awarded.');
  } catch (error) {
    for (const [key, value] of before) write(key, value);
    throw error;
  }
}
export function markMonthlyRead(articleId) {
  if (!hasMonthly()) throw Error('You no longer have the magazine.');
  if (!monthlyIssue.articles.some(a => a.id === articleId)) throw Error('Unknown article.');
  const state = monthlyState();
  state.issues[monthlyIssue.id] ??= { read: [], alex: null };
  const record = state.issues[monthlyIssue.id];
  if (record.read.includes(articleId)) return;
  record.read.push(articleId);
  commit([[MONTHLY_KEY, state]]);
}
export function prepareMonthlyDiscussion(articleId) {
  if (!hasMonthly()) throw Error('You no longer have the magazine.');
  const state = monthlyState(), record = state.issues[monthlyIssue.id];
  const article = monthlyIssue.articles.find(a => a.id === (record?.alex?.articleId || articleId));
  if (!article) throw Error('Unknown article.');
  if (!record?.read.includes(article.id)) throw Error('Read the article first.');
  return { state, articleId: article.id, repeated: Boolean(record.alex),
    lines: [...(record.alex ? article.alex.recall : article.alex.lines)], delta: record.alex ? 0 : article.alex.delta };
}
export function completeMonthlyDiscussion(articleId) {
  const plan = prepareMonthlyDiscussion(articleId);
  if (plan.repeated) return { changed: false, delta: 0 };
  const raw = MainStoryManager.getSideClue(TRUST_KEY);
  const trust = { ...(raw || {}), value: Number.isFinite(raw?.value) ? Math.max(0, Math.min(100, Math.round(raw.value))) : 50,
    counted: Array.isArray(raw?.counted) ? [...raw.counted] : [] };
  const milestone = `detective_monthly:${monthlyIssue.id}:alex`, previous = trust.value;
  if (!trust.counted.includes(milestone)) {
    trust.value = Math.min(100, trust.value + plan.delta);
    trust.counted.push(milestone);
  }
  plan.state.issues[monthlyIssue.id].alex = { articleId: plan.articleId, delta: trust.value - previous };
  commit([[MONTHLY_KEY, plan.state], [TRUST_KEY, trust]]);
  return { changed: true, delta: trust.value - previous };
}
