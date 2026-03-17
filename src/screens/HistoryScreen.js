import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  loadHabits,
  loadCompletions,
  getWeekDates,
  toDateString,
} from '../utils/storage';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const NUM_WEEKS = 12;

function getHabitColor(ratio) {
  if (ratio >= 1.0) return '#00e676';
  if (ratio >= 0.71) return '#69f0ae';
  if (ratio >= 0.43) return '#ffeb3b';
  if (ratio >= 0.14) return '#ff9800';
  if (ratio > 0) return '#ef5350';
  return '#1e1e1e';
}

function getPastWeeks(n) {
  const weeks = [];
  const now = new Date();
  for (let w = 0; w < n; w++) {
    const ref = new Date(now);
    ref.setDate(now.getDate() - w * 7);
    weeks.unshift(getWeekDates(ref));
  }
  return weeks;
}

export default function HistoryScreen() {
  const [habits, setHabits] = useState([]);
  const [completions, setCompletions] = useState({});
  const [weeks, setWeeks] = useState([]);
  const [selected, setSelected] = useState(null); // habitId to spotlight

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const [h, c] = await Promise.all([loadHabits(), loadCompletions()]);
        setHabits(h);
        setCompletions(c);
        setWeeks(getPastWeeks(NUM_WEEKS));
        setSelected(null);
      }
      load();
    }, [])
  );

  function weekRatioForHabit(habitId, weekDates) {
    const done = weekDates.filter((d) => completions[d]?.[habitId]).length;
    return done / 7;
  }

  function overallWeekRatio(weekDates) {
    if (!habits.length) return 0;
    const sum = habits.reduce((s, h) => s + weekRatioForHabit(h.id, weekDates), 0);
    return sum / habits.length;
  }

  function totalCompletions(habitId) {
    let count = 0;
    for (const vals of Object.values(completions)) {
      if (vals[habitId]) count++;
    }
    return count;
  }

  function currentStreak(habitId) {
    let streak = 0;
    const d = new Date();
    while (true) {
      const key = toDateString(d);
      if (completions[key]?.[habitId]) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  if (habits.length === 0) {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>History</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No habits yet</Text>
          <Text style={styles.emptySubtitle}>Add habits on the Week tab to see history</Text>
        </View>
      </View>
    );
  }

  const displayHabits = selected
    ? habits.filter((h) => h.id === selected)
    : habits;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History</Text>
        <Text style={styles.subTitle}>Last {NUM_WEEKS} weeks</Text>
      </View>

      {/* Habit filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
      >
        <TouchableOpacity
          style={[styles.pill, !selected && styles.pillActive]}
          onPress={() => setSelected(null)}
        >
          <Text style={[styles.pillText, !selected && styles.pillTextActive]}>All</Text>
        </TouchableOpacity>
        {habits.map((h) => (
          <TouchableOpacity
            key={h.id}
            style={[styles.pill, selected === h.id && styles.pillActive]}
            onPress={() => setSelected(selected === h.id ? null : h.id)}
          >
            <Text style={[styles.pillText, selected === h.id && styles.pillTextActive]}>
              {h.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Stats cards */}
        <View style={styles.statsRow}>
          {displayHabits.map((h) => {
            const streak = currentStreak(h.id);
            const total = totalCompletions(h.id);
            // best week
            const bestWeek = Math.max(...weeks.map((w) => weekRatioForHabit(h.id, w)));
            return (
              <View key={h.id} style={styles.statCard}>
                <Text style={styles.statHabitName} numberOfLines={1}>{h.name}</Text>
                <View style={styles.statGrid}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{streak}</Text>
                    <Text style={styles.statLabel}>day streak</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{total}</Text>
                    <Text style={styles.statLabel}>total done</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{Math.round(bestWeek * 100)}%</Text>
                    <Text style={styles.statLabel}>best week</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Heatmap grid */}
        <Text style={styles.sectionLabel}>Weekly breakdown</Text>
        <View style={styles.heatmapContainer}>
          {/* Day labels */}
          <View style={styles.heatmapDayLabels}>
            {DAY_LABELS.map((l, i) => (
              <Text key={i} style={styles.heatDayLabel}>{l}</Text>
            ))}
          </View>

          {/* One row per habit */}
          {displayHabits.map((habit) => (
            <View key={habit.id} style={styles.heatmapRow}>
              <Text style={styles.heatHabitLabel} numberOfLines={1}>
                {habit.name}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.heatmapCells}
              >
                {weeks.map((weekDates, wi) => {
                  const ratio = weekRatioForHabit(habit.id, weekDates);
                  const color = getHabitColor(ratio);
                  const label = weekDates[0].slice(5).replace('-', '/');
                  return (
                    <View key={wi} style={styles.weekColumn}>
                      <Text style={styles.weekDateLabel}>{label}</Text>
                      {weekDates.map((d, di) => {
                        const done = !!completions[d]?.[habit.id];
                        return (
                          <View
                            key={d}
                            style={[
                              styles.heatCell,
                              { backgroundColor: done ? color : '#1a1a1a' },
                            ]}
                          />
                        );
                      })}
                      <View style={[styles.weekBar, { backgroundColor: color, height: Math.max(2, ratio * 20) }]} />
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          ))}

          {/* Overall row */}
          {!selected && habits.length > 1 && (
            <View style={styles.heatmapRow}>
              <Text style={styles.heatHabitLabel}>Overall</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.heatmapCells}
              >
                {weeks.map((weekDates, wi) => {
                  const ratio = overallWeekRatio(weekDates);
                  const color = getHabitColor(ratio);
                  return (
                    <View key={wi} style={styles.weekColumn}>
                      <View style={[styles.weekOverallBar, { backgroundColor: color, opacity: 0.3 + ratio * 0.7 }]}>
                        <Text style={styles.weekOverallPct}>{Math.round(ratio * 100)}</Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0f0f' },

  header: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#fff' },
  subTitle: { fontSize: 13, color: '#888', marginTop: 2 },

  pillRow: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
    flexDirection: 'row',
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#1a1a1a',
  },
  pillActive: { backgroundColor: '#00e676', borderColor: '#00e676' },
  pillText: { color: '#aaa', fontSize: 12 },
  pillTextActive: { color: '#000', fontWeight: '700' },

  scroll: { paddingHorizontal: 16, paddingBottom: 40 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, color: '#555', fontWeight: '600' },
  emptySubtitle: { fontSize: 14, color: '#444', marginTop: 8, textAlign: 'center' },

  statsRow: { gap: 10, marginBottom: 20 },
  statCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#282828',
  },
  statHabitName: { color: '#fff', fontWeight: '600', fontSize: 15, marginBottom: 10 },
  statGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { color: '#00e676', fontSize: 22, fontWeight: '700' },
  statLabel: { color: '#666', fontSize: 11, marginTop: 2 },

  sectionLabel: { color: '#555', fontSize: 12, fontWeight: '600', marginBottom: 10, letterSpacing: 1 },

  heatmapContainer: { gap: 0 },
  heatmapDayLabels: {
    flexDirection: 'row',
    marginLeft: 90,
    marginBottom: 2,
  },
  heatDayLabel: { color: '#555', fontSize: 9, width: 14, textAlign: 'center', marginRight: 2 },

  heatmapRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  heatHabitLabel: {
    width: 86,
    color: '#888',
    fontSize: 11,
    paddingTop: 18,
    paddingRight: 4,
  },
  heatmapCells: { flexDirection: 'row', gap: 3 },

  weekColumn: { alignItems: 'center', width: 14 },
  weekDateLabel: { color: '#444', fontSize: 7, marginBottom: 2, transform: [{ rotate: '-90deg' }], width: 20, textAlign: 'center' },
  heatCell: { width: 14, height: 14, borderRadius: 2, marginBottom: 1 },
  weekBar: { width: 14, borderRadius: 2, marginTop: 2 },

  weekOverallBar: {
    width: 14,
    height: 30,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  weekOverallPct: { color: '#fff', fontSize: 6, fontWeight: '700' },
});
