import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const CANADIAN_PROVINCES_AND_TERRITORIES = [
  ['AB', 'Alberta'], ['BC', 'British Columbia'], ['MB', 'Manitoba'], ['NB', 'New Brunswick'],
  ['NL', 'Newfoundland and Labrador'], ['NT', 'Northwest Territories'], ['NS', 'Nova Scotia'],
  ['NU', 'Nunavut'], ['ON', 'Ontario'], ['PE', 'Prince Edward Island'], ['QC', 'Quebec'],
  ['SK', 'Saskatchewan'], ['YT', 'Yukon'],
] as const;

export const US_STATES_AND_TERRITORIES = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AS', 'American Samoa'], ['AZ', 'Arizona'], ['AR', 'Arkansas'],
  ['CA', 'California'], ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'],
  ['FL', 'Florida'], ['GA', 'Georgia'], ['GU', 'Guam'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'],
  ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'],
  ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'], ['MS', 'Mississippi'],
  ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'],
  ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'], ['NC', 'North Carolina'], ['ND', 'North Dakota'],
  ['MP', 'Northern Mariana Islands'], ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'], ['PA', 'Pennsylvania'],
  ['PR', 'Puerto Rico'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'],
  ['TX', 'Texas'], ['VI', 'U.S. Virgin Islands'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'],
  ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
] as const;

type Props = {
  region: 'province' | 'state';
  options: readonly (readonly [string, string])[];
  expanded: boolean;
  answered: boolean;
  disabled: boolean;
  onToggle: () => void;
  onSelect: (code: string) => void;
};

/** The exact selection is never retained here. The caller saves only the existing residency flag. */
export function ResidencyDropdown({ region, options, expanded, answered, disabled, onToggle, onSelect }: Props) {
  const label = `${answered ? 'Change' : 'Select'} ${region} or territory`;
  return <View style={styles.root}>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded, disabled }}
      disabled={disabled} onPress={onToggle} style={[styles.trigger, answered && styles.savedTrigger, disabled && styles.disabled]}>
      <Text style={[styles.triggerText, answered && styles.savedText]}>{answered ? 'Answer saved · Change' : label}</Text>
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
