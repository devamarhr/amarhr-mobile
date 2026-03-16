import { View, ScrollView } from 'react-native';
import { cn, Label, useToast } from 'heroui-native';
import { withUniwind } from "uniwind";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "@/components/app-header";
import { AppText } from "@/components/app-text";
import { AppTextField } from "@/components/app-text-field";
import { AppButton } from "@/components/app-button";
import { AppSelect } from "@/components/app-select";
import { useSelectOptions } from '@/hooks/use-select-options';
import { AppDatePicker } from "@/components/app-date-picker";
import { useAuthStore, type ProfileFormData, ProfileData } from '@/store/auth-store';
import { useRouter } from 'expo-router';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Alert01Icon, CheckmarkCircle02Icon, MinusSignIcon, PlusSignIcon } from "@hugeicons-pro/core-stroke-standard";
import React, { useState } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { api } from "@/config/api";
import { AppToast } from "@/components/app-toast";
import dayjs from "dayjs";

const StyledSafeAreaView = withUniwind(SafeAreaView);

export default function PersonalInfoEditScreen() {
  const router = useRouter();
  const { lastName, firstName, gender, nationality, familyName, phone, registerNumber, email, emergencyContact, emergencyRelation, aimag, soum, street, children, bankAccount, bank } = useAuthStore();
  const setInitialData = useAuthStore((state) => state.setInitialData);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { nationalityOptions, relationshipOptions, addressOptions, bankOptions } = useSelectOptions();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormData>({
    defaultValues: {
      lastName: lastName ?? '',
      firstName: firstName ?? '',
      gender: gender ?? 'male',
      nationality: nationality ?? 'mongolia',
      familyName: familyName ?? '',
      registerNumber: registerNumber ?? '',
      email: email ?? '',
      emergencyContact: emergencyContact ?? '',
      emergencyRelation: emergencyRelation ?? 'parent',
      aimag: aimag ?? 'ulaanbaatar',
      soum: soum ?? '',
      street: street ?? '',
      children: children ?? [],
      bankAccount: bankAccount ?? '',
      bank: bank ?? 'khan',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'children',
  });

  const handleSave = async (data: ProfileFormData) => {
    setIsLoading(true);
    try {
      console.log(JSON.stringify(data));
      const res = await api<ProfileData>({path: '/profile/update', method: "PUT", data});
      if(res.status === 200){
        setInitialData(res.data);
        toast.show({
          component: (props: any) => (
            <AppToast
              {...props}
              variant="success"
              // title="Амжилттай"
              description={res.message}
              icon={<HugeiconsIcon icon={CheckmarkCircle02Icon} color="#18AA0B" />}
            />
          ),
        });
        router.back();
      }else{
        toast.show({
          component: (props: any) => (
            <AppToast
              {...props}
              variant="danger"
              // title="Алдаа"
              description={res.message}
              icon={<HugeiconsIcon icon={Alert01Icon} color="#BC1818" />}
            />
          ),
        });
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1 px-4">
        <AppHeader backTitle="Мэдээлэл засах" showBack />
        <KeyboardAwareScrollView
          style={{flex:1}}
          showsVerticalScrollIndicator={false}
          bottomOffset={20}
        >
          <View className="gap-6 pb-10">
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
                  isRequired
                  errorMessage={errors.lastName?.message}
                  isInvalid={!!errors.lastName}
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
                  isRequired
                  errorMessage={errors.firstName?.message}
                  isInvalid={!!errors.firstName}
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
                  isRequired
                  errorMessage={errors.familyName?.message}
                  isInvalid={!!errors.familyName}
                />
              )}
            />
            <AppTextField
              label="Утасны дугаар"
              value={phone ?? ''}
              isDisabled
            />
            <Controller
              control={control}
              name="email"
              rules={{
                required: 'И-мэйл оруулна уу',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'И-мэйл хаяг алдаатай байна',
                },
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
              name="emergencyRelation"
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
                    isRequired
                    errorMessage={errors.emergencyRelation?.message}
                    isInvalid={!!errors.emergencyRelation}
                  />
                );
              }}
            />
            <Controller
              control={control}
              name="aimag"
              rules={{ required: 'Хот/аймаг сонгоно уу' }}
              render={({ field: { onChange, value } }) => {
                const selectedOption = addressOptions.find(opt => opt.value === value);
                return (
                  <AppSelect
                    label="Оршин суугаа Хот/аймаг"
                    value={selectedOption}
                    onValueChange={(option) => {
                      onChange(option?.value);
                      setValue('soum', '');
                    }}
                    options={addressOptions}
                    placeholder="Сонгох"
                    isRequired
                    errorMessage={errors.aimag?.message}
                    isInvalid={!!errors.aimag}
                  />
                );
              }}
            />
            <Controller
              control={control}
              name="soum"
              rules={{ required: 'Дүүрэг/сум сонгоно уу' }}
              render={({ field: { onChange, value } }) => {
                const selectedAimag = watch('aimag');
                const soumOptions = addressOptions.find(c => c.value === selectedAimag)?.children ?? [];
                const selectedOption = soumOptions.find(opt => opt.value === value);
                return (
                  <AppSelect
                    label="Дүүрэг/сум"
                    value={selectedOption}
                    onValueChange={(option) => onChange(option?.value)}
                    options={soumOptions}
                    placeholder="Сонгох"
                    isRequired
                    errorMessage={errors.soum?.message}
                    isInvalid={!!errors.soum}
                  />
                );
              }}
            />
            <Controller
              control={control}
              name="street"
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
                  errorMessage={errors.street?.message}
                  isInvalid={!!errors.street}
                />
              )}
            />

            {/* Children */}
            <View className="gap-2">
              <Label>
                <Label.Text className="text-sm font-normal text-darkgray">
                  Хүүхэд
                </Label.Text>
              </Label>
              <View className="flex-row items-center justify-center gap-8">
                <AppButton
                  className="w-11 h-11 rounded-full bg-white border-darkgray/30"
                  isIconOnly
                  leftIcon={<HugeiconsIcon icon={MinusSignIcon} color="#222222" size={20} />}
                  onPress={() => fields.length > 0 && remove(fields.length - 1)}
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
                  onPress={() => append({ gender: 'female', birthDate: '' })}
                />
              </View>
            </View>

            {fields.map((field, index) => (
              <View key={field.id} className="flex-row gap-3">
                <View className="flex-1">
                  <Controller
                    control={control}
                    name={`children.${index}.gender`}
                    render={({ field: { onChange, value } }) => (
                      <View className="gap-2">
                        <Label>
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
                              value === 'female' && 'text-black'
                            )}
                            isDisabled={value === 'female'}
                            onPress={() => onChange('female')}
                          />
                          <AppButton
                            label="Хүү"
                            className="flex-1 bg-white border-darkgray/30 rounded-full"
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
                            onChange(date ? dayjs(date).format('YYYY-MM-DD') : '');
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

            <Controller
              control={control}
              name="bankAccount"
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
                  errorMessage={errors.bankAccount?.message}
                  isInvalid={!!errors.bankAccount}
                />
              )}
            />
            <Controller
              control={control}
              name="bank"
              rules={{ required: 'Банк сонгоно уу' }}
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

            <AppButton
              label="Хадгалах"
              onPress={handleSubmit(handleSave)}
              isLoading={isLoading}
              className="mt-4 rounded border-darkgray/60"
            />
          </View>
        </KeyboardAwareScrollView>
      </View>
    </StyledSafeAreaView>
  );
}