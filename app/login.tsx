import { AppButton } from '@/components/app-button';
import { AppInputOTPSlot } from '@/components/app-input-otp-slot';
import { AppText } from '@/components/app-text';
import { AppTextField } from '@/components/app-text-field';
import { AppToast } from '@/components/app-toast';
import { api } from "@/config/api";
import { ProfileData, useAuthStore } from '@/store/auth-store';
import { Alert01Icon, SmartPhone01Icon } from "@hugeicons-pro/core-stroke-standard";
import { AppIcon } from "@/components/app-icon";
import { Image } from "expo-image";
import { Redirect, useRouter } from 'expo-router';
import { FieldError, InputOTP, useToast } from 'heroui-native';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { SafeAreaView } from 'react-native-safe-area-context';
import { withUniwind } from "uniwind";

const StyledImage = withUniwind(Image);
const StyledSafeAreaView = withUniwind(SafeAreaView);

type PhoneFormData = {
  phone: string;
};

const RESEND_TIME = 90;

export default function LoginScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasCompletedOnboarding = useAuthStore((state) => state.hasCompletedOnboarding);
  const setToken = useAuthStore((state) => state.setToken);
  const setProfileData = useAuthStore((state) => state.setProfileData);

  const { toast } = useToast();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(RESEND_TIME);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PhoneFormData>({
    defaultValues: {
      phone: '',
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
    setPhone(data.phone);

    try {
      const res = await api({path: '/send-otp', method: 'POST', data: {phone: data.phone}, auth: false})
      if(res.status === 200){
        setStep('otp');
      }else{
        toast.show({
          component: (props) => (
            <AppToast
              {...props}
              variant="danger"
              // title="Алдаа"
              description={res.message}
              icon={<AppIcon icon={Alert01Icon} color="#BC1818" />}
            />
          ),
        });
      }
    } catch (e) {
      console.log(e);
      setError('Алдаа гарлаа. Дахин оролдоно уу.');
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
      const res = await api<ProfileData & {token: string|null}>({path: '/verify-otp', method: 'POST', auth: false, data: {phone: phone, code: otp}})
      if(res.status === 200){
        const token = res.data['token']
        if(token === null){
          toast.show({
            component: (props) => (
              <AppToast
                {...props}
                variant="danger"
                // title="Алдаа"
                description="Нэвтрэхэд алдаа гарлаа"
                icon={<AppIcon icon={Alert01Icon} color="#BC1818" />}
              />
            ),
          });
        }else{
          setProfileData(res.data);
          setToken(token, phone);
        }
      }else{
        toast.show({
          component: (props) => (
            <AppToast
              {...props}
              variant="danger"
              // title="Алдаа"
              description={res.message}
              icon={<AppIcon icon={Alert01Icon} color="#BC1818" />}
            />
          ),
        });
      }
    } catch {
      setError('Алдаа гарлаа. Дахин оролдоно уу.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setIsResending(true);
    setError('');
    setResendTimer(RESEND_TIME); // Reset timer
    setOtp('');

    try {
      const res = await api({path: '/send-otp', method: 'POST', data: {phone: phone}, auth: false})
      if(res.status !== 200){
        toast.show({
          component: (props) => (
            <AppToast
              {...props}
              variant="danger"
              // title="Алдаа"
              description={res.message}
              icon={<AppIcon icon={Alert01Icon} color="#BC1818" />}
            />
          ),
        });
      }
    } catch {
      setError('Алдаа гарлаа. Дахин оролдоно уу.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <KeyboardAwareScrollView
        style={{flex:1,paddingHorizontal:16}}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={20}
      >
        <View className="mt-20 items-center mb-8">
          <StyledImage
            source={require('../assets/images/logo.png')}
            className="w-60 h-15 object-contain"
          />
        </View>
        {step === 'phone' && (
          <View className="gap-6">
            <Controller
              control={control}
              name="phone"
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
                  isInvalid={!!errors.phone || !!error}
                  errorMessage={errors.phone?.message || error}
                  leftIcon={
                    <AppIcon icon={SmartPhone01Icon} size={22} />
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

        {step === 'otp' && (
          <View className="gap-6">
            <View className="gap-3">
              <AppText className="text-xl text-center">Баталгаажуулах код</AppText>
              <AppText className="text-sm text-muted text-center">
                {phone} дугаарт илгээсэн кодыг оруулна уу
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
                  Код дахин авах
                </AppText>
                {resendTimer > 0 ? (
                  <AppText className="text-sm text-muted">
                    {Math.floor(resendTimer / 60)}:{(resendTimer % 60).toString().padStart(2, '0')}
                  </AppText>
                ) : (
                  <AppButton
                    label="Код илгээх"
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
                  setResendTimer(RESEND_TIME);
                }}
                className="border-gray/30"
              />
            </View>
          </View>
        )}
      </KeyboardAwareScrollView>
    </StyledSafeAreaView>
  );
}