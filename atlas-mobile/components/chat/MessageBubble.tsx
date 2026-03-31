import { View, Text, Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import type { Message } from '@/lib/types';

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

interface Props {
  message: Message;
  isStreaming?: boolean;
}

export function MessageBubble({ message, isStreaming }: Props) {
  const isUser = message.role === 'user';

  const bubbleContent = (
    <>
      <Text
        style={[styles.text, isUser ? styles.textUser : styles.textAssistant]}
        selectable={!isStreaming}
      >
        {message.content}
        {isStreaming ? '▎' : ''}
      </Text>
      {!isStreaming && (
        <Text style={[styles.time, isUser ? styles.timeUser : styles.timeAssistant]}>
          {formatTime(message.created_at)}
        </Text>
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
        <View style={styles.glassBubbleWrap}>
          <BlurView intensity={25} tint="dark" style={styles.glassBubble}>
            <View style={styles.glassBubbleInner}>{bubbleContent}</View>
          </BlurView>
        </View>
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
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        {bubbleContent}
      </View>
      {isUser && (
        <View style={styles.avatarUser}>
          <Text style={styles.avatarUserText}>You</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  rowLeft: {
    justifyContent: 'flex-start',
  },
  rowRight: {
    justifyContent: 'flex-end',
  },
  avatarAI: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(99,102,241,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  avatarAIText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(129,140,248,0.8)',
  },
  avatarUser: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(99,102,241,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    marginTop: 2,
  },
  avatarUserText: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(165,180,252,0.8)',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bubbleUser: {
    backgroundColor: 'rgba(79,70,229,1)',
    borderTopRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderTopLeftRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  glassBubbleWrap: {
    maxWidth: '78%',
    borderRadius: 20,
    borderTopLeftRadius: 4,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  glassBubble: {
    overflow: 'hidden',
  },
  glassBubbleInner: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  textUser: {
    color: '#ffffff',
  },
  textAssistant: {
    color: 'rgba(255,255,255,0.9)',
  },
  time: {
    marginTop: 6,
    fontSize: 10,
  },
  timeUser: {
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'right',
  },
  timeAssistant: {
    color: 'rgba(255,255,255,0.2)',
  },
});
