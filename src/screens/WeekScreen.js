import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  loadHabits,
  saveHabits,
  loadCompletions,
  saveCompletions,
  getWeekDates,
  todayString,
} from '../utils/storage';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Returns a colour based on weekly completion ratio for a habit
function getHabitColor(ratio) {
  if (ratio >= 1.0) return '#00e676'; // perfect - bright green
  if (ratio >= 0.71) return '#69f0ae'; // great - green
  if (ratio >= 0.43) return '#ffeb3b'; // decent - yellow
  if (ratio >= 0.14) return '#ff9800'; // low - orange
  return '#ef5350';                    // none/poor - red
}

function getStreakEmoji(ratio) {
  if (ratio >= 1.0) return '🔥';
  if (ratio >= 0.71) return '✅';
  if (ratio >= 0.43) return '⚡';
  return '';
}

export default function WeekScreen() {
  const [habits, setHabits] = useState([]);
  const [completions, setCompletions] = useState({});
  const [weekDates, setWeekDates] = useState([]);
  const [newHabit, setNewHabit] = useState('');
  const [addingHabit, setAddingHabit] = useState(false);
  const today = todayString();

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [h, c] = await Promise.all([loadHabits(), loadCompletions()]);
        setHabits(h);
        setCompletions(c);
        setWeekDates(getWeekDates());
      }
      load();
    }, [])
  );

  async function toggleCompletion(habitId, dateStr) {
    const updated = { ...completions };
    if (!updated[dateStr]) updated[dateStr] = {};
    if (updated[dateStr][habitId]) {
      delete updated[dateStr][habitId];
    } else {
      updated[dateStr][habitId] = true;
    }
    setCompletions(updated);
    await saveCompletions(updated);
  }

  async function addHabit() {
    const name = newHabit.trim();
    if (!name) return;
    const habit = { id: Date.now().toString(), name };
    const updated = [...habits, habit];
    setHabits(updated);
    await saveHabits(updated);
    setNewHabit('');
    setAddingHabit(false);
  }

  async function deleteHabit(habitId) {
    Alert.alert('Remove Habit', 'Delete this habit and all its data?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = habits.filter((h) => h.id !== habitId);
          setHabits(updated);
          await saveHabits(updated);
          // Clean completions
          const updatedC = {};
          for (const [date, vals] of Object.entries(completions)) {
            const copy = { ...vals };
            delete copy[habitId];
            updatedC[date] = copy;
          }
          setCompletions(updatedC);
          await saveCompletions(updatedC);
        },
      },
    ]);
  }

  function weekRatio(habitId) {
    const done = weekDates.filter((d) => completions[d]?.[habitId]).length;
    return done / 7;
  }

  // Overall week score across all habits
  const overallScore = habits.length
    ? habits.reduce((sum, h) => sum + weekRatio(h.id), 0) / habits.length
    : 0;

  const weekLabel = weekDates.length
    ? `${weekDates[0].slice(5).replace('-', '/')} – ${weekDates[6].slice(5).replace('-', '/')}`
    : '';

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Habits</Text>
        <Text style={styles.weekLabel}>{weekLabel}</Text>
        {habits.length > 0 && (
          <View style={[styles.scorePill, { backgroundColor: getHabitColor(overallScore) }]}>
            <Text style={styles.scoreText}>
              Week: {Math.round(overallScore * 100)}%
            </Text>
          </View>
        )}
      </View>

      {/* Day column headers */}
      {habits.length > 0 && (
        <View style={styles.dayHeaderRow}>
          <View style={styles.habitNameCol} />
          {weekDates.map((d, i) => {
            const isToday = d === today;
            return (
              <View key={d} style={styles.dayCol}>
                <Text style={[styles.dayLabel, isToday && styles.todayLabel]}>
                  {DAY_LABELS[i]}
                </Text>
                <Text style={[styles.dayNumber, isToday && styles.todayLabel]}>
                  {parseInt(d.slice(8), 10)}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll}>
        {habits.length === 0 && !addingHabit && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No habits yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to add your first habit</Text>
          </View>
        )}

        {habits.map((habit) => {
          const ratio = weekRatio(habit.id);
          const color = getHabitColor(ratio);
          const emoji = getStreakEmoji(ratio);
          return (
            <View key={habit.id} style={styles.habitRow}>
              <TouchableOpacity
                style={styles.habitNameCol}
                onLongPress={() => deleteHabit(habit.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.habitNamePill, { borderLeftColor: color }]}>
                  <Text style={styles.habitName} numberOfLines={2}>
                    {habit.name}
                    {emoji ? `  ${emoji}` : ''}
                  </Text>
                </View>
              </TouchableOpacity>

              {weekDates.map((d) => {
                const done = !!completions[d]?.[habit.id];
                const isToday = d === today;
                const isFuture = d > today;
                return (
                  <TouchableOpacity
                    key={d}
                    style={styles.dayCol}
                    onPress={() => !isFuture && toggleCompletion(habit.id, d)}
                    activeOpacity={0.6}
                    disabled={isFuture}
                  >
                    <View
                      style={[
                        styles.checkBox,
                        done && { backgroundColor: color, borderColor: color },
                        isToday && !done && styles.todayBox,
                        isFuture && styles.futureBox,
                      ]}
                    >
                      {done && <Text style={styles.checkMark}>✓</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}

        {/* Add habit inline input */}
        {addingHabit && (
          <View style={styles.addRow}>
            <TextInput
              style={styles.input}
              placeholder="New habit name…"
              placeholderTextColor="#666"
              value={newHabit}
              onChangeText={setNewHabit}
              autoFocus
              onSubmitEditing={addHabit}
              returnKeyType="done"
              maxLength={40}
            />
            <TouchableOpacity style={styles.addConfirmBtn} onPress={addHabit}>
              <Text style={styles.addConfirmText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => { setAddingHabit(false); setNewHabit(''); }}
            >
              <Text style={styles.cancelText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      {!addingHabit && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setAddingHabit(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
  );
}

const HABIT_COL_WIDTH = 110;
const DAY_COL_WIDTH = 40;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0f0f' },

  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#0f0f0f',
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#fff' },
  weekLabel: { fontSize: 13, color: '#888', marginTop: 2 },
  scorePill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  scoreText: { fontSize: 12, fontWeight: '700', color: '#000' },

  dayHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  habitNameCol: { width: HABIT_COL_WIDTH, justifyContent: 'center' },
  dayCol: {
    width: DAY_COL_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: { fontSize: 10, color: '#666', textAlign: 'center' },
  dayNumber: { fontSize: 12, color: '#888', textAlign: 'center' },
  todayLabel: { color: '#fff', fontWeight: '700' },

  scroll: { paddingHorizontal: 16, paddingBottom: 100 },

  emptyState: { marginTop: 80, alignItems: 'center' },
  emptyTitle: { fontSize: 20, color: '#555', fontWeight: '600' },
  emptySubtitle: { fontSize: 14, color: '#444', marginTop: 8 },

  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  habitNamePill: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingRight: 4,
  },
  habitName: { fontSize: 12, color: '#ddd', flexWrap: 'wrap' },

  checkBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBox: { borderColor: '#555' },
  futureBox: { opacity: 0.3 },
  checkMark: { fontSize: 14, color: '#000', fontWeight: '700' },

  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: '#1e1e1e',
    borderRadius: 10,
    paddingHorizontal: 14,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  addConfirmBtn: {
    backgroundColor: '#00e676',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addConfirmText: { color: '#000', fontWeight: '700', fontSize: 14 },
  cancelBtn: {
    padding: 10,
  },
  cancelText: { color: '#666', fontSize: 18 },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00e676',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#00e676',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  fabText: { fontSize: 28, color: '#000', lineHeight: 32 },
});
