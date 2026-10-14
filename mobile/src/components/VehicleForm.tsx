import { useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Check, Camera, ShieldCheck, X } from 'lucide-react-native';
import { Card } from './Card';
import { Button } from './Button';
import { TextField } from './TextField';
import { DatePickerField } from './DatePickerField';
import { pickImages, appendImage } from '../lib/media';
import { resolveAssetUrl } from '../api/client';
import { colors } from '../theme/colors';
import type { Vehicle } from '../types';

const SERVICES = [
  { key: 'englishSpeakingDriver', label: 'English speaking driver' },
  { key: 'fuelAndInsurance', label: 'Fuel and insurance included' },
  { key: 'meetAndGreetAtAirport', label: 'Meet and greet at airport' },
  { key: 'allTaxes', label: 'All taxes covered' },
] as const;

type ServiceKey = (typeof SERVICES)[number]['key'];

// Vehicle photo and insurance rules; mirror backend/utils/vehicleInsurance.js.
// A vehicle is listed with exactly five photos, so the minimum and maximum match.
const MIN_PHOTOS = 5;
const MAX_PHOTOS = 5;
const MAX_INSURANCE_PHOTOS = 2;

const PHOTO_RULES = [
  `Upload ${MIN_PHOTOS} clear, good-quality photos.`,
  'Show the outside and the inside.',
  'The number plate must be visible.',
  'No people in the photos.',
];

const toISODate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

interface VehicleFormProps {
  initial?: Vehicle;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (form: FormData) => void;
}

const imageUrl = (img: string | { url?: string }) =>
  typeof img === 'string' ? img : img?.url;

