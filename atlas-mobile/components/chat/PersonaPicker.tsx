import { View, Text, Modal, Pressable, FlatList, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { PERSONAS, type Persona } from '@/lib/personas';

interface Props {
  visible: boolean;
  onSelect: (personaId: string) => void;
  onClose: () => void;
}

function PersonaCard({
  persona,
  onPress,
}: {
  persona: Persona;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [cs.card, pressed && cs.cardPressed]}
    >
      <View style={[cs.iconWrap, { backgroundColor: persona.accentBg }]}>
        <Text style={cs.icon}>{persona.icon}</Text>
      </View>
      <View style={cs.cardBody}>
        <Text style={[cs.cardName, { color: persona.accentColor }]}>{persona.name}</Text>
        <Text style={cs.cardDesc} numberOfLines={2}>{persona.description}</Text>
      </View>
      <Text style={cs.chevron}>›</Text>
    </Pressable>
  );
}

export function PersonaPicker({ visible, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();

  const content = (
    <View style={[cs.inner, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      {/* Header */}
      <View style={cs.header}>
        <View>
          <Text style={cs.title}>New Chat</Text>
          <Text style={cs.subtitle}>Choose a specialized assistant</Text>
        </View>
        <Pressable onPress={onClose} style={cs.closeBtn} hitSlop={8}>
          <Text style={cs.closeText}>✕</Text>
        </Pressable>
      </View>

      {/* Persona list */}
      <FlatList
        data={PERSONAS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={cs.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <PersonaCard persona={item} onPress={() => onSelect(item.id)} />
        )}
      />
    </View>
  );

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={cs.backdrop}>
        <Pressable style={cs.backdropTap} onPress={onClose} />
        <View style={cs.sheet}>
          {Platform.OS === 'ios' ? (
            <BlurView intensity={80} tint="dark" style={cs.blur}>
              <View style={cs.blurOverlay}>{content}</View>
            </BlurView>
          ) : (
            <View style={cs.androidSheet}>{content}</View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const cs = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropTap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    maxHeight: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  blur: {
    overflow: 'hidden',
  },
  blurOverlay: {
    backgroundColor: 'rgba(15,15,15,0.6)',
  },
  androidSheet: {
    backgroundColor: '#141414',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inner: {
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.35)',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  cardPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.12)',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
  },
  cardBody: {
    flex: 1,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    lineHeight: 16,
  },
  chevron: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.15)',
    fontWeight: '300',
  },
});
