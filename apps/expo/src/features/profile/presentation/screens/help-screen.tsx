import { useTranslation } from '@lib/i18n';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Button, GradientBackground, Typography } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { colors, iconSize } from '@/constants/tokens';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSendHelpEmail } from '../hooks/use-help';
import { HELP_TEST_IDS } from '../profile.copy';

export function HelpScreen() {
  const { t } = useTranslation('profile');
  const router = useRouter();
  const colorScheme = (useColorScheme() ?? 'light') as keyof typeof colors;

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const sendHelp = useSendHelpEmail();

  async function handleSend() {
    if (subject.trim().length < 3) {
      Alert.alert(t('error'), t('helpSubjectTooShort'));
      return;
    }
    if (body.trim().length < 10) {
      Alert.alert(t('error'), t('helpBodyTooShort'));
      return;
    }
    try {
      await sendHelp.mutateAsync({ subject: subject.trim(), body: body.trim() });
    } catch (_err) {
      Alert.alert(t('error'), t('helpSendFailed'));
    }
  }

  if (sendHelp.isSuccess) {
    return (
      <GradientBackground
        className="items-center justify-center gap-lg px-xl"
        headerClearance="none"
        testID={HELP_TEST_IDS.successView}
      >
        <View className="items-center justify-center rounded-full bg-white/10 p-xl">
          <Icon
            name="checkmark.circle.fill"
            size={iconSize.lg}
            color={colors[colorScheme].primary}
          />
        </View>
        <View className="items-center gap-sm">
          <Typography variant="h2" className="text-center">
            {t('helpSentTitle')}
          </Typography>
          <Typography variant="body" className="text-center text-text-secondary">
            {t('helpSentMessage')}
          </Typography>
        </View>
        <Button
          variant="primary"
          size="auth"
          fullWidth
          onPress={() => router.back()}
          textClassName="font-body-bold"
          testID={HELP_TEST_IDS.doneButton}
        >
          {t('helpDone')}
        </Button>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground headerClearance="none">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        testID={HELP_TEST_IDS.screen}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-lg px-lg py-lg w-full self-center md:max-w-reading"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-md">
            <Input
              label={t('helpSubject')}
              variant="outlinedDark"
              value={subject}
              onChangeText={setSubject}
              autoCapitalize="sentences"
              autoFocus
              returnKeyType="next"
              maxLength={200}
              testID={HELP_TEST_IDS.subjectInput}
            />

            <Input
              label={t('helpBody')}
              variant="outlinedDark"
              size="multiline"
              testID={HELP_TEST_IDS.bodyInput}
              value={body}
              onChangeText={setBody}
              multiline
              numberOfLines={8}
              maxLength={4000}
              autoCapitalize="sentences"
              returnKeyType="default"
              textAlignVertical="top"
              className="min-h-40"
            />
          </View>

          <Button
            variant="primary"
            size="auth"
            fullWidth
            onPress={handleSend}
            loading={sendHelp.isPending}
            textClassName="font-body-bold"
            testID={HELP_TEST_IDS.sendButton}
          >
            {t('helpSend')}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}
