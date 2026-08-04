import { api } from '@/config/api';
import { useAuthStore, type AddressOption, type SelectOption, type SelectOptionsData } from '@/store/auth-store';
import { useEffect, useState } from 'react';

export function useSelectOptions() {
  const selectOptions = useAuthStore((state) => state.selectOptions);
  const setSelectOptions = useAuthStore((state) => state.setSelectOptions);

  const [bankOptions, setBankOptions] = useState<SelectOption[]>(selectOptions?.bank ?? []);
  const [nationalityOptions, setNationalityOptions] = useState<SelectOption[]>(selectOptions?.nationality ?? []);
  const [relationshipOptions, setRelationshipOptions] = useState<SelectOption[]>(selectOptions?.emergencyRelation ?? []);
  const [addressOptions, setAddressOptions] = useState<AddressOption[]>(selectOptions?.address ?? []);
  const [isLoading, setIsLoading] = useState(!selectOptions);

  useEffect(() => {
    if (selectOptions) return;

    let cancelled = false;

    async function fetchOptions() {
      try {
        const res = await api<SelectOptionsData>({ path: '/select-options' });
        if (!cancelled && res.status === 200) {
          const data: SelectOptionsData = {
            bank: Array.isArray(res.data?.bank) ? res.data.bank : [],
            nationality: Array.isArray(res.data?.nationality) ? res.data.nationality : [],
            emergencyRelation: Array.isArray(res.data?.emergencyRelation) ? res.data.emergencyRelation : [],
            address: Array.isArray(res.data?.address) ? res.data.address : [],
          };
          setBankOptions(data.bank);
          setNationalityOptions(data.nationality);
          setRelationshipOptions(data.emergencyRelation);
          setAddressOptions(data.address);
          setSelectOptions(data);
        }
      } catch (error) {
        console.error('Failed to fetch select options:', error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void fetchOptions();
    return () => { cancelled = true; };
  }, [selectOptions, setSelectOptions]);

  return {
    bankOptions,
    nationalityOptions,
    relationshipOptions,
    addressOptions,
    isLoading,
  };
}