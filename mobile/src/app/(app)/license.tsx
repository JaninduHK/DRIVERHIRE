import { useState } from 'react';
import { View, Text, Pressable, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, FileText, Check } from 'lucide-react-native';
import { Screen } from '../../components/Screen';
import { GradientHeader } from '../../components/GradientHeader';
import { BodySheet } from '../../components/BodySheet';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { IconButton } from '../../components/IconButton';
import { Chip } from '../../components/Chip';
import { useOverview, qk } from '../../hooks/queries';
import { submitLicense } from '../../api/driver';
import { pickImage, appendImage } from '../../lib/media';
import { resolveAssetUrl } from '../../api/client';
import { formatDate } from '../../lib/format';
import { colors } from '../../theme/colors';
import { LICENSE_TYPES, getLicenseBadge } from '../../constants/driverLicense';
import type { LicenseType } from '../../types';

const STATUS_CHIP: Record<string, { label: string; tone: 'brand' | 'warn' | 'danger' }> = {
  approved: { label: 'VERIFIED', tone: 'brand' },
  pending: { label: 'UNDER REVIEW', tone: 'warn' },
  rejected: { label: 'NOT APPROVED', tone: 'danger' },
};

export default function License() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const overview = useOverview();
  const profile = overview.data?.profile;

  const hasSubmitted = Boolean(profile?.licenseStatus);
  const [editing, setEditing] = useState(false);
  const [selectedType, setSelectedType] = useState<LicenseType | null>(null);
  const [photoUri, setPhotoUri] = useState<string | undefined>();

  const showForm = !hasSubmitted || editing;

  const submit = useMutation({
    mutationFn: (form: FormData) => submitLicense(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.overview });
      setEditing(false);
      setPhotoUri(undefined);
      setSelectedType(null);
      Alert.alert('Submitted', 'Your license was submitted for review.', [
        { text: 'Done', onPress: () => (hasSubmitted ? null : router.back()) },
      ]);
    },
    onError: (err) => Alert.alert('Could not submit', err instanceof Error ? err.message : 'Try again.'),
  });

  const handlePickPhoto = async () => {
    const uri = await pickImage();
    if (uri) setPhotoUri(uri);
  };

  const handleSubmit = async () => {
    const type = selectedType ?? profile?.licenseType;
    if (!type) {
      Alert.alert('Select a license type', 'Choose the license type that matches your qualification.');
      return;
    }
    if (!photoUri && !profile?.licenseImage) {
      Alert.alert('Upload a photo', 'Please upload a photo of your license.');
      return;
    }
    const form = new FormData();
    form.append('licenseType', type);
    if (photoUri) await appendImage(form, 'licenseImage', photoUri);
    submit.mutate(form);
  };

  if (overview.isLoading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.brand} />
        </View>
      </Screen>
    );
  }

  const statusMeta = profile?.licenseStatus ? STATUS_CHIP[profile.licenseStatus] : null;
  const badge = getLicenseBadge(profile?.licenseType);
  const existingPhoto = resolveAssetUrl(profile?.licenseImage);

  return (
    <Screen>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <GradientHeader
          eyebrow="VERIFICATION"
          title="License verification"
          subtitle="Verified drivers and guides get a badge travellers can trust."
          left={
            <IconButton onPress={() => (editing ? setEditing(false) : router.back())}>
              <ChevronLeft size={18} color="#fff" strokeWidth={2} />
            </IconButton>
          }
        />
        <BodySheet>
          {!showForm && profile ? (
            <>
              <Card className="p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="font-heavy text-[14px] text-ink">Your submission</Text>
                  {statusMeta ? <Chip label={statusMeta.label} tone={statusMeta.tone} /> : null}
                </View>

                <View className="mt-3.5 flex-row items-center gap-3">
                  {existingPhoto ? (
                    <Image source={{ uri: existingPhoto }} style={{ width: 72, height: 72, borderRadius: 12 }} contentFit="cover" />
                  ) : (
                    <View className="h-[72px] w-[72px] items-center justify-center rounded-xl bg-hairline">
                      <FileText size={24} color={colors.mutedSoft} strokeWidth={1.6} />
                    </View>
                  )}
                  <View className="flex-1">
                    {badge ? (
                      <View className={`flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1 ${badge.bg}`}>
                        <badge.icon size={13} color={badge.iconColor} strokeWidth={2} />
                        <Text className={`font-heavy text-[11.5px] ${badge.text}`}>{profile.licenseType}</Text>
                      </View>
                    ) : null}
                    {profile.licenseSubmittedAt ? (
                      <Text className="mt-1.5 font-med text-[12px] text-muted-soft">
                        Submitted {formatDate(profile.licenseSubmittedAt)}
                      </Text>
                    ) : null}
                    {profile.licenseStatus === 'approved' && profile.licenseReviewedAt ? (
                      <Text className="mt-0.5 font-med text-[12px] text-muted-soft">
                        Verified {formatDate(profile.licenseReviewedAt)}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {profile.licenseStatus === 'rejected' && profile.licenseAdminNote ? (
                  <View className="mt-3.5 rounded-xl border-[1.5px] border-[#ffd3d9] bg-[#fef4f5] p-3">
                    <Text className="font-heavy text-[12.5px] text-danger">Why it wasn't approved</Text>
                    <Text className="mt-1 font-med text-[12.5px] leading-[18px] text-ink-soft">{profile.licenseAdminNote}</Text>
                  </View>
                ) : null}
              </Card>

              <Button
                title={profile.licenseStatus === 'rejected' ? 'Resubmit' : 'Update submission'}
                variant="secondary"
                className="mt-3.5"
                onPress={() => {
                  setSelectedType(profile.licenseType ?? null);
                  setEditing(true);
                }}
              />
            </>
          ) : (
            <>
              <Card className="p-4">
                <Text className="font-heavy text-[14px] text-ink">License type</Text>
                <Text className="mt-0.5 font-med text-[12px] text-muted-soft">Choose the license that matches your qualification.</Text>
                <View className="mt-3 gap-2.5">
                  {LICENSE_TYPES.map((type) => {
                    const meta = getLicenseBadge(type)!;
                    const active = (selectedType ?? profile?.licenseType) === type;
                    return (
                      <Pressable
                        key={type}
                        onPress={() => setSelectedType(type)}
                        className={`flex-row items-center gap-3 rounded-xl border-[1.5px] p-3 ${active ? 'border-brand bg-brand-tint' : 'border-line bg-white'}`}
                      >
                        <View className={`h-9 w-9 items-center justify-center rounded-full ${meta.bg}`}>
                          <meta.icon size={17} color={meta.iconColor} strokeWidth={2} />
                        </View>
                        <View className="flex-1">
                          <Text className="font-heavy text-[13.5px] text-ink">{type}</Text>
                          <Text className="mt-0.5 font-med text-[11.5px] leading-4 text-muted-soft">{meta.description}</Text>
                        </View>
                        {active ? (
                          <View className="h-5 w-5 items-center justify-center rounded-full bg-brand">
                            <Check size={11} color="#fff" strokeWidth={3} />
                          </View>
                        ) : (
                          <View className="h-5 w-5 rounded-full border-2 border-line" />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </Card>

              <Card className="mt-3 p-4">
                <Text className="font-heavy text-[14px] text-ink">License photo</Text>
                <Text className="mt-0.5 font-med text-[12px] text-muted-soft">A clear photo of your license or ID card.</Text>
                <Pressable onPress={handlePickPhoto} className="mt-3">
                  {photoUri || existingPhoto ? (
                    <Image
                      source={{ uri: photoUri || existingPhoto }}
                      style={{ width: '100%', height: 160, borderRadius: 14 }}
                      contentFit="cover"
                    />
                  ) : (
                    <View className="h-[160px] items-center justify-center rounded-2xl border-[1.5px] border-dashed border-line bg-hairline">
                      <FileText size={26} color={colors.mutedSoft} strokeWidth={1.6} />
                      <Text className="mt-2 font-heavy text-[12.5px] text-muted">Tap to upload a photo</Text>
                    </View>
                  )}
                </Pressable>
                <Pressable onPress={handlePickPhoto} className="mt-2.5 self-start rounded-lg border-[1.5px] border-line px-3 py-1.5">
                  <Text className="font-heavy text-[12px] text-ink">{photoUri || existingPhoto ? 'Change photo' : 'Upload'}</Text>
                </Pressable>
              </Card>

              <Button
                title={hasSubmitted ? 'Save and resubmit' : 'Submit for review'}
                variant="cta"
                className="mt-3.5"
                loading={submit.isPending}
                onPress={handleSubmit}
              />
              {hasSubmitted ? (
                <Button title="Cancel" variant="ghost" className="mt-1" onPress={() => setEditing(false)} />
              ) : null}
            </>
          )}
        </BodySheet>
      </KeyboardAvoidingView>
    </Screen>
  );
}
