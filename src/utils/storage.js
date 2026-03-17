import AsyncStorage from '@react-native-async-storage/async-storage';

const HABITS_KEY = '@habits';
const COMPLETIONS_KEY = '@completions';

export async function loadHabits() {
  try {
    const json = await AsyncStorage.getItem(HABITS_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

export async function saveHabits(habits) {
  try {
    await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(habits));
  } catch {}
}

// completions: { "YYYY-MM-DD": { [habitId]: true } }
export async function loadCompletions() {
  try {
    const json = await AsyncStorage.getItem(COMPLETIONS_KEY);
    return json ? JSON.parse(json) : {};
  } catch {
    return {};
  }
}

export async function saveCompletions(completions) {
  try {
    await AsyncStorage.setItem(COMPLETIONS_KEY, JSON.stringify(completions));
  } catch {}
}

export function getWeekDates(referenceDate = new Date()) {
  const days = [];
  const ref = new Date(referenceDate);
  // Find Sunday of current week
  const dayOfWeek = ref.getDay(); // 0=Sun
  ref.setDate(ref.getDate() - dayOfWeek);
  for (let i = 0; i < 7; i++) {
    const d = new Date(ref);
    d.setDate(ref.getDate() + i);
    days.push(toDateString(d));
  }
  return days;
}

export function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayString() {
  return toDateString(new Date());
}
