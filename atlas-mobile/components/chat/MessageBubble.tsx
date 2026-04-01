import { useCallback } from 'react';
import { View, Text, Platform, StyleSheet, Pressable, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import Animated from 'react-native-reanimated';
import type { Message } from '@/lib/types';

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Minimal inline markdown: **bold**, `code`, ```code blocks``` */
function renderContent(text: string, isUser: boolean) {
  const parts: React.ReactNode[] = [];
  const codeBlockRegex = /```(?:\w*\n)?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <Text
          key={`pre-${match.index}`}
          style={[styles.text, isUser ? styles.textUser : styles.textAssistant]}
        >
          {renderInline(text.slice(lastIndex, match.index), isUser)}
        </Text>,
      );
    }
    parts.push(
      <View key={`cb-${match.index}`} style={styles.codeBlock}>
        <Text style={styles.codeText} selectable>{match[1].trim()}</Text>
      </View>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <Text
        key={`end-${lastIndex}`}
        style={[styles.text, isUser ? styles.textUser : styles.textAssistant]}
      >
        {renderInline(text.slice(lastIndex), isUser)}
      </Text>,
    );
  }

  return parts;
}

function renderInline(text: string, isUser: boolean): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const inlineRegex = /(\*\*(.+?)\*\*)|(`(.+?)`)/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;

  while ((m = inlineRegex.exec(text)) !== null) {
    if (m.index > lastIdx) {
      parts.push(text.slice(lastIdx, m.index));
    }
    if (m[2]) {
      parts.push(
        <Text key={`b-${m.index}`} style={styles.bold}>{m[2]}</Text>,
      );
    } else if (m[4]) {
      parts.push(
        <Text key={`c-${m.index}`} style={styles.inlineCode}>{m[4]}</Text>,
      );
    }
    lastIdx = m.index + m[0].length;
  }

  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }

  return parts;
}

interface Props {
  message: Message;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === 'user';

  const handleLongPress = useCallback(async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Haptics not available
    }
    Alert.alert(
      'Message',
      undefined,
      [
        {
          text: 'Copy',
          onPress: async () => {
            try {
              await Clipboard.setStringAsync(message.content);
            } catch {
              // Clipboard not available
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }, [message.content]);

  const bubbleContent = (
    <>
      {isStreaming ? (
        <Text
          style={[styles.text, isUser ? styles.textUser : styles.textAssistant]}
        >
          {message.content}
          <Text style={styles.cursor}>|</Text>
        </Text>
      ) : (
        renderContent(message.content, isUser)
      )}
      {!isStreaming && (
        <View style={styles.metaRow}>
          <Text style={[styles.time, isUser ? styles.timeUser : styles.timeAssistant]}>
            {formatTime(message.created_at)}
          </Text>
          {isUser && <Text style={styles.checkmark}>✓</Text>}
        </View>
      )}
    </>
  );

  // Assistant bubble: glass effect on iOS
  if (!isUser && Platform.OS === 'ios') {
    return (
      <View style={[styles.row, styles.rowLeft]}>
        <View style={styles.avatarAI}>
          <Text style={styles.avatarAIText}>AI</Text>
        </View>
        <Pressable onLongPress={handleLongPress} delayLongPress={350} style={styles.glassBubbleWrap}>
          <BlurView intensity={25} tint="dark" style={styles.glassBubble}>
            <View style={styles.glassBubbleInner}>{bubbleContent}</View>
          </BlurView>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.row, isUser ? styles.rowRight : styles.rowLeft]}>
      {!isUser && (
        <View style={styles.avatarAI}>
          <Text style={styles.avatarAIText}>AI</Text>
        </View>
      )}
      <Pressable
        onLongPress={handleLongPress}
        delayLongPress={350}
        style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}
      >
        {bubbleContent}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  rowLeft: {
    justifyContent: 'flex-start',
    paddingRight: 48,
  },
  rowRight: {
    justifyContent: 'flex-end',
    paddingLeft: 48,
  },
  avatarAI: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: 'rgba(99,102,241,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(99,102,241,0.25)',
  },
  avatarAIText: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(129,140,248,0.9)',
    letterSpacing: 0.5,
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: '#4f46e5',
    borderBottomRightRadius: 6,
  },
  bubbleAssistant: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderBottomLeftRadius: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  glassBubbleWrap: {
    maxWidth: '85%',
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  glassBubble: {
    overflow: 'hidden',
  },
  glassBubbleInner: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  textUser: {
    color: '#ffffff',
  },
  textAssistant: {
    color: 'rgba(255,255,255,0.88)',
  },
  bold: {
    fontWeight: '700',
  },
  inlineCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    color: '#a5b4fc',
    backgroundColor: 'rgba(99,102,241,0.15)',
  },
  codeBlock: {
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    lineHeight: 20,
    color: '#e2e8f0',
  },
  cursor: {
    color: 'rgba(129,140,248,0.8)',
    fontWeight: '300',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 4,
  },
  time: {
    fontSize: 10,
  },
  timeUser: {
    color: 'rgba(255,255,255,0.45)',
  },
  timeAssistant: {
    color: 'rgba(255,255,255,0.25)',
  },
  checkmark: {
    fontSize: 10,
    color: 'rgba(165,180,252,0.6)',
  },
});
