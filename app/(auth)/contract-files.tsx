import { View, Pressable, ScrollView } from 'react-native';
import { useRouter } from "expo-router";
import { withUniwind } from "uniwind";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/app-text";
import { AppHeader } from "@/components/app-header";
import React, { useEffect, useState } from "react";
import { api } from "@/config/api";

interface ContractFile {
  name: string;
  path: string;
}

interface ContractFilesResponse {
  files: ContractFile[];
}

const StyledSafeAreaView = withUniwind(SafeAreaView);

interface DocumentItemProps {
  label: string;
  disabled?: boolean;
  onPress?: () => void;
}

function DocumentItem({ label, disabled, onPress }: DocumentItemProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="h-12.5 justify-center border-b border-darkgray/12"
    >
      <AppText className={`text-base font-medium ${disabled ? 'text-darkgray/50' : ''}`}>
        {label}
      </AppText>
    </Pressable>
  );
}

export default function ContractsRulesScreen() {
  const router = useRouter();
  const [files, setFiles] = useState<ContractFile[]>([]);

  useEffect(() => {
    api<ContractFilesResponse>({
      path: '/profile/contract-files',
      method: 'GET',
    }).then((res) => {
      if (res.status === 200) {
        setFiles(Array.isArray(res.data?.files) ? res.data.files : []);
      }
    }).catch(console.error);
  }, []);

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1 px-4">
        <AppHeader backTitle="Гэрээ & дүрэм журам" showBack />
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {files.map((file, index) => (
            <DocumentItem
              key={index}
              label={file.name}
              disabled={!file.path}
              onPress={file.path ? () => router.navigate({
                pathname: '/pdf-view',
                params: { title: file.name, url: file.path },
              }) : undefined}
            />
          ))}
        </ScrollView>
      </View>
    </StyledSafeAreaView>
  );
}