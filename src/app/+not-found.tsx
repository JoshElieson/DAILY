import { Link, Stack } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { EmptyState, Screen } from '@/components';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Screen>
        <View style={styles.center}>
          <EmptyState
            title="This page wandered off"
            body="The screen you were looking for isn't here."
          />
          <Link href="/(tabs)" style={styles.link}>
            Back to Today
          </Link>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  link: { alignSelf: 'center', marginTop: 8 },
});
