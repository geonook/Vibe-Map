import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vibe Map</Text>
        <Text style={styles.subtitle}>Navigate by your vibe</Text>
      </View>

      <View style={styles.vibeGrid}>
        <TouchableOpacity style={[styles.vibeCard, styles.greenery]}>
          <Text style={styles.vibeEmoji}>🌳</Text>
          <Text style={styles.vibeLabel}>Greenery</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.vibeCard, styles.quiet]}>
          <Text style={styles.vibeEmoji}>🔇</Text>
          <Text style={styles.vibeLabel}>Quietness</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.vibeCard, styles.culture]}>
          <Text style={styles.vibeEmoji}>🎨</Text>
          <Text style={styles.vibeLabel}>Culture</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.vibeCard, styles.scenery]}>
          <Text style={styles.vibeEmoji}>🏞️</Text>
          <Text style={styles.vibeLabel}>Scenery</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.startButton}>
        <Text style={styles.startButtonText}>Start Navigating</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginVertical: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 8,
  },
  vibeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginVertical: 40,
  },
  vibeCard: {
    width: '48%',
    height: 120,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  greenery: {
    backgroundColor: '#a8e6a3',
  },
  quiet: {
    backgroundColor: '#b3e5fc',
  },
  culture: {
    backgroundColor: '#ffcdd2',
  },
  scenery: {
    backgroundColor: '#fff9c4',
  },
  vibeEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  vibeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  startButton: {
    backgroundColor: '#4a90e2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 'auto',
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});