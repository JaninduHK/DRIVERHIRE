import { useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Check, Camera, X } from 'lucide-react-native';
import { Card } from './Card';
import { Button } from './Button';
import { TextField } from './TextField';
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

  const toggle = (key: ServiceKey) => setServices((s) => ({ ...s, [key]: !s[key] }));

  const addPhotos = async () => {
    const picked = await pickImages(5 - newPhotos.length);
    if (picked.length) setNewPhotos((p) => [...p, ...picked].slice(0, 5));
  };

  const submit = async () => {
    if (!model.trim() || !year.trim() || !price.trim()) {
      Alert.alert('Missing details', 'Model, year and price per day are required.');
      return;
    }
    const priceNum = Number(price);
    if (priceNum < 35 || priceNum > 250) {
      Alert.alert('Invalid price', 'Price per day must be between $35 and $250 USD.');
      return;
    }
    try {
      const form = new FormData();
      form.append('model', model.trim());
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
        <Text className="font-heavy text-[14px] text-ink">Photos</Text>
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
              Remove any you don't want, then add new ones below (up to 5 total).
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
          <Text className="mt-0.5 font-med text-[12px] text-muted-soft">Up to 5 images, under 10MB each</Text>
        </Pressable>
      </Card>

      <Button title={submitLabel} variant="cta" className="mt-3.5" loading={submitting} onPress={submit} />
    </>
  );
}
