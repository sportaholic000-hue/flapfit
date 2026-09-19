# Based on create-expo-module 57.0.1's local-module scaffold.
# Derive compile-time guards from the actual SDK, not a guessed Swift version.
sdk_version = Gem::Version.new(`xcrun --sdk iphoneos --show-sdk-version`.strip)
age_flags = []
age_flags << 'FLAPFIT_AGE_ELIGIBILITY' if sdk_version >= Gem::Version.new('26.2')
age_flags << 'FLAPFIT_AGE_REGULATORY_FEATURES' if sdk_version >= Gem::Version.new('26.4')
age_flags << 'FLAPFIT_AGE_CONFIRMED' if sdk_version >= Gem::Version.new('26.5')

Pod::Spec.new do |s|
  s.name = 'FlapFitAgeRange'
  s.version = '1.0.0'
  s.summary = 'Apple age range and regional requirement bridge'
  s.description = 'Ephemeral Apple age signals with explicit unsupported and unknown states.'
  s.author = 'Flap Fit'
  s.homepage = 'https://flapfitapp.com'
  s.platforms = { :ios => '16.4' }
  s.source = { git: 'https://github.com/sportaholic000-hue/flapfit.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.weak_frameworks = 'DeclaredAgeRange' if sdk_version >= Gem::Version.new('26.0')
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_ACTIVE_COMPILATION_CONDITIONS' => (['$(inherited)'] + age_flags).join(' ')
  }
  s.source_files = '**/*.{h,m,mm,swift,hpp,cpp}'
end
