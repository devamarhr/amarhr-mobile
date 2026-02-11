import { AppText } from '@/components/app-text';
import { AppButton } from '@/components/app-button';
import { AppTextField } from '@/components/app-text-field';
import { useAuthStore } from '@/store/auth-store';
import { Label, InputOTP, FieldError, TextField, Input, Description } from 'heroui-native';
import { AppInputOTPSlot } from '@/components/app-input-otp-slot';
import { useState, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Lock, LockIcon, PhoneArrowDownIcon, SmartPhone01Icon } from "@hugeicons-pro/core-stroke-standard";
import { Image } from "expo-image";
import { withUniwind } from "uniwind";

const StyledImage = withUniwind(Image);

type PhoneFormData = {
  phoneNumber: string;
};

export default function LoginScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasCompletedOnboarding = useAuthStore((state) => state.hasCompletedOnboarding);
  const setToken = useAuthStore((state) => state.setToken);

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(90);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PhoneFormData>({
    defaultValues: {
      phoneNumber: '',
    },
  });

  // Countdown timer for resend OTP
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (step === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, resendTimer]);

  // Redirect based on authentication and onboarding status
  if (isAuthenticated) {
    if (!hasCompletedOnboarding) {
      return <Redirect href="/onboarding" />;
    }
    return <Redirect href="/(auth)/(tabs)" />;
  }

  // Request OTP
  const handleRequestOtp = async (data: PhoneFormData) => {
    setIsLoading(true);
    setError('');
    setPhoneNumber(data.phoneNumber);

    try {
      // TODO: Replace with your actual API call
      // const response = await fetch('YOUR_API/request-otp', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ phoneNumber: data.phoneNumber }),
      // });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Move to OTP step
      setStep('otp');
    } catch {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP and login
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setError('Баталгаажуулах код буруу байна');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // TODO: Replace with your actual API call
      // const response = await fetch('YOUR_API/verify-otp', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ phoneNumber, otp }),
      // });
      // const data = await response.json();

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mock token - replace with actual token from API
      const mockToken = 'mock_jwt_token_' + Date.now();

      // Save to store
      setToken(mockToken, phoneNumber);

      // Navigate based on onboarding status
      if (!hasCompletedOnboarding) {
        router.replace('/onboarding');
      } else {
        router.replace('/(auth)/(tabs)');
      }
    } catch {
      setError('Invalid code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setIsResending(true);
    setError('');
    setResendTimer(90); // Reset timer

    try {
      // TODO: Replace with your actual API call
      // const response = await fetch('YOUR_API/request-otp', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ phoneNumber }),
      // });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView className="px-4 bg-background">
        <View className="mt-20 items-center mb-8">
          <StyledImage
            source={require('../assets/images/logo.png')}
            className="w-60 h-15 object-contain"
          />
        </View>
        {/* Phone Number Step */}
        {step === 'phone' && (
          <View className="gap-6">
            <Controller
              control={control}
              name="phoneNumber"
              rules={{
                required: 'Утасны дугаар оруулна уу',
                pattern: {
                  value: /^\d{8}$/,
                  message: 'Утасны дугаар буруу байна',
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <AppTextField
                  label="Утасны дугаар"
                  placeholder="99123456"
                  keyboardType="phone-pad"
                  value={value}
                  onChangeText={onChange}
                  isInvalid={!!errors.phoneNumber || !!error}
                  errorMessage={errors.phoneNumber?.message || error}
                  leftIcon={
                    <HugeiconsIcon icon={SmartPhone01Icon} size={22} />
                  }
                />
              )}
            />

            <AppButton
              label="Нэвтрэх"
              onPress={handleSubmit(handleRequestOtp)}
              isLoading={isLoading}
            />
          </View>
        )}

        {/* OTP Step */}
        {step === 'otp' && (
          <View className="gap-6">
            <View className="gap-3">
              <AppText className="text-xl text-center">Баталгаажуулах код</AppText>
              <AppText className="text-sm text-muted text-center">
                {phoneNumber} дугаарт илгээсэн кодыг оруулна уу
              </AppText>
            </View>

            <View className="gap-3 items-center">
              <InputOTP
                value={otp}
                onChange={(value) => {
                  setOtp(value);
                  setError('');
                }}
                maxLength={6}
                isInvalid={!!error}
              >
                <InputOTP.Group className="gap-2">
                  <AppInputOTPSlot index={0} />
                  <AppInputOTPSlot index={1} />
                  <AppInputOTPSlot index={2} />
                  <AppInputOTPSlot index={3} />
                  <AppInputOTPSlot index={4} />
                  <AppInputOTPSlot index={5} />
                </InputOTP.Group>
              </InputOTP>
              {error && (
                <FieldError isInvalid={!!error}>{error}</FieldError>
              )}
            </View>

            <View className="gap-6">
              <AppButton
                label="Баталгаажуулах"
                onPress={handleVerifyOtp}
                isLoading={isLoading}
                className="bg-lightblue border-darkblue"
                labelClassName="text-darkerblue"
              />

              <View className="flex-row items-center justify-center gap-2">
                <AppText className="text-sm text-muted">
                  Код ирсэнгүй юу?
                </AppText>
                {resendTimer > 0 ? (
                  <AppText className="text-sm text-muted">
                    {Math.floor(resendTimer / 60)}:{(resendTimer % 60).toString().padStart(2, '0')}
                  </AppText>
                ) : (
                  <AppButton
                    label="Дахин илгээх"
                    onPress={handleResendOtp}
                    isLoading={isResending}
                    className="h-auto py-0 border-0 bg-transparent"
                    labelClassName="text-darkerblue text-sm font-semibold"
                  />
                )}
              </View>

              <AppButton
                label="Буцах"
                onPress={() => {
                  setStep('phone');
                  setOtp('');
                  setError('');
                  setResendTimer(90);
                }}
                className="border-gray/30"
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}