import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import * as Location from 'expo-location';
import { locationsService, PincodeResult } from '../services/locationsService';
import { colors, spacing, radius } from '../constants/theme';

interface LocationPickerProps {
  onSelect: (pincode: string, meta?: PincodeResult) => void;
}

export function LocationPicker({ onSelect }: LocationPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PincodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await locationsService.search(q);
      setResults(data);
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      runSearch(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  const handleGPS = async () => {
    setGpsLoading(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied. Please enable in settings.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const geocoded = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      const postalCode = geocoded[0]?.postalCode;
      if (postalCode && /^\d{6}$/.test(postalCode)) {
        onSelect(postalCode);
      } else {
        setError('Could not detect pincode for your location.');
      }
    } catch {
      setError('An error occurred while detecting your location.');
    } finally {
      setGpsLoading(false);
    }
  };

  const handleResultPress = (item: PincodeResult) => {
    onSelect(item.pincode, item);
  };

  return (
    <View style={styles.container}>
      {/* Search input */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search by area, district, or 6-digit pincode"
        placeholderTextColor={colors.g400}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      {/* GPS button */}
      <TouchableOpacity
        style={styles.gpsBtn}
        onPress={handleGPS}
        disabled={gpsLoading}
      >
        {gpsLoading ? (
          <ActivityIndicator size="small" color={colors.blue} />
        ) : (
          <Text style={styles.gpsBtnText}>📍 Use my current location</Text>
        )}
      </TouchableOpacity>

      {/* Error message */}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Loading indicator for search */}
      {loading ? (
        <ActivityIndicator size="small" color={colors.blue} style={styles.searchLoader} />
      ) : null}

      {/* Results list */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.pincode}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.resultRow}
            onPress={() => handleResultPress(item)}
          >
            <View style={styles.resultLeft}>
              <Text style={styles.resultArea}>{item.area}</Text>
              <Text style={styles.resultSub}>
                {item.district}, {item.state}
              </Text>
            </View>
            <Text style={styles.resultPincode}>{item.pincode}</Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
    padding: spacing.lg,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: 15,
    color: colors.g800,
    marginBottom: spacing.md,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.blue,
    borderRadius: radius.lg,
    backgroundColor: '#EBF5FF',
  },
  gpsBtnText: {
    fontSize: 14,
    color: colors.blue,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 13,
    color: '#B91C1C',
  },
  searchLoader: {
    marginVertical: spacing.sm,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  resultLeft: {
    flex: 1,
    marginRight: spacing.md,
  },
  resultArea: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.g900,
  },
  resultSub: {
    fontSize: 12,
    color: colors.g500,
    marginTop: 2,
  },
  resultPincode: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.blue,
  },
  separator: {
    height: 0.5,
    backgroundColor: colors.g200,
  },
});
