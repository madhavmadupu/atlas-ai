import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import type { LocalModel } from '@/store/model.store';

interface ModelPickerProps {
  currentDesktopModel: string | null;
  currentLocalModelPath: string | null;
  desktopModels: string[];
  inferenceProvider: 'desktop' | 'local';
  isDesktopConnected: boolean;
  localModels: LocalModel[];
  onClose: () => void;
  onOpenModels: () => void;
  onOpenSettings: () => void;
  onSelectDesktopModel: (model: string) => void;
  onSelectLocalModel: (model: LocalModel) => void;
  onSetProvider: (provider: 'desktop' | 'local') => void;
  visible: boolean;
}

export function ModelPicker({
  currentDesktopModel,
  currentLocalModelPath,
  desktopModels,
  inferenceProvider,
  isDesktopConnected,
  localModels,
  onClose,
  onOpenModels,
  onOpenSettings,
  onSelectDesktopModel,
  onSelectLocalModel,
  onSetProvider,
  visible,
}: ModelPickerProps) {
  const providerCardClass = (provider: 'desktop' | 'local') =>
    provider === inferenceProvider
      ? 'border-indigo-500/40 bg-indigo-500/15'
      : 'border-white/10 bg-white/5';

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-start bg-black/55 px-4 pt-24">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="rounded-[28px] border border-white/10 bg-[#111114] p-4">
          <View className="mb-4 flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-semibold text-white">Choose model</Text>
              <Text className="mt-1 text-xs text-white/40">
                Switch provider and pick the active model for the current chat.
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="h-9 w-9 items-center justify-center rounded-2xl bg-white/5">
              <Ionicons name="close" size={18} color="#ffffff" />
            </Pressable>
          </View>

          <View className="mb-4 flex-row gap-3">
            <Pressable
              onPress={() => onSetProvider('desktop')}
              className={`flex-1 rounded-2xl border px-3 py-3 ${providerCardClass('desktop')}`}>
              <Text className="text-center text-sm font-semibold text-white">Desktop</Text>
              <Text className="mt-1 text-center text-xs text-white/45">
                {isDesktopConnected ? 'Connected' : 'Needs connection'}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onSetProvider('local')}
              className={`flex-1 rounded-2xl border px-3 py-3 ${providerCardClass('local')}`}>
              <Text className="text-center text-sm font-semibold text-white">On-device</Text>
              <Text className="mt-1 text-center text-xs text-white/45">
                {localModels.length} stored model{localModels.length === 1 ? '' : 's'}
              </Text>
            </Pressable>
          </View>

          <ScrollView className="max-h-[360px]" showsVerticalScrollIndicator={false}>
            {inferenceProvider === 'desktop' ? (
              desktopModels.length > 0 ? (
                desktopModels.map((model) => {
                  const active = model === currentDesktopModel;
                  return (
                    <Pressable
                      key={model}
                      onPress={() => {
                        onSelectDesktopModel(model);
                        onClose();
                      }}
                      className={`mb-2 rounded-2xl border px-4 py-3 ${
                        active
                          ? 'border-indigo-500/40 bg-indigo-500/15'
                          : 'border-white/10 bg-white/5'
                      }`}>
                      <Text className="text-sm font-semibold text-white">{model}</Text>
                      <Text className="mt-1 text-xs text-white/40">
                        {active ? 'Active desktop model' : 'Tap to make active'}
                      </Text>
                    </Pressable>
                  );
                })
              ) : (
                <View className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-4">
                  <Text className="text-sm leading-6 text-white/40">
                    No desktop model list is available. Connect to Atlas Desktop, then reopen this
                    menu.
                  </Text>
                </View>
              )
            ) : localModels.length > 0 ? (
              localModels.map((model) => {
                const active = model.path === currentLocalModelPath;
                return (
                  <Pressable
                    key={model.id}
                    onPress={() => {
                      onSelectLocalModel(model);
                      onClose();
                    }}
                    className={`mb-2 rounded-2xl border px-4 py-3 ${
                      active
                        ? 'border-emerald-500/40 bg-emerald-500/15'
                        : 'border-white/10 bg-white/5'
                    }`}>
                    <Text className="text-sm font-semibold text-white">{model.name}</Text>
                    <Text className="mt-1 text-xs text-white/40">
                      {active ? 'Active on-device model' : 'Tap to make active'}
                    </Text>
                  </Pressable>
                );
              })
            ) : (
              <View className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-4">
                <Text className="text-sm leading-6 text-white/40">
                  No local model is available yet. Import a GGUF or download one from the model
                  manager.
                </Text>
              </View>
            )}
          </ScrollView>

          <View className="mt-4 flex-row gap-3">
            <Pressable
              onPress={onOpenModels}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3">
              <Ionicons name="albums-outline" size={16} color="#ffffff" />
              <Text className="text-sm font-semibold text-white">Model manager</Text>
            </Pressable>
            <Pressable
              onPress={onOpenSettings}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3">
              <Ionicons name="settings-outline" size={16} color="#ffffff" />
              <Text className="text-sm font-semibold text-white">Settings</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
