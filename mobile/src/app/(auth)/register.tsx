import { useState } from 'react';
import { View, Text, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Clock, Check } from 'lucide-react-native';
import { Screen } from '../../components/Screen';
import { GradientHeader } from '../../components/GradientHeader';
import { BodySheet } from '../../components/BodySheet';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { TextField } from '../../components/TextField';
import { Chip } from '../../components/Chip';
import { IconButton } from '../../components/IconButton';
import { registerDriver } from '../../api/auth';
import { colors } from '../../theme/colors';

const LANGUAGES = ['English', 'Sinhala', 'Tamil', 'German', 'French', 'Russian'];

function ProgressBars({ step }: { step: number }) {
  return (
    <View className="mt-3.5 flex-row gap-1.5">
      {[1, 2, 3].map((i) => (
        <View key={i} className={`h-[5px] flex-1 rounded-full ${i <= step ? 'bg-white' : 'bg-white/30'}`} />
      ))}
    </View>
  );
}

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Step 1
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  // Step 2
  const [years, setYears] = useState('');
  const [bio, setBio] = useState('');
  const [languages, setLanguages] = useState<string[]>(['English']);

  const toggleLang = (lang: string) =>
    setLanguages((prev) => (prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]));

  const validateStep1 = () => {
    if (!name.trim() || !email.trim() || !mobile.trim() || !city.trim() || !password) {
      setError('Please fill in all fields to continue.');
      return false;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return false;
    }
    setError('');
    return true;
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => s - 1);
      setError('');
    } else {
      router.back();
    }
  };

  const handleContinue = () => {
    if (step === 1 && !validateStep1()) return;
    setStep((s) => Math.min(3, s + 1));
  };

  const handleSubmit = async () => {
    setError('');
    setSubmitting(true);
    try {
      await registerDriver({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        contactNumber: `+94 ${mobile.trim()}`.trim(),
        address: city.trim(),
        description: bio.trim() || `Driver based in ${city.trim()}.`,
        experienceYears: Math.max(0, parseInt(years, 10) || 0),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit application.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Screen statusBarStyle="dark" edges={['top', 'bottom']}>
        <View className="flex-1 px-6 pt-10">
          <View className="items-center pt-6">
            <View className="h-[92px] w-[92px] items-center justify-center rounded-[28px] bg-brand-tint">
              <Clock size={42} color={colors.brand} strokeWidth={1.7} />
            </View>
            <Text className="mt-5 font-xheavy text-[24px] text-ink">Application received</Text>
            <Text className="mt-2.5 text-center font-med text-[14.5px] leading-[22px] text-muted">
              Check your inbox to verify your email, then our team reviews your documents within one working
              day. We will notify you here and by email.
            </Text>
          </View>
          <Card className="mt-6 p-4">
            <Text className="font-heavy text-[14px] text-ink">What happens next</Text>
            <View className="mt-3.5 gap-3.5">
              <StepRow done label="Account created" note="Verify your email to activate it" />
              <StepRow label="Verification in progress" note="Usually under 24 hours" active />
              <StepRow label="Profile goes live" note="Then you can start quoting" muted />
            </View>
          </Card>
          <Button
            title="Back to sign in"
            variant="cta"
            className="mt-6"
            onPress={() => router.replace('/(auth)/login')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <GradientHeader
          eyebrow="JOIN AS A DRIVER"
          title={step === 1 ? 'Your details' : step === 2 ? 'Driving & vehicle' : 'Almost done'}
          left={
            <IconButton onPress={handleBack}>
              <ChevronLeft size={18} color="#fff" strokeWidth={2} />
            </IconButton>
          }
          right={
            <View className="rounded-[10px] bg-white/[0.18] px-3 py-2">
              <Text className="font-xheavy text-[12.5px] text-white">Step {step} of 3</Text>
            </View>
          }
        >
          <ProgressBars step={step} />
        </GradientHeader>

        <BodySheet>
          {step === 1 && (
            <>
              <Card className="p-4">
                <TextField label="Full name" value={name} onChangeText={setName} placeholder="Janindu Hansaka" autoCapitalize="words" />
                <TextField className="mt-4" label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
                <TextField className="mt-4" label="Mobile number" value={mobile} onChangeText={setMobile} placeholder="71 234 5678" keyboardType="phone-pad" prefix="+94" />
                <TextField className="mt-4" label="Base city" value={city} onChangeText={setCity} placeholder="Colombo" autoCapitalize="words" />
                <TextField className="mt-4" label="Create password" value={password} onChangeText={setPassword} placeholder="Minimum 8 characters" secure autoCapitalize="none" />
              </Card>
              {error ? <Text className="mt-3 px-1 font-med text-[12.5px] text-danger">{error}</Text> : null}
              <Button title="Continue" variant="cta" className="mt-3.5" onPress={handleContinue} />
              <Text className="mt-3.5 text-center font-med text-[12.5px] leading-5 text-muted-soft">
                By continuing you agree to the driver terms and privacy policy.
              </Text>
            </>
          )}

          {step === 2 && (
            <>
              <Card className="p-4">
                <TextField label="Years driving" value={years} onChangeText={setYears} placeholder="5" keyboardType="number-pad" />
                <Text className="mb-1.5 mt-4 font-heavy text-[12.5px] text-ink-soft">Languages you speak</Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {LANGUAGES.map((lang) => (
                    <Chip key={lang} label={lang} selected={languages.includes(lang)} onPress={() => toggleLang(lang)} />
                  ))}
                </View>
                <TextField
                  className="mt-4"
                  label="Short bio for travellers"
                  value={bio}
                  onChangeText={setBio}
                  placeholder="Tell travellers about your routes, your car and what you enjoy showing people."
                  multiline
                />
              </Card>
              <Button title="Continue" variant="cta" className="mt-3.5" onPress={handleContinue} />
            </>
          )}

          {step === 3 && (
            <>
              <Card className="p-4">
                <Text className="font-heavy text-[14px] text-ink">Documents</Text>
                <Text className="mt-1 font-med text-[12.5px] leading-5 text-muted">
                  After your account is created and email verified, you will be asked to upload your driving
                  licence, national ID and vehicle registration so admin can approve your profile.
                </Text>
                <View className="mt-3 gap-2">
                  <DocRow label="Driving licence" />
                  <DocRow label="National ID" />
                  <DocRow label="Vehicle registration" />
                </View>
              </Card>
              {error ? <Text className="mt-3 px-1 font-med text-[12.5px] text-danger">{error}</Text> : null}
              <Button title="Submit application" variant="cta" className="mt-3.5" loading={submitting} onPress={handleSubmit} />
            </>
          )}
        </BodySheet>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function StepRow({ label, note, done, active, muted }: { label: string; note: string; done?: boolean; active?: boolean; muted?: boolean }) {
  return (
    <View className="flex-row gap-3">
      {done ? (
        <View className="h-[22px] w-[22px] items-center justify-center rounded-full bg-brand">
          <Check size={12} color="#fff" strokeWidth={3} />
        </View>
      ) : (
        <View className={`h-[22px] w-[22px] rounded-full border-2 ${active ? 'border-brand' : 'border-line'}`} />
      )}
      <View className="flex-1">
        <Text className={`font-heavy text-[13.5px] ${muted ? 'text-muted-soft' : 'text-ink'}`}>{label}</Text>
        <Text className="font-med text-[12.5px] text-muted-soft">{note}</Text>
      </View>
    </View>
  );
}

function DocRow({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-3 rounded-xl bg-canvas px-3 py-3">
      <View className="h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-line" />
      <Text className="flex-1 font-semi text-[13.5px] text-ink">{label}</Text>
      <Text className="font-med text-[12px] text-muted-soft">After approval</Text>
    </View>
  );
}
