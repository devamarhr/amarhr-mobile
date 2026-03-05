import { AppText } from '@/components/app-text';
import { AppButton } from '@/components/app-button';
import { AppTextField } from '@/components/app-text-field';
import { AppSelect, SelectOption } from '@/components/app-select';
import { useAuthStore, type ProfileFormData } from '@/store/auth-store';
import React, { useState, useRef } from 'react';
import { View, ScrollView, Image } from 'react-native';
import Animated, { SlideInRight, SlideInLeft } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { HugeiconsIcon } from "@hugeicons/react-native";
import {
  ArrowLeft01Icon,
  MinusSignIcon,
  PlusSignIcon
} from "@hugeicons-pro/core-stroke-standard";
import { cn, Label } from 'heroui-native';
import { withUniwind } from "uniwind";
import { AppDatePicker } from "@/components/app-date-picker";
import { KeyboardAvoidingView, KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { AppHeader } from "@/components/app-header";

const StyledSafeAreaView = withUniwind(SafeAreaView);

const nationalityOptions: SelectOption[] = [
  { value: 'mongolia', label: 'Монгол' },
  { value: 'china', label: 'Хятад' },
  { value: 'russia', label: 'Орос' },
  { value: 'korea', label: 'Солонгос' },
  { value: 'japan', label: 'Япон' },
  { value: 'usa', label: 'АНУ' },
  { value: 'other', label: 'Бусад' },
];

const relationshipOptions: SelectOption[] = [
  { value: 'parent', label: 'Эцэг эх' },
  { value: 'spouse', label: 'Эхнэр/нөхөр' },
  { value: 'sibling', label: 'Ах/эгч/дүү' },
  { value: 'child', label: 'Хүүхэд' },
  { value: 'friend', label: 'Найз' },
  { value: 'other', label: 'Бусад' },
];

const cityOptions: SelectOption[] = [
  { value: 'ulaanbaatar', label: 'Улаанбаатар' },
  { value: 'darkhan', label: 'Дархан' },
  { value: 'erdenet', label: 'Эрдэнэт' },
  { value: 'choibalsan', label: 'Чойбалсан' },
  { value: 'other', label: 'Бусад' },
];

const districtOptions: SelectOption[] = [
  { value: 'bgd', label: 'Баянгол' },
  { value: 'bzd', label: 'Баянзүрх' },
  { value: 'shd', label: 'Сонгинохайрхан' },
  { value: 'chd', label: 'Чингэлтэй' },
  { value: 'hud', label: 'Хан-Уул' },
  { value: 'sud', label: 'Сүхбаатар' },
  { value: 'other', label: 'Бусад' },
];

const bankOptions: SelectOption[] = [
  { value: 'khan', label: 'Хаан банк' },
  { value: 'tdb', label: 'Худалдаа хөгжлийн банк' },
  { value: 'golomt', label: 'Голомт банк' },
  { value: 'state', label: 'Төрийн банк' },
  { value: 'xac', label: 'Хас банк' },
  { value: 'capitron', label: 'Капитрон банк' },
  { value: 'other', label: 'Бусад' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const prevPageRef = useRef(0);
  const [currentPage, setCurrentPage] = useState(0);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasCompletedOnboarding = useAuthStore((state) => state.hasCompletedOnboarding);
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);
  const phoneNumber = useAuthStore((state) => state.phoneNumber);
  const companyName = useAuthStore((state) => state.companyName);

  const [isLoading, setIsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Function that returns array of page components
  const getPages = () => {
    const Page1 = () => (
      <View className="gap-6">
        <Controller
          control={control}
          name="lastName"
          rules={{ required: 'Овог оруулна уу' }}
          render={({ field: { onChange, onBlur, value } }) => (
            <AppTextField
              label="Овог"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              errorMessage={errors.lastName?.message}
              isInvalid={!!errors.lastName}
              isRequired
            />
          )}
        />
        <Controller
          control={control}
          name="firstName"
          rules={{ required: 'Нэр оруулна уу' }}
          render={({ field: { onChange, onBlur, value } }) => (
            <AppTextField
              label="Нэр"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              errorMessage={errors.firstName?.message}
              isInvalid={!!errors.firstName}
              isRequired
            />
          )}
        />
        <Controller
          control={control}
          name="gender"
          render={({ field: { onChange, value } }) => (
            <View className="gap-2">
              <Label isRequired>
                <Label.Text className="text-sm font-normal text-darkgray">
                  Хүйс
                </Label.Text>
              </Label>
              <View className="flex-row gap-3">
                <AppButton
                  label="Эмэгтэй"
                  className="flex-1 bg-white border-darkgray/30"
                  labelClassName={cn(
                    "text-darkgray/50",
                    value === 'female' && 'text-black'
                  )}
                  isDisabled={value === 'female'}
                  onPress={() => onChange('female')}
                />
                <AppButton
                  label="Эрэгтэй"
                  className="flex-1 bg-white border-darkgray/30"
                  labelClassName={cn(
                    "text-darkgray/50",
                    value === 'male' && 'text-black'
                  )}
                  isDisabled={value === 'male'}
                  onPress={() => onChange('male')}
                />
              </View>
            </View>
          )}
        />
        <Controller
          control={control}
          name="nationality"
          render={({ field: { onChange, value } }) => {
            const selectedOption = nationalityOptions.find(opt => opt.value === value);
            return (
              <AppSelect
                label="Иргэншил"
                isRequired
                value={selectedOption}
                onValueChange={(option) => onChange(option?.value)}
                options={nationalityOptions}
                errorMessage={errors.nationality?.message}
                isInvalid={!!errors.nationality}
              />
            );
          }}
        />
        <Controller
          control={control}
          name="familyName"
          rules={{ required: 'Ургийн овог оруулна уу' }}
          render={({ field: { onChange, onBlur, value } }) => (
            <AppTextField
              label="Ургийн овог"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              errorMessage={errors.familyName?.message}
              isInvalid={!!errors.familyName}
              isRequired
            />
          )}
        />
      </View>
    );

    const Page2 = () => (
      <View className="gap-6">
        <Controller
          control={control}
          name="registerNumber"
          rules={{ required: 'Регистрийн дугаар оруулна уу' }}
          render={({ field: { onChange, onBlur, value } }) => (
            <AppTextField
              label="Регистрийн дугаар"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              maxLength={10}
              isRequired
              errorMessage={errors.registerNumber?.message}
              isInvalid={!!errors.registerNumber}
            />
          )}
        />
        <AppTextField
          label="Утасны дугаар"
          value={phoneNumber ?? ''}
          isDisabled
        />
        <Controller
          control={control}
          name="email"
          rules={{
            required: 'И-мэйл оруулна уу',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'И-мэйл хаяг алдаатай байна'
            }
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <AppTextField
              label="И-мэйл хаяг"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              isRequired
              errorMessage={errors.email?.message}
              isInvalid={!!errors.email}
            />
          )}
        />
        <Controller
          control={control}
          name="emergencyContact"
          rules={{ required: 'Яаралтай үед холбоо барих дугаар оруулна уу' }}
          render={({ field: { onChange, onBlur, value } }) => (
            <AppTextField
              label="Яаралтай үед холбоо барих дугаар"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="phone-pad"
              maxLength={8}
              isRequired
              errorMessage={errors.emergencyContact?.message}
              isInvalid={!!errors.emergencyContact}
            />
          )}
        />
        <Controller
          control={control}
          name="emergencyRelationship"
          rules={{ required: 'Хэн болох оруулна уу' }}
          render={({ field: { onChange, value } }) => {
            const selectedOption = relationshipOptions.find(opt => opt.value === value);
            return (
              <AppSelect
                label="Хэн болох"
                value={selectedOption}
                onValueChange={(option) => onChange(option?.value)}
                options={relationshipOptions}
                placeholder="Сонгох"
                errorMessage={errors.emergencyRelationship?.message}
                isInvalid={!!errors.emergencyRelationship}
                isRequired
              />
            );
          }}
        />
      </View>
    );

    const Page3 = () => (
      <View className="gap-6">
        <Controller
          control={control}
          name="city"
          rules={{ required: 'Хот/аймаг сонгоно уу' }}
          render={({ field: { onChange, value } }) => {
            const selectedOption = cityOptions.find(opt => opt.value === value);
            return (
              <AppSelect
                label="Оршин суугаа Хот/аймаг"
                value={selectedOption}
                onValueChange={(option) => onChange(option?.value)}
                options={cityOptions}
                placeholder="Сонгох"
                isRequired
                errorMessage={errors.city?.message}
                isInvalid={!!errors.city}
              />
            );
          }}
        />
        <Controller
          control={control}
          name="district"
          rules={{ required: 'Дүүрэг/сум сонгоно уу' }}
          render={({ field: { onChange, value } }) => {
            const selectedOption = districtOptions.find(opt => opt.value === value);
            return (
              <AppSelect
                label="Дүүрэг/сум"
                value={selectedOption}
                onValueChange={(option) => onChange(option?.value)}
                options={districtOptions}
                placeholder="Сонгох"
                isRequired
                errorMessage={errors.district?.message}
                isInvalid={!!errors.district}
              />
            );
          }}
        />
        <Controller
          control={control}
          name="address"
          rules={{ required: 'Хаяг оруулна уу' }}
          render={({ field: { onChange, onBlur, value } }) => (
            <AppTextField
              label="Хороо, гудамж, байр, тоот"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              isTextArea
              placeholder="Хаягаа оруулна уу"
              multiline
              numberOfLines={4}
              isRequired
              errorMessage={errors.address?.message}
              isInvalid={!!errors.address}
            />
          )}
        />
      </View>
    );

    const Page4 = () => {
      const addChild = () => {
        append({ gender: 'girl', birthDate: '' });
      };

      const removeChild = () => {
        if (fields.length > 0) {
          remove(fields.length - 1);
        }
      };

      return (
        <View className="flex-1 gap-6">
          <View className="gap-2">
            <Label isRequired>
              <Label.Text className="text-sm font-normal text-darkgray">
                Хүүхэд
              </Label.Text>
            </Label>
            <View className="flex-row items-center justify-center gap-8">
              <AppButton
                className="w-11 h-11 rounded-full bg-white border-darkgray/30"
                isIconOnly
                leftIcon={<HugeiconsIcon icon={MinusSignIcon} color="#222222" size={20} />}
                onPress={removeChild}
                isDisabled={fields.length === 0}
              />
              <AppText className={cn(
                'text-base font-medium text-black',
                fields.length === 0 && 'text-darkgray/20'
              )}>
                {fields.length}
              </AppText>
              <AppButton
                className="w-11 h-11 rounded-full bg-white border-darkgray/30"
                isIconOnly
                leftIcon={<HugeiconsIcon icon={PlusSignIcon} color="#222222" size={20} />}
                onPress={addChild}
              />
            </View>
          </View>

          <View className="flex-1">
          {fields.map((field, index) => (
            <View key={field.id} className="flex-row gap-3 pb-6">
              <View className="flex-1">
                <Controller
                  control={control}
                  name={`children.${index}.gender`}
                  render={({ field: { onChange, value } }) => (
                    <View className="gap-2">
                      <Label isRequired>
                        <Label.Text className="text-sm font-normal text-darkgray">
                          Хүйс
                        </Label.Text>
                      </Label>
                      <View className="flex-row gap-3">
                        <AppButton
                          label="Охин"
                          className="flex-1 bg-white border-darkgray/30 rounded-full"
                          labelClassName={cn(
                            "text-darkgray/50",
                            value === 'girl' && 'text-black'
                          )}
                          isDisabled={value === 'girl'}
                          onPress={() => onChange('girl')}
                        />
                        <AppButton
                          label="Хүү"
                          className="flex-1 bg-white border-darkgray/30 rounded-full"
                          labelClassName={cn(
                            "text-darkgray/50",
                            value === 'boy' && 'text-black'
                          )}
                          isDisabled={value === 'boy'}
                          onPress={() => onChange('boy')}
                        />
                      </View>
                    </View>
                  )}
                />
              </View>
              <View className="flex-1">
                <Controller
                  control={control}
                  name={`children.${index}.birthDate`}
                  rules={{ required: 'Төрсөн огноо оруулна уу' }}
                  render={({ field: { onChange, value } }) => {
                    const dateValue = value ? new Date(value) : undefined;
                    const fieldError = errors.children?.[index]?.birthDate;

                    return (
                      <AppDatePicker
                        label="Төрсөн огноо"
                        mode="date"
                        value={dateValue}
                        onValueChange={(date) => {
                          onChange(date ? date.toISOString() : '');
                        }}
                        placeholder="0000/00/00"
                        isRequired
                        isInvalid={!!fieldError}
                      />
                    );
                  }}
                />
              </View>
            </View>
          ))}
          </View>
        </View>
      );
    };

    const Page5 = () => (
      <View className="gap-6">
        <Controller
          control={control}
          name="salaryAccount"
          rules={{ required: 'Цалингийн данс оруулна уу' }}
          render={({ field: { onChange, onBlur, value } }) => (
            <AppTextField
              label="Цалингийн данс"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Дансны дугаар"
              keyboardType="numeric"
              isRequired
              errorMessage={errors.salaryAccount?.message}
              isInvalid={!!errors.salaryAccount}
            />
          )}
        />
        <Controller
          control={control}
          name="bank"
          rules={{ required: 'Банк оруулна уу' }}
          render={({ field: { onChange, value } }) => {
            const selectedOption = bankOptions.find(opt => opt.value === value);
            return (
              <AppSelect
                label="Банк"
                value={selectedOption}
                onValueChange={(option) => onChange(option?.value)}
                options={bankOptions}
                placeholder="Сонгох"
                isRequired
                errorMessage={errors.bank?.message}
                isInvalid={!!errors.bank}
              />
            );
          }}
        />
      </View>
    );

    const Page6 = () => {
      const handleUploadFromPhone = async () => {
        // Request media library permissions
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
          alert('Зургийн санд хандах эрх хэрэгтэй байна');
          return;
        }

        // Launch image picker
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
          setProfileImage(result.assets[0].uri);
        }
      };

      const handleTakePhoto = async () => {
        // Request camera permissions
        const { status } = await ImagePicker.requestCameraPermissionsAsync();

        if (status !== 'granted') {
          alert('Камер ашиглах эрх хэрэгтэй байна');
          return;
        }

        // Launch camera
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
          setProfileImage(result.assets[0].uri);
        }
      };

      return (
        <View className="gap-6 items-center">
          <View className="gap-2 w-full">
            <Label isRequired>
              <Label.Text className="text-sm font-normal text-darkgray">
                Профайл зураг
              </Label.Text>
            </Label>

            <View className="items-center justify-center mt-4">
              <View className="w-40 h-40 rounded-full bg-darkgray/7 items-center justify-center overflow-hidden">
                {profileImage ? (
                  <Image
                    source={{ uri: profileImage }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : null}
              </View>
            </View>
          </View>

          <View className="flex-row gap-3 w-full mt-4">
            <AppButton
              label="Утаснаас оруулах"
              className="flex-1 bg-white border-darkgray/30 rounded-full"
              labelClassName="text-black"
              onPress={handleUploadFromPhone}
            />
            <AppButton
              label="Шинээр зураг авах"
              className="flex-1 bg-white border-darkgray/30 rounded-full"
              labelClassName="text-black"
              onPress={handleTakePhoto}
            />
          </View>
        </View>
      );
    };

    return [Page1, Page2, Page3, Page4, Page5, Page6];
  };

  const pages = getPages();
  const totalPages = pages.length;

  const {
    control,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<ProfileFormData>({
    defaultValues: {
      lastName: '',
      firstName: '',
      gender: 'male',
      nationality: 'mongolia',
      familyName: '',
      registerNumber: '',
      email: '',
      emergencyContact: '',
      emergencyRelationship: '',
      city: 'ulaanbaatar',
      district: '',
      address: '',
      children: [],
      salaryAccount: '',
      bank: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'children',
  });

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  // Redirect to home if already completed onboarding
  if (hasCompletedOnboarding) {
    return <Redirect href="/(auth)/(tabs)" />;
  }

  const handleComplete = async (data: ProfileFormData) => {
    setIsLoading(true);

    console.log(JSON.stringify(data))

    try {
      // Simulate API call (replace with actual API later)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Save to store
      completeOnboarding(data);

      // Navigate to home
      router.replace('/(auth)/(tabs)');
    } catch (error) {
      console.error('Onboarding error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = async () => {
    // Define which fields to validate for each page
    const pageFields: Record<number, (keyof ProfileFormData)[]> = {
      0: ['lastName', 'firstName', 'gender', 'nationality', 'familyName'],
      1: ['registerNumber', 'email', 'emergencyContact', 'emergencyRelationship'],
      2: ['city', 'district', 'address'],
      3: ['children'],
      4: ['salaryAccount', 'bank'],
      5: [], // Page 6 (profile image) is optional
    };

    // Validate current page fields
    const fieldsToValidate = pageFields[currentPage];
    if (fieldsToValidate && fieldsToValidate.length > 0) {
      const isValid = await trigger(fieldsToValidate);
      if (!isValid) {
        return; // Don't proceed if validation fails
      }
    }

    // Move to next page if validation passed
    if (currentPage < totalPages - 1) {
      prevPageRef.current = currentPage;
      setCurrentPage(currentPage + 1);
    }
  };

  const handleBack = () => {
    if (currentPage > 0) {
      prevPageRef.current = currentPage;
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1 px-4">
        <AppHeader title={companyName ?? ''} />

        <KeyboardAwareScrollView
          style={{flex:1}}
          showsVerticalScrollIndicator={false}
          bottomOffset={20}
        >
          <Animated.View
            key={currentPage}
            entering={currentPage >= prevPageRef.current ? SlideInRight.duration(300) : SlideInLeft.duration(300)}
            style={{ flex: 1 }}
          >
            {(() => {
              const PageComponent = pages[currentPage];
              return <PageComponent />;
            })()}
          </Animated.View>
        </KeyboardAwareScrollView>

        <View className="flex-row justify-between gap-3 pt-4">
          {currentPage > 0 ? (
            <AppButton
              className="rounded border-darkgray/60 w-11 h-11 p-0"
              isIconOnly
              leftIcon={
                <HugeiconsIcon icon={ArrowLeft01Icon} color="#222222" size={24} />
              }
              onPress={handleBack}
            />
          ) : (
            <View className="w-11 h-11" />
          )}
          <View className="flex-row justify-center items-center gap-1 mb-4 pt-4">
            {Array.from({ length: totalPages }).map((_, index) => (
              <View
                key={index}
                className={cn(
                  'w-3 h-1 rounded-full',
                  index === currentPage
                    ? 'bg-blue'
                    : 'bg-darkgray/15'
                )}
              />
            ))}
          </View>
          <AppButton
            label="Үргэлжлүүл"
            className="flex-1 rounded border-darkgray/60"
            onPress={currentPage === totalPages - 1 ? handleSubmit(handleComplete) : handleNext}
            isLoading={isLoading}
          />
        </View>
      </View>
    </StyledSafeAreaView>
  );
}