import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { EventCategory } from './types';

type Icon = ComponentProps<typeof Ionicons>['name'];

/** Color and icon for each event category, used for cards, date tiles and the event hero. */
export const EVENT_STYLE: Record<EventCategory, { label: string; icon: Icon; colors: [string, string]; solid: string; soft: string }> = {
  networking: { label: 'Networking', icon: 'people', colors: ['#7A55EA', '#4A2AA8'], solid: '#5B35C9', soft: '#EFEBFB' },
  career: { label: 'Career', icon: 'briefcase', colors: ['#EC5FA4', '#B0306F'], solid: '#C23A82', soft: '#FCEAF3' },
  hackathon: { label: 'Hackathon', icon: 'code-slash', colors: ['#1FB5A4', '#0B6E64'], solid: '#0E8A7E', soft: '#E3F5F2' },
};
