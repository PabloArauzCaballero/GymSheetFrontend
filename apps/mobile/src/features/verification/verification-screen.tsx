import { verificationCopy, verificationView } from '@gymsheet/domain';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { ErrorState, Skeleton } from '@/components/feedback';
import { ScrollScreen, ScreenHeader } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { radii, spacing } from '@/theme';
import { ChallengePanel } from './challenge-panel';
import { useVerificationFlow } from './use-verification-flow';
import { VerificationStatusBlock } from './verification-status-block';

/** `/verificacion`: consent → gesture with deadline → front camera → preview → upload → in review. */
export function VerificationScreen() {
  const router = useRouter();
  const flow = useVerificationFlow();

  return (
    <ScrollScreen onRefresh={() => void flow.status.refetch()} refreshing={flow.status.isRefetching}>
      <BackLink fallbackHref="/profile" />
      <ScreenHeader detail subtitle={verificationCopy.pageIntro} title={verificationCopy.pageTitle} />
      {renderStep()}
    </ScrollScreen>
  );

  function renderStep() {
    switch (flow.step) {
      case 'loading':
        return <Skeleton height={240} />;
      case 'error':
        return <ErrorState error={flow.status.error} onRetry={() => void flow.status.refetch()} />;
      case 'unavailable':
        return <VerificationStatusBlock view={{ tone: 'neutral', title: verificationCopy.unavailableTitle, body: verificationCopy.unavailableBody }} />;
      case 'expired':
        return (
          <VerificationStatusBlock
            action={<Button icon="refresh" label={verificationCopy.newChallenge} loading={flow.busy === 'start'} onPress={() => void flow.start()} />}
            view={{ tone: 'neutral', title: verificationCopy.expiredTitle, body: verificationCopy.expiredBody }}
          />
        );
      case 'capture':
        return flow.challenge ? (
          <View style={{ gap: spacing.md }}>
            <ChallengePanel gesture={flow.challenge.gesture} seconds={flow.seconds} />
            {flow.shot ? (
              <View style={{ gap: spacing.smd }}>
                <Image
                  accessibilityLabel={verificationCopy.previewAlt}
                  contentFit="cover"
                  source={{ uri: flow.shot.uri }}
                  style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: radii.xl }}
                />
                <Button icon="send" label={verificationCopy.send} loading={flow.busy === 'upload'} onPress={() => void flow.upload()} testID="verification-send" />
                <Button disabled={flow.busy === 'upload'} icon="refresh" label={verificationCopy.retake} onPress={flow.retake} variant="ghost" />
              </View>
            ) : (
              <Button icon="camera-outline" label={verificationCopy.openCamera} loading={flow.busy === 'camera'} onPress={() => void flow.capture()} testID="verification-camera" />
            )}
            <Text tone="muted" variant="footnote">
              {verificationCopy.privacyNote}
            </Text>
          </View>
        ) : null;
      default: {
        const data = flow.status.data;
        if (!data) return null;
        const view = verificationView(data);
        const action = view.canStart ? (
          <Button
            icon="scan-outline"
            label={data.status === 'NONE' ? verificationCopy.start : verificationCopy.retry}
            loading={flow.busy === 'start'}
            onPress={() => void flow.start()}
            testID="verification-start"
          />
        ) : data.status === 'APPROVED' ? (
          <Button label={verificationCopy.goToConocer} onPress={() => router.replace('/comunidad')} variant="secondary" />
        ) : null;
        return <VerificationStatusBlock action={action} view={view} />;
      }
    }
  }
}