export function VehicleForm({ initial, submitLabel, submitting, onSubmit }: VehicleFormProps) {
  const [model, setModel] = useState(initial?.model ?? '');
  const [registrationNumber, setRegistrationNumber] = useState(initial?.registrationNumber ?? '');
  const [year, setYear] = useState(initial?.year ? String(initial.year) : '');
  const [price, setPrice] = useState(initial?.pricePerDay ? String(initial.pricePerDay) : '');
  const [seats, setSeats] = useState(initial?.seats ? String(initial.seats) : '4');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [services, setServices] = useState<Record<ServiceKey, boolean>>({
    englishSpeakingDriver: initial?.englishSpeakingDriver ?? true,
    fuelAndInsurance: initial?.fuelAndInsurance ?? true,
    meetAndGreetAtAirport: initial?.meetAndGreetAtAirport ?? false,
    allTaxes: initial?.allTaxes ?? false,
  });
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>(
    () => (initial?.images ?? []).map(imageUrl).filter(Boolean) as string[]
  );

  const insurance = initial?.insurance;
  const [insurancePhotos, setInsurancePhotos] = useState<string[]>([]);
  const [insuranceStart, setInsuranceStart] = useState(toISODate(insurance?.startDate));
  const [insuranceEnd, setInsuranceEnd] = useState(toISODate(insurance?.endDate));
  const cardOnFile = (insurance?.cardImages ?? []).filter(Boolean);
  // Missing, expired or rejected insurance cannot carry a save, and neither can
  // the old document once we have asked for it to be verified again.
  const needsNewCard =
    !insurance || ['missing', 'expired', 'rejected'].includes(insurance.state) || Boolean(insurance.requestedAt);

  const toggle = (key: ServiceKey) => setServices((s) => ({ ...s, [key]: !s[key] }));

  const photoCount = existingPhotos.length + newPhotos.length;
  const addPhotos = async () => {
    const room = MAX_PHOTOS - photoCount;
    if (room <= 0) {
      Alert.alert('Photo limit reached', `A vehicle has ${MAX_PHOTOS} photos. Remove one to add another.`);
      return;
    }
    const picked = await pickImages(room);
    if (picked.length) setNewPhotos((p) => [...p, ...picked].slice(0, MAX_PHOTOS - existingPhotos.length));
  };

  const addInsurancePhotos = async () => {
    const picked = await pickImages(MAX_INSURANCE_PHOTOS);
    // Picking again replaces the selection: this is one document, not a gallery.
    if (picked.length) setInsurancePhotos(picked.slice(0, MAX_INSURANCE_PHOTOS));
  };

  const submit = async () => {
    if (!model.trim() || !year.trim() || !price.trim()) {
      Alert.alert('Missing details', 'Model, year and price per day are required.');
      return;
    }
    // Checked against every other listing on the server, which refuses a
    // registration that is already published (one listing per vehicle).
    if (!registrationNumber.trim()) {
      Alert.alert('Registration number needed', 'Enter the vehicle registration number, as on the number plate.');
      return;
    }
    const priceNum = Number(price);
    if (priceNum < 35 || priceNum > 250) {
      Alert.alert('Invalid price', 'Price per day must be between $35 and $250 USD.');
      return;
    }
    // Checked here so the driver hears about a problem before anything uploads;
    // the server applies the same rules.
    if (photoCount < MIN_PHOTOS) {
      Alert.alert('More photos needed', `Add ${MIN_PHOTOS} photos of the vehicle. You have ${photoCount}.`);
      return;
    }
    if (needsNewCard && insurancePhotos.length === 0) {
      Alert.alert('Passenger insurance needed', 'Upload a photo of your current passenger insurance document.');
      return;
    }
    if (!insuranceStart || !insuranceEnd) {
      Alert.alert('Insurance dates needed', 'Enter the start and end date of your insurance cover.');
      return;
    }
    if (insuranceEnd <= insuranceStart) {
      Alert.alert('Check the dates', 'The insurance end date must be after the start date.');
      return;
    }
    if (insuranceEnd < new Date().toISOString().slice(0, 10)) {
      Alert.alert('Insurance expired', 'This insurance cover has already expired. Upload your current passenger insurance document.');
      return;
    }
    try {
      const form = new FormData();
      form.append('model', model.trim());
      form.append('registrationNumber', registrationNumber.trim().toUpperCase());
      form.append('year', String(parseInt(year, 10)));
      form.append('pricePerDay', String(priceNum));
      form.append('seats', String(parseInt(seats, 10) || 1));
      form.append('description', description.trim());
      SERVICES.forEach(({ key }) => form.append(key, services[key] ? 'true' : 'false'));
      // On edit, tell the backend which existing images to keep (removed ones are deleted).
      if (initial) form.append('existingImages', JSON.stringify(existingPhotos));
      for (const uri of newPhotos) {
        await appendImage(form, 'images', uri);
      }
      form.append('insuranceStartDate', insuranceStart);
      form.append('insuranceEndDate', insuranceEnd);
      for (const uri of insurancePhotos) {
        await appendImage(form, 'insuranceImages', uri);
      }
      onSubmit(form);
    } catch (err) {
      Alert.alert('Could not prepare images', err instanceof Error ? err.message : 'Try again.');
    }
  };

  return (
    <>
      <Card className="p-4">
        <View className="flex-row gap-2.5">
          <TextField className="flex-1" label="Model" value={model} onChangeText={setModel} placeholder="Toyota Prius" />
          <TextField className="w-24" label="Year" value={year} onChangeText={setYear} placeholder="2026" keyboardType="number-pad" />
        </View>
        <TextField
          className="mt-3.5"
          label="Registration number"
          value={registrationNumber}
          onChangeText={(text) => setRegistrationNumber(text.toUpperCase())}
          placeholder="CAB-1234"
          autoCapitalize="characters"
          hint="As shown on the number plate. Only you and our team can see it."
        />
        <View className="mt-3.5 flex-row gap-2.5">
          <TextField className="flex-1" label="Price per day (USD)" value={price} onChangeText={setPrice} placeholder="35 to 250" keyboardType="number-pad" />
          <TextField className="w-24" label="Seats" value={seats} onChangeText={setSeats} placeholder="4" keyboardType="number-pad" />
        </View>
        <TextField
          className="mt-3.5"
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Highlight vehicle type, comfort features and ideal trip styles."
          multiline
        />
      </Card>

      <Card className="mt-3 p-4">
        <Text className="font-heavy text-[14px] text-ink">Included services</Text>
        <Text className="mb-3 mt-0.5 font-med text-[12.5px] text-muted-soft">What is bundled with every booking.</Text>
        <View className="gap-2">
          {SERVICES.map(({ key, label }) => {
            const on = services[key];
            return (
              <Pressable
                key={key}
                onPress={() => toggle(key)}
                className={`flex-row items-center gap-2.5 rounded-[11px] border-[1.5px] p-3 ${
                  on ? 'border-brand bg-[#f3fbf6]' : 'border-line bg-white'
                }`}
              >
                <View className={`h-5 w-5 items-center justify-center rounded-md ${on ? 'bg-brand' : 'border-[1.5px] border-[#cbd5db]'}`}>
                  {on ? <Check size={12} color="#fff" strokeWidth={3} /> : null}
                </View>
                <Text className={`font-semi text-[13.5px] ${on ? 'text-ink' : 'text-muted'}`}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* Photos */}
      <Card className="mt-3 p-4">
        <View className="flex-row items-baseline justify-between">
          <Text className="font-heavy text-[14px] text-ink">Vehicle photos</Text>
          <Text className={`font-heavy text-[12px] ${photoCount >= MIN_PHOTOS ? 'text-brand-dark' : 'text-[#a86a15]'}`}>
            {photoCount} of {MIN_PHOTOS}
          </Text>
        </View>
        <View className="mt-2 gap-1 rounded-xl bg-[#f4f9f6] p-3">
          {PHOTO_RULES.map((rule) => (
            <View key={rule} className="flex-row items-start gap-2">
              <Check size={13} color={colors.brand} strokeWidth={3} style={{ marginTop: 2 }} />
              <Text className="flex-1 font-med text-[12.5px] leading-[17px] text-ink-soft">{rule}</Text>
            </View>
          ))}
        </View>
        {existingPhotos.length > 0 ? (
          <View className="mt-2">
            <Text className="mb-2 font-heavy text-[12.5px] text-ink-soft">Current photos ({existingPhotos.length})</Text>
            <View className="flex-row flex-wrap gap-2">
              {existingPhotos.map((url, idx) => (
                <View key={`${url}-${idx}`}>
                  <Image
                    source={{ uri: resolveAssetUrl(url) }}
                    style={{ width: 72, height: 72, borderRadius: 12 }}
                    contentFit="cover"
                  />
                  <Pressable
                    onPress={() => setExistingPhotos((prev) => prev.filter((u) => u !== url))}
                    className="absolute -right-1.5 -top-1.5 h-5 w-5 items-center justify-center rounded-full bg-ink"
                  >
                    <X size={11} color="#fff" strokeWidth={2.5} />
                  </Pressable>
                </View>
              ))}
            </View>
            <Text className="mt-1.5 font-med text-[11.5px] text-muted-soft">
              Remove any you don't want, then add new ones below ({MIN_PHOTOS} in total).
            </Text>
          </View>
        ) : null}
        {newPhotos.length > 0 ? (
          <View className="mt-3">
            <Text className="mb-2 font-heavy text-[12.5px] text-ink-soft">New photos</Text>
            <View className="flex-row flex-wrap gap-2">
              {newPhotos.map((uri, idx) => (
                <View key={uri}>
                <Image source={{ uri }} style={{ width: 72, height: 72, borderRadius: 12 }} contentFit="cover" />
                <Pressable
                  onPress={() => setNewPhotos((p) => p.filter((_, i) => i !== idx))}
                  className="absolute -right-1.5 -top-1.5 h-5 w-5 items-center justify-center rounded-full bg-ink"
                >
                  <X size={11} color="#fff" strokeWidth={2.5} />
                </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : null}
        <Pressable
          onPress={addPhotos}
          className="mt-3 items-center rounded-2xl border-[1.8px] border-dashed border-[#cbd5db] bg-white px-5 py-5"
        >
          <Camera size={28} color={colors.brand} strokeWidth={1.6} />
          <Text className="mt-2 font-heavy text-[13.5px] text-ink">Tap to upload photos</Text>
          <Text className="mt-0.5 font-med text-[12px] text-muted-soft">{MIN_PHOTOS} photos, under 10MB each</Text>
        </Pressable>
      </Card>

      {/* Insurance */}
      <Card className="mt-3 p-4">
        <Text className="font-heavy text-[14px] text-ink">Passenger insurance</Text>
        <Text className="mb-3 mt-0.5 font-med text-[12.5px] leading-[17px] text-muted-soft">
          Upload a clear photo of the document that shows this vehicle's passenger insurance, and enter its cover period. Only you and our team can see it.
        </Text>
        {insurance?.requestedAt ? (
          <View className="mb-3 rounded-xl bg-[#fdf0d8] px-3 py-2">
            <Text className="font-semi text-[12.5px] leading-[17px] text-[#a86a15]">
              We asked you to verify this vehicle's insurance. Upload a new photo of your current passenger insurance document.
              {insurance.requestNote ? ` Note from our team: ${insurance.requestNote}` : ''}
            </Text>
          </View>
        ) : null}
        <View className="flex-row gap-2.5">
          <DatePickerField className="flex-1" label="Cover starts" value={insuranceStart} onChange={setInsuranceStart} />
          <DatePickerField className="flex-1" label="Cover ends" value={insuranceEnd} onChange={setInsuranceEnd} minimumDate={new Date()} />
        </View>
        {insurancePhotos.length === 0 && cardOnFile.length > 0 ? (
          <View className="mt-3">
            <Text className="mb-2 font-heavy text-[12.5px] text-ink-soft">Document on file</Text>
            <View className="flex-row flex-wrap gap-2">
              {cardOnFile.map((url, idx) => (
                <Image key={`${url}-${idx}`} source={{ uri: resolveAssetUrl(url) }} style={{ width: 96, height: 64, borderRadius: 10 }} contentFit="cover" />
              ))}
            </View>
          </View>
        ) : null}
        {insurancePhotos.length > 0 ? (
          <View className="mt-3">
            <Text className="mb-2 font-heavy text-[12.5px] text-ink-soft">New photo{insurancePhotos.length === 1 ? '' : 's'}</Text>
            <View className="flex-row flex-wrap gap-2">
              {insurancePhotos.map((uri, idx) => (
                <View key={uri}>
                  <Image source={{ uri }} style={{ width: 96, height: 64, borderRadius: 10 }} contentFit="cover" />
                  <Pressable
                    onPress={() => setInsurancePhotos((p) => p.filter((_, i) => i !== idx))}
                    className="absolute -right-1.5 -top-1.5 h-5 w-5 items-center justify-center rounded-full bg-ink"
                  >
                    <X size={11} color="#fff" strokeWidth={2.5} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : null}
        <Pressable
          onPress={addInsurancePhotos}
          className="mt-3 h-11 flex-row items-center justify-center gap-2 rounded-[11px] border-[1.5px] border-line bg-white active:bg-[#f4f6f5]"
        >
          <ShieldCheck size={15} color={colors.ink} strokeWidth={2} />
          <Text className="font-heavy text-[13.5px] text-ink">
            {cardOnFile.length > 0 || insurancePhotos.length > 0 ? 'Replace passenger insurance photo' : 'Upload passenger insurance photo'}
          </Text>
        </Pressable>
        <Text className="mt-1.5 font-med text-[12px] text-muted-soft">1 photo required, 2 allowed if the cover runs over two pages.</Text>
      </Card>

      <Button title={submitLabel} variant="cta" className="mt-3.5" loading={submitting} onPress={submit} />
    </>
  );
}
