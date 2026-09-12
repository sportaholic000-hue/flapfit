export type BirdSkin = {
  id: string;
  name: string;
  body: string;
  belly: string;
  wing: string;
  beak: string;
  eye: string;
};

export const BIRDS: BirdSkin[] = [
  {
    id: 'sunny',
    name: 'Sunny',
    body: '#FFC93C',
    belly: '#FFE8A3',
    wing: '#FF9F1C',
    beak: '#FF6B35',
    eye: '#1F2937',
  },
  {
    id: 'ruby',
    name: 'Ruby',
    body: '#EF4444',
    belly: '#FCA5A5',
    wing: '#B91C1C',
    beak: '#F59E0B',
    eye: '#1F2937',
  },
  {
    id: 'sky',
    name: 'Jay',
    body: '#38BDF8',
    belly: '#BAE6FD',
    wing: '#0284C7',
    beak: '#F59E0B',
    eye: '#1F2937',
  },
  {
    id: 'kiwi',
    name: 'Booger',
    body: '#4ADE80',
    belly: '#BBF7D0',
    wing: '#16A34A',
    beak: '#FB923C',
    eye: '#1F2937',
  },
  {
    id: 'violet',
    name: 'Violet',
    body: '#A78BFA',
    belly: '#DDD6FE',
    wing: '#7C3AED',
    beak: '#FBBF24',
    eye: '#1F2937',
  },
  {
    id: 'onyx',
    name: 'Onyx',
    body: '#111827',
    belly: '#4B5563',
    wing: '#030712',
    beak: '#F59E0B',
    eye: '#020617',
  },
  {
    id: 'pearl',
    name: 'Pearl',
    body: '#F3F4F6',
    belly: '#FFFFFF',
    wing: '#9CA3AF',
    beak: '#F97316',
    eye: '#1F2937',
  },
];

export function getBird(id: string): BirdSkin {
  return BIRDS.find((b) => b.id === id) ?? BIRDS[0];
}
