import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export { CANADIAN_PROVINCES_AND_TERRITORIES, US_STATES_AND_TERRITORIES } from '@/config/residency';

type Props = {
  region: 'province' | 'state';
  options: readonly (readonly [string, string])[];
  expanded: boolean;
  savedAnswer: string | null;
  disabled: boolean;
  onToggle: () => void;
  onSelect: (code: string) => void;
};

/** The caller persists the selection locally and supplies its display name. */
export function ResidencyDropdown({ region, options, expanded, savedAnswer, disabled, onToggle, onSelect }: Props) {
  const answered = savedAnswer !== null;
  const label = `${answered ? 'Change' : 'Select'} ${region} or territory`;
  return <View style={styles.root}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded, disabled }}
      accessibilityValue={{ text: savedAnswer ?? 'Not answered' }}
      disabled={disabled} onPress={onToggle} style={[styles.trigger, answered && styles.savedTrigger, disabled && styles.disabled]}>
      <Text style={[styles.triggerText, answered && styles.savedText]}>{answered ? `${savedAnswer} · Change` : label}</Text>
      <Text accessible={false} style={[styles.arrow, answered && styles.savedText]}>{expanded ? '⌃' : '⌄'}</Text>
    </TouchableOpacity>
    {expanded ? <View style={styles.menu}>
      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={styles.list}>
        {options.map(([code, name]) => <TouchableOpacity key={code} accessibilityRole="button" accessibilityLabel={name}
          accessibilityState={{ disabled }} disabled={disabled} onPress={() => onSelect(code)} style={[styles.option, disabled && styles.disabled]}>
          <Text style={styles.optionText}>{name}</Text>
        </TouchableOpacity>)}
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
          onPress={() => onSelect('outside')} style={[styles.option, disabled && styles.disabled]}>
          <Text style={styles.optionText}>{region === 'province' ? 'I live outside Canada' : 'I live outside the United States'}</Text>
        </TouchableOpacity>
      </ScrollView>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Cancel ${region} selection`} disabled={disabled}
        accessibilityState={{ disabled }} onPress={onToggle} style={[styles.cancel, disabled && styles.disabled]}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  trigger: { minHeight: 58, borderRadius: 14, borderWidth: 2, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  savedTrigger: { borderColor: '#075985', backgroundColor: '#036CAA' },
  triggerText: { flex: 1, color: '#334155', fontSize: 16, fontWeight: '700' },
  savedText: { color: '#FFFFFF' },
  arrow: { color: '#334155', fontSize: 22 },
  menu: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 14, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  list: { maxHeight: 280 },
  option: { minHeight: 48, justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  optionText: { fontSize: 16, color: '#334155' },
  cancel: { minHeight: 48, alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: '#EFF6FF' },
  cancelText: { color: '#075985', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
