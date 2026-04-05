import { useCallback } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import type { Message } from '@/lib/types';
import { SafeBlurView } from '@/components/ui/SafeBlurView';

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const inlineRegex = /(\*\*(.+?)\*\*)|(`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(
        <Text key={`b-${match.index}`} style={styles.bold}>
          {match[2]}
        </Text>
      );
    } else if (match[4]) {
      parts.push(
        <Text key={`c-${match.index}`} style={styles.inlineCode}>
          {match[4]}
        </Text>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

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
          style={[styles.text, isUser ? styles.textUser : styles.textAssistant]}>
          {renderInline(text.slice(lastIndex, match.index))}
        </Text>
      );
    }
    parts.push(
      <View key={`cb-${match.index}`} style={styles.codeBlock}>
        <Text selectable style={styles.codeText}>
          {match[1].trim()}
        </Text>
      </View>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(
      <Text
        key={`end-${lastIndex}`}
        style={[styles.text, isUser ? styles.textUser : styles.textAssistant]}>
        {renderInline(text.slice(lastIndex))}
      </Text>
    );
  }

  return parts;
}

interface Props {
  message: Message;
  isStreaming?: boolean;
  onCopy?: () => void;
  onEdit?: () => void;
  onRetry?: () => void;
  onShare?: () => void;
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}>
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

export function MessageBubble({ message, isStreaming, onCopy, onEdit, onRetry, onShare }: Props) {
  const isUser = message.role === 'user';

  const handleLongPress = useCallback(async () => {
    await Clipboard.setStringAsync(message.content);
    Alert.alert('Copied', 'Message copied to clipboard.');
    onCopy?.();
  }, [message.content, onCopy]);

  const bubbleContent = (
    <>
      {isStreaming ? (
        <Text style={[styles.text, isUser ? styles.textUser : styles.textAssistant]}>
          {message.content}
          <Text style={styles.cursor}>|</Text>
        </Text>
      ) : (
        renderContent(message.content, isUser)
      )}
      {!isStreaming ? (
        <View style={styles.metaRow}>
          <Text style={[styles.time, isUser ? styles.timeUser : styles.timeAssistant]}>
            {formatTime(message.created_at)}
          </Text>
          {isUser ? <Text style={styles.checkmark}>✓</Text> : null}
        </View>
      ) : null}
    </>
  );

  return (
    <View style={[styles.row, isUser ? styles.rowRight : styles.rowLeft]}>
      {!isUser ? (
        <View style={styles.avatarAI}>
          <Text style={styles.avatarAIText}>AI</Text>
        </View>
      ) : null}

      <View style={styles.stack}>
        {Platform.OS === 'ios' && !isUser ? (
          <Pressable onLongPress={handleLongPress} delayLongPress={350} style={styles.glassBubbleWrap}>
            <SafeBlurView intensity={25} tint="dark" style={styles.glassBubble}>
              <View style={styles.glassBubbleInner}>{bubbleContent}</View>
            </SafeBlurView>
          </Pressable>
        ) : (
          <Pressable
            onLongPress={handleLongPress}
            delayLongPress={350}
            style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
            {bubbleContent}
          </Pressable>
        )}

        {!isStreaming ? (
          <View style={[styles.actionRow, isUser && styles.actionRowRight]}>
            {onCopy ? <ActionButton label="Copy" onPress={onCopy} /> : null}
            {onEdit ? <ActionButton label="Edit" onPress={onEdit} /> : null}
            {onRetry ? (
              <ActionButton label={isUser ? 'Resend' : 'Regenerate'} onPress={onRetry} />
            ) : null}
            {onShare ? <ActionButton label="Share" onPress={onShare} /> : null}
          </View>
        ) : null}
      </View>
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
  stack: {
    maxWidth: '85%',
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
    maxWidth: '100%',
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
    maxWidth: '100%',
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
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  actionRowRight: {
    justifyContent: 'flex-end',
  },
  actionBtn: {
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },
});
