import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Material, ServicePrices } from '../types';

const BTU_OPTIONS = [
  { value: '7000', label: '7.000 BTUs' },
  { value: '9000', label: '9.000 BTUs' },
  { value: '12000', label: '12.000 BTUs' },
  { value: '18000', label: '18.000 BTUs' },
  { value: '24000', label: '24.000 BTUs' },
  { value: '30000', label: '30.000 BTUs' },
  { value: '36000', label: '36.000 BTUs' },
  { value: '48000', label: '48.000 BTUs' },
  { value: '60000', label: '60.000 BTUs' }
];

const EQUIPMENT_TYPES = [
  { id: 'split', label: 'Split' },
  { id: 'cassete', label: 'Cassete' },
  { id: 'piso_teto', label: 'Piso Teto' },
  { id: 'multi_split', label: 'Multi Split' },
  { id: 'janela', label: 'Janela' },
  { id: 'portatil', label: 'Portátil' }
];

export function MaterialsManagement() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [newMaterial, setNewMaterial] = useState({
    name: '',
    unit: '',
    default_price: '',
  });
  const [servicePrices, setServicePrices] = useState({
    installation_prices: {},
    cleaning_prices: {}
  });
  const [defaultPrices, setDefaultPrices] = useState<Record<string, string>>({
    split: '350.00',      // Valor padrão para Split
    multi_split: '450.00', // Valor padrão para Multi Split
    cassete: '500.00',    // Valor padrão para Cassete
    piso_teto: '450.00',  // Valor padrão para Piso Teto
    cortina: '400.00',    // Valor padrão para Cortina
    portatil: '300.00'    // Valor padrão para Portátil
  });

  useEffect(() => {
    loadMaterials();
    loadServicePrices();
  }, []);

  const loadMaterials = async () => {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .order('name');
    
    if (error) {
      toast.error('Erro ao carregar materiais');
      return;
    }

    setMaterials(data || []);
  };

  const loadServicePrices = async () => {
    try {
      const { data, error } = await supabase
        .from('service_prices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      if (data) {
        setServicePrices({
          id: data.id,
          installation_prices: data.installation_prices || {},
          cleaning_prices: data.cleaning_prices || {}
        });
      }
    } catch (error) {
      console.error('Erro ao carregar preços:', error);
    }
  };

  const handleAddMaterial = async () => {
    try {
      if (!newMaterial.name || !newMaterial.unit || !newMaterial.default_price) {
        toast.error('Preencha todos os campos do material');
        return;
      }

      const { data, error } = await supabase
        .from('materials')
        .insert([{
          name: newMaterial.name,
          unit: newMaterial.unit,
          default_price: parseFloat(newMaterial.default_price),
          is_custom: true,
        }])
        .select()
        .single();

      if (error) throw error;

      setMaterials([...materials, data]);
      setNewMaterial({ name: '', unit: '', default_price: '' });
      toast.success('Material adicionado com sucesso!');
    } catch (error) {
      toast.error('Erro ao adicionar material');
    }
  };

  const handleUpdateMaterial = async (id: string, updates: Partial<Material>) => {
    try {
      const { error } = await supabase
        .from('materials')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setMaterials(materials.map(m => m.id === id ? { ...m, ...updates } : m));
      toast.success('Material atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar material');
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    try {
      // First check if the material is being used in any service orders
      const { data: usedMaterials, error: checkError } = await supabase
        .from('service_order_materials')
        .select('id')
        .eq('material_id', id)
        .limit(1);

      if (checkError) throw checkError;

      if (usedMaterials && usedMaterials.length > 0) {
        toast.error('Este material não pode ser excluído pois está sendo usado em ordens de serviço');
        return;
      }

      const { error } = await supabase
        .from('materials')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setMaterials(materials.filter(m => m.id !== id));
      toast.success('Material removido com sucesso!');
    } catch (error) {
      toast.error('Erro ao remover material');
    }
  };

  const handleSave = async (prices = servicePrices) => {
    try {
      const priceData = {
        installation_prices: prices.installation_prices,
        cleaning_prices: prices.cleaning_prices,
        created_at: new Date().toISOString()
      };

      // Se já existe um ID, atualiza o registro existente
      if (prices.id) {
        await supabase
          .from('service_prices')
          .update(priceData)
          .eq('id', prices.id);
      } else {
        await supabase
          .from('service_prices')
          .insert([priceData]);
      }

      toast.success('Preços salvos com sucesso!');
      loadServicePrices();
    } catch (error) {
      console.error('Erro ao salvar preços:', error);
      toast.error('Erro ao salvar preços');
    }
  };

  const updateAllBTUPrices = (equipmentType: string, value: string) => {
    const exactValue = value.replace(/[^0-9.]/g, '');
    
    setServicePrices(prev => {
      const newPrices = {
        ...prev,
        installation_prices: {
          ...prev.installation_prices,
          [equipmentType]: BTU_OPTIONS.reduce((acc, { value: btu }) => ({
            ...acc,
            [btu]: exactValue
          }), {})
        }
      };
      
      // Salva automaticamente após atualizar
      handleSave(newPrices);
      return newPrices;
    });
  };

  const updateInstallationPrice = (type: string, btu: string, value: string) => {
    const exactValue = value.replace(/[^0-9.]/g, '');
    
    setServicePrices(prev => {
      const newPrices = {
        ...prev,
        installation_prices: {
          ...prev.installation_prices,
          [type]: {
            ...prev.installation_prices[type],
            [btu]: exactValue
          }
        }
      };
      
      // Salva automaticamente após atualizar
      handleSave(newPrices);
      return newPrices;
    });
  };

  const updateCleaningPrice = (type: string, value: string) => {
    const exactValue = value.replace(/[^0-9.]/g, '');
    
    setServicePrices(prev => {
      const newPrices = {
        ...prev,
        cleaning_prices: {
          ...prev.cleaning_prices,
          [type]: exactValue
        }
      };
      
      // Salva automaticamente após atualizar
      handleSave(newPrices);
      return newPrices;
    });
  };

  const handleDefaultPriceChange = (id: string, value: string) => {
    setDefaultPrices(prev => ({
      ...prev,
      [id]: value
    }));

    // Atualiza os preços de instalação e limpeza com o novo valor padrão
    const newPrice = value || '0';
    updateInstallationPrice(id, newPrice);
    updateCleaningPrice(id, newPrice);
  };

  const BTUs = ['7000', '9000', '12000', '18000', '24000', '30000', '36000', '48000', '60000'];

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-6">Preços dos Serviços</h2>
        
        {/* Instalação */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Preços de Instalação</h3>
          <div className="space-y-8">
            {EQUIPMENT_TYPES.map(({ id, label }) => (
              <div key={`installation-${id}`} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-700">{label}</h4>
                  {/* Campo para definir valor para todos os BTUs */}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Definir todos:</span>
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-2">R$</span>
                      <input
                        type="text"
                        onChange={(e) => updateAllBTUPrices(id, e.target.value)}
                        className="w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {BTU_OPTIONS.map(({ value, label: btuLabel }) => (
                    <div key={`${id}-${value}`} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {btuLabel}
                      </label>
                      <div className="flex items-center">
                        <span className="text-gray-500 mr-2">R$</span>
                        <input
                          type="text"
                          value={servicePrices.installation_prices[id]?.[value] || ''}
                          onChange={(e) => updateInstallationPrice(id, value, e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Limpeza */}
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Preços de Limpeza</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {EQUIPMENT_TYPES.map(({ id, label }) => (
              <div key={`cleaning-${id}`} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {label}
                </label>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">R$</span>
                  <input
                    type="text"
                    value={servicePrices.cleaning_prices[id] || ''}
                    onChange={(e) => updateCleaningPrice(id, e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => handleSave()}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Save className="h-5 w-5 mr-2" />
            Salvar Preços
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-6">Gerenciar Materiais</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <input
            type="text"
            value={newMaterial.name}
            onChange={(e) => setNewMaterial({ ...newMaterial, name: e.target.value })}
            placeholder="Nome do material"
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <input
            type="text"
            value={newMaterial.unit}
            onChange={(e) => setNewMaterial({ ...newMaterial, unit: e.target.value })}
            placeholder="Unidade (ex: metro, unidade)"
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <div className="flex items-center space-x-2">
            <span className="text-gray-500">R$</span>
            <input
              type="number"
              value={newMaterial.default_price}
              onChange={(e) => setNewMaterial({ ...newMaterial, default_price: e.target.value })}
              placeholder="Preço"
              step="0.01"
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
            <button
              onClick={handleAddMaterial}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {materials.map((material) => (
            <div key={material.id} className="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg">
              <input
                type="text"
                value={material.name}
                onChange={(e) => handleUpdateMaterial(material.id, { name: e.target.value })}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <input
                type="text"
                value={material.unit}
                onChange={(e) => handleUpdateMaterial(material.id, { unit: e.target.value })}
                className="w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <div className="flex items-center space-x-2">
                <span className="text-gray-500">R$</span>
                <input
                  type="number"
                  value={material.default_price}
                  onChange={(e) => handleUpdateMaterial(material.id, { default_price: parseFloat(e.target.value) })}
                  step="0.01"
                  className="w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => handleDeleteMaterial(material.id)}
                className="p-2 text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}