import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChatShellHeaderProps {
  title: string;
  subtitle?: string;
  modelLabel: string;
  onOpenSidebar: () => void;
  onOpenModelPicker: () => void;
  onOpenSettings: () => void;
}

export function ChatShellHeader({
  title,
  subtitle,
  modelLabel,
  onOpenSidebar,
  onOpenModelPicker,
  onOpenSettings,
}: ChatShellHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="border-white/10 border-b bg-slate-950 px-4 pb-4"
      style={{ paddingTop: Math.max(insets.top, 8) + 8 }}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={onOpenSidebar}
            className="h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <Ionicons name="menu" size={20} color="#ffffff" />
          </Pressable>
          <View>
            <Text className="text-lg font-semibold text-white">{title}</Text>
            {subtitle ? <Text className="mt-0.5 text-xs text-white/40">{subtitle}</Text> : null}
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={onOpenModelPicker}
            className="max-w-[180px] flex-row items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <Ionicons name="sparkles-outline" size={16} color="#a5b4fc" />
            <Text className="flex-1 text-sm font-medium text-white" numberOfLines={1}>
              {modelLabel}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#ffffff" />
          </Pressable>

          <Pressable
            onPress={onOpenSettings}
            className="h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
            <Ionicons name="settings-outline" size={18} color="#ffffff" />
          </Pressable>
          <View className="h-10 w-10 overflow-hidden rounded-2xl border border-white/10">
            <Image
              source={{ uri: 'https://i.pravatar.cc/100?img=33' }}
              className="h-full w-full"
            />
          </View>
        </View>
      </View>
    </View>
  );
}
