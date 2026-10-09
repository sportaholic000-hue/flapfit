jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-keep-awake', () => ({ activateKeepAwakeAsync: jest.fn().mockResolvedValue(undefined), deactivateKeepAwake: jest.fn().mockResolvedValue(undefined) }));
