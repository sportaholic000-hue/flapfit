import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled Flap Fit error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Flap Fit hit a snag</Text>
        <Text style={styles.message}>
          Your saved progress is still on this device. Try opening the screen again.
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Try opening Flap Fit again"
          style={styles.button}
          onPress={() => this.setState({ error: null })}
        >
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    backgroundColor: '#F0F9FF',
  },
  title: {
    color: '#06223D',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  message: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
    marginBottom: 22,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#0284C7',
    borderRadius: 12,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
