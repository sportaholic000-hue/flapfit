import {
  Fields,
  PermissionStatus,
  SortTypes,
  type ContactQuery,
  type ExistingContact,
} from 'expo-contacts';
import Alert from './alerts.web';

export { Fields, PermissionStatus, SortTypes };

const fakeContacts: ExistingContact[] = [];

let permissionStatus = {
  status: PermissionStatus.UNDETERMINED,
  expires: 'never' as const,
  granted: false,
  canAskAgain: true,
};

export const isAvailableAsync = async () => false;
export const requestPermissionsAsync = async () => permissionStatus;
export const getPermissionsAsync = async () => permissionStatus;

export const getContactsAsync = async (_options: ContactQuery = {}) => ({
  data: fakeContacts,
  hasNextPage: false,
  hasPreviousPage: false,
  total: 0,
});

export const getContactByIdAsync = async (_id: string, _options: ContactQuery = {}) => undefined;

const unsupported = async () => {
  Alert.alert('Not available', 'Contact access is not used by Flap Fit.');
  return { type: 'custom', data: null };
};

export const addContactAsync = unsupported;
export const updateContactAsync = unsupported;
export const removeContactAsync = unsupported;
export const presentContactPickerAsync = unsupported;
export const getGroupsAsync = unsupported;
export const createGroupAsync = unsupported;
export const removeGroupAsync = unsupported;
export const updateGroupNameAsync = unsupported;

export default {
  Fields,
  SortTypes,
  PermissionStatus,
  isAvailableAsync,
  requestPermissionsAsync,
  getPermissionsAsync,
  getContactsAsync,
  getContactByIdAsync,
  addContactAsync,
  updateContactAsync,
  removeContactAsync,
  presentContactPickerAsync,
  getGroupsAsync,
  createGroupAsync,
  removeGroupAsync,
  updateGroupNameAsync,
};
