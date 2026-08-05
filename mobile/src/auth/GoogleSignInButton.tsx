import React, { useEffect, useState } from 'react';
import { Pressable, Text, View, ActivityIndicator, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Svg, { Path } from 'react-native-svg';

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

const GoogleGlyph = () => (
  <Svg width={17} height={17} viewBox="0 0 18 18">
    <Path
      fill="#4285F4"
      d="M17.6 9.2c0-.6-.05-1.2-.16-1.7H9v3.3h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z"
    />
    <Path
      fill="#34A853"
      d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.2-3.8H.8v2.3A9 9 0 0 0 9 18z"
    />
    <Path fill="#FBBC05" d="M3.8 10.7a5.4 5.4 0 0 1 0-3.4V5H.8a9 9 0 0 0 0 8l3-2.3z" />
    <Path
      fill="#EA4335"
      d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 .8 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z"
    />
  </Svg>
);

interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => Promise<void>;
  fullWidth?: boolean;
  label?: string;
}

export function GoogleSignInButton({ onCredential, fullWidth, label = 'Google' }: GoogleSignInButtonProps) {
  const configured = Boolean(WEB_CLIENT_ID || ANDROID_CLIENT_ID);
  const [submitting, setSubmitting] = useState(false);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: WEB_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken = response.params?.id_token || response.authentication?.idToken;
    if (!idToken) return;
    setSubmitting(true);
    onCredential(idToken)
      .catch((err) => Alert.alert('Google sign-in failed', err?.message ?? 'Please try again.'))
      .finally(() => setSubmitting(false));
  }, [response, onCredential]);

  const handlePress = () => {
    if (!configured) {
      Alert.alert('Google sign-in unavailable', 'Google client IDs are not configured for this build yet.');
      return;
    }
    promptAsync();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!request || submitting}
      className={`flex-row items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-line bg-white px-4 py-[13px] active:bg-hairline ${
        fullWidth ? 'w-full' : 'flex-1'
      } ${!request || submitting ? 'opacity-60' : ''}`}
    >
      {submitting ? (
        <ActivityIndicator color="#0f1f2d" />
      ) : (
        <View className="flex-row items-center gap-2">
          <GoogleGlyph />
          <Text className="font-heavy text-[13.5px] text-ink">{label}</Text>
        </View>
      )}
    </Pressable>
  );
}
