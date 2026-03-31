import Ionicons from '@expo/vector-icons/Ionicons';

interface Props {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size?: number;
}

export function TabBarIcon({ name, color, size = 22 }: Props) {
  return <Ionicons name={name} size={size} color={color} />;
}
