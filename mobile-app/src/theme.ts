import { Platform } from 'react-native';

/** Connected. palette: one purple accent, a teal secondary (`blue` token) for skills & info, cool violet-tinted neutrals. */
export const C = {
  bg: '#FFFFFF',
  bg2: '#F6F5FA',
  line: '#E1DEEA',
  line2: '#C9C5D6',
  ink: '#1B1726',
  ink2: '#4A4559',
  ink3: '#625D72',
  accent: '#5B35C9',
  accentPressed: '#4A2AA8',
  accentSoft: '#EFEBFB',
  blue: '#13706A',
  blueSoft: '#E5F2F0',
  ok: '#1E7342',
  okSoft: '#E9F4EC',
  warn: '#86580A',
  warnSoft: '#FBF4E4',
  bad: '#B42318',
  badSoft: '#FCEEEC',
  white: '#FFFFFF',
} as const;

export const R = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const T = {
  title: { fontSize: 26, fontWeight: '700' as const, color: C.ink, letterSpacing: -0.3 },
  h2: { fontSize: 19, fontWeight: '700' as const, color: C.ink },
  h3: { fontSize: 16, fontWeight: '600' as const, color: C.ink },
  body: { fontSize: 16, lineHeight: 23, color: C.ink },
  muted: { fontSize: 15, lineHeight: 21, color: C.ink2 },
  small: { fontSize: 13, lineHeight: 18, color: C.ink3 },
  label: { fontSize: 15, fontWeight: '600' as const, color: C.ink },
};

export const AVATAR_COLORS = ['#DCE9E2', '#E3E0EF', '#F0E6D5', '#DCE5F1', '#EEDFDD', '#E4EAD8', '#E8E3D8'];

export const shadow = Platform.select({
  ios: { shadowColor: '#1B1726', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  default: { elevation: 6 },
});
