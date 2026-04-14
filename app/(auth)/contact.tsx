import { AppHeader } from "@/components/app-header";
import { AppText } from "@/components/app-text";
import { AppTextField } from "@/components/app-text-field";
import { api } from "@/config/api";
import {
  AtIcon,
  Search01Icon,
  SmartPhone01Icon,
} from "@hugeicons-pro/core-stroke-standard";
import { HugeiconsIcon } from "@hugeicons/react-native";
import { Avatar, cn, Separator } from "heroui-native";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const StyledSafeAreaView = withUniwind(SafeAreaView);

interface ContactApi {
  id: number;
  firstName: string;
  lastName: string;
  profileImage: string | null;
  email: string | null;
  phone: string | null;
  department: string;
  departmentOrder: number;
  jobPosition: string;
  jobPositionOrder: number;
  branch: string;
  branchOrder: number;
}

interface Contact {
  id: string;
  name: string;
  position: string;
  avatar: string | null;
  phone: string | null;
  email: string | null;
}

interface EmployeeGroup {
  name: string;
  contacts: Contact[];
}

function mapContact(c: ContactApi): Contact {
  return {
    id: String(c.id),
    name: `${c.firstName}${c.lastName ? '.' + c.lastName[0] : ''}`,
    position: c.jobPosition,
    avatar: c.profileImage,
    phone: c.phone,
    email: c.email
  };
}

function groupByDepartment(contacts: ContactApi[]): EmployeeGroup[] {
  const sorted = [...contacts].sort((a, b) => a.departmentOrder - b.departmentOrder || a.jobPositionOrder - b.jobPositionOrder);
  const map = new Map<string, Contact[]>();
  for (const c of sorted) {
    const key = c.department;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(mapContact(c));
  }
  return Array.from(map.entries()).map(([name, contacts]) => ({ name, contacts }));
}

function groupByBranch(contacts: ContactApi[]): EmployeeGroup[] {
  const sorted = [...contacts].sort((a, b) => a.branchOrder - b.branchOrder || a.jobPositionOrder - b.jobPositionOrder);
  const map = new Map<string, Contact[]>();
  for (const c of sorted) {
    const key = c.branch;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(mapContact(c));
  }
  return Array.from(map.entries()).map(([name, contacts]) => ({ name, contacts }));
}

const TABS = ['Алба, хэлтэс', 'Салбар, байршил'] as const;

function ContactCard({ contact, isExpanded, onToggle }: {
  contact: Contact;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <View className={cn(
      '',
      isExpanded && 'bg-darkgray/5'
    )}>
      <Pressable onPress={onToggle} className="flex-row items-center gap-1 h-12.5">
        <Avatar alt={contact.name} className="w-10 h-10">
          {contact.avatar ? (
            <Avatar.Image source={{ uri: contact.avatar }} />
          ) : null}
          <Avatar.Fallback classNames={{ text: "text-black" }}>
            {contact.name.slice(0, 2)}
          </Avatar.Fallback>
        </Avatar>
        <View className="flex-1">
          <AppText className="text-sm">{contact.name}</AppText>
          <AppText className="text-sm text-darkgray">{contact.position}</AppText>
        </View>
      </Pressable>
      {isExpanded && (
        <View className="pt-3 pb-2">
          <Pressable
            className="flex-row items-center mb-2 gap-1"
            onPress={() => contact.phone && Linking.openURL(`tel:${contact.phone}`)}
          >
            <View className="w-10 items-center justify-center">
              <HugeiconsIcon icon={SmartPhone01Icon} color="#6A6A6A" size={20} />
            </View>
            <AppText className={`text-sm ${contact.phone ? 'text-blue' : 'text-darkgray'}`}>
              {contact.phone ?? '********'}
            </AppText>
          </Pressable>
          <View className="flex-row items-center">
            <View className="w-10 items-center justify-center">
              <HugeiconsIcon icon={AtIcon} color="#6A6A6A" size={20} />
            </View>
            <AppText className="text-sm">{contact.email ?? '-'}</AppText>
          </View>
        </View>
      )}
    </View>
  );
}

export default function ContactScreen() {
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<ContactApi[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<ContactApi[]>({ path: '/contacts', method: 'GET' })
      .then((res) => {
        if (res.status === 200) {
          setContacts(res.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const grouped = activeTab === 0 ? groupByDepartment(contacts) : groupByBranch(contacts);
  const filteredEmployees = grouped.map((dept) => ({
    ...dept,
    contacts: dept.contacts.filter((c) =>
      c.name.toLowerCase().startsWith(searchQuery.toLowerCase())
    ),
  })).filter((dept) => dept.contacts.length > 0);

  return (
    <StyledSafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-1">
        <AppHeader backTitle="Холбоо барих жагсаалт" showBack className="px-4" />
        <View className="px-4 mb-5">
          <AppTextField
            className="rounded-full"
            placeholder="Ажилтны нэрээр хайх"
            leftIcon={
              <HugeiconsIcon icon={Search01Icon} color="#222222" size={20} />
            }
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View className="flex-row px-4 mb-4">
          {TABS.map((tab, index) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(index)}
              className="mr-6 pb-1"
              style={activeTab === index ? { borderBottomWidth: 2, borderBottomColor: '#005FEE' } : undefined}
            >
              <AppText className={`text-sm ${activeTab === index ? 'font-medium text-black' : 'text-darkgray'}`}>
                {tab}
              </AppText>
            </Pressable>
          ))}
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator />
          </View>
        ) : (
          <ScrollView className="flex-1 mt-2" showsVerticalScrollIndicator={false}>
            {filteredEmployees.map((dept) => (
              <View key={dept.name} className="mb-5">
                <View className="bg-lightblue px-4 py-2">
                  <AppText className="text-sm text-darkblue text-right">{dept.name}</AppText>
                </View>

                <View className="px-4">
                  {dept.contacts.map((contact, index) => (
                    <View key={contact.id}>
                      <ContactCard
                        contact={contact}
                        isExpanded={expandedId === contact.id}
                        onToggle={() => setExpandedId(expandedId === contact.id ? null : contact.id)}
                      />
                      {index < dept.contacts.length - 1 && <Separator className="bg-darkgray/12" />}
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </StyledSafeAreaView>
  );
}
