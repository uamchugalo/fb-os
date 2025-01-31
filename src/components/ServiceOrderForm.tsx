import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Camera, MapPin, Save, FileDown, Plus, Minus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import html2pdf from 'html2pdf.js';
import type { ServiceOrder, Material } from '../types';
import { Customer } from "../types/customer";

interface Service {
  service_type: string;
  equipment_type?: string;
  equipment_power?: string;
  description?: string;
  custom_service_value?: string;
}

export function ServiceOrderForm() {
  const { register, handleSubmit, watch, setValue, reset } = useForm<ServiceOrder>({
    defaultValues: {
      services: [{
        service_type: '',
        equipment_type: '',
        equipment_power: '',
        description: '',
        custom_service_value: ''
      }]
    }
  });
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<Array<{
    material: Material;
    quantity: number;
  }>>([]);
  const [address, setAddress] = useState({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: ''
  });
  const [useManualLocation, setUseManualLocation] = useState(false);
  const [customServiceValue, setCustomServiceValue] = useState('');
  const [showCustomValueField, setShowCustomValueField] = useState(false);
  const [servicePrices, setServicePrices] = useState<any>({
    installation_prices: {},
    cleaning_prices: {}
  });
  const [discount, setDiscount] = useState(0);

  const serviceType = watch('service_type');
  const equipmentType = watch('equipment_type');

  useEffect(() => {
    loadMaterials();
    loadServicePrices();
  }, []);

  useEffect(() => {
    const services = watch('services') as Service[];
    const currentService = services?.[0];
    
    setShowCustomValueField(
      currentService?.service_type === 'maintenance' || 
      currentService?.service_type === 'gas_recharge' ||
      currentService?.service_type === 'other'
    );
  }, [watch('services')]);

  const loadMaterials = async () => {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error loading materials:', error);
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
        console.log('Preços carregados:', data);
        console.log('Preços de limpeza:', data.cleaning_prices);
        setServicePrices({
          installation_prices: data.installation_prices || {},
          cleaning_prices: data.cleaning_prices || {}
        });
      }
    } catch (error) {
      console.error('Erro ao carregar preços:', error);
    }
  };

  const handleLocation = async () => {
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocalização não suportada pelo navegador');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });

      setValue('location_lat', position.coords.latitude);
      setValue('location_lng', position.coords.longitude);
      toast.success('Localização capturada com sucesso!');
    } catch (error) {
      console.error('Geolocation error:', error);
      toast.error('Erro ao capturar localização. Por favor, insira o endereço manualmente.');
      setUseManualLocation(true);
    }
  };

  const addMaterial = (materialId: string) => {
    const material = materials.find(m => m.id === materialId);
    if (material) {
      setSelectedMaterials(prev => [...prev, { material, quantity: 1 }]);
    }
  };

  const updateMaterialQuantity = (index: number, quantity: number) => {
    setSelectedMaterials(prev => {
      const newMaterials = [...prev];
      newMaterials[index] = { ...newMaterials[index], quantity: Math.max(1, quantity) };
      return newMaterials;
    });
  };

  const removeMaterial = (index: number) => {
    setSelectedMaterials(prev => prev.filter((_, i) => i !== index));
  };

  const roundToTwo = (num: number): number => {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  };

  const calculateTotal = () => {
    const materialsTotal = roundToTwo(calculateMaterialsTotal());
    const servicesTotal = roundToTwo(calculateServicesTotal());
    const subtotal = roundToTwo(materialsTotal + servicesTotal);
    return roundToTwo(subtotal - discount);
  };

  const calculateMaterialsTotal = () => {
    return roundToTwo(selectedMaterials.reduce((total, { material, quantity }) => {
      return total + (material.default_price * quantity);
    }, 0));
  };

  const calculateServicesTotal = () => {
    const services = watch('services') || [];
    return roundToTwo(services.reduce((total, service) => {
      const value = service.custom_service_value ? parseFloat(service.custom_service_value.replace(',', '.')) : 0;
      return total + (isNaN(value) ? 0 : value);
    }, 0));
  };

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(',', '.');
    const numValue = parseFloat(value);
    setDiscount(isNaN(numValue) ? 0 : roundToTwo(numValue));
  };

  const resetForm = () => {
    reset({
      services: [{
        service_type: '',
        equipment_type: '',
        equipment_power: '',
        description: '',
        custom_service_value: ''
      }]
    });
    setSelectedMaterials([]);
    setAddress({
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: ''
    });
    setCustomServiceValue('');
  };

  const onSubmit = async (data: ServiceOrder) => {
    try {
      // Primeiro cria o cliente se ele não existir
      let customerId = data.customer?.id;
      
      if (!customerId && data.customer?.name) {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert([{
            name: data.customer.name,
            phone: data.customer.phone || ''
          }])
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      if (!customerId) {
        toast.error('Erro ao criar cliente');
        return;
      }

      // Validar tipo de equipamento para limpeza
      const serviceType = data.services?.[0]?.service_type;
      const equipmentType = data.services?.[0]?.equipment_type;
      
      if (serviceType === 'cleaning' && !equipmentType) {
        toast.error('Por favor, selecione o tipo de equipamento para o serviço de limpeza');
        return;
      }

      // Calcula os valores totais
      const materialsTotal = calculateMaterialsTotal() || 0;
      const servicesTotal = calculateServicesTotal() || 0;
      const total = materialsTotal + servicesTotal - discount;

      // Salva a ordem de serviço com o ID do cliente
      const { data: newOrder, error } = await supabase
        .from('service_orders')
        .insert([{
          customer_id: customerId,
          service_type: data.services[0]?.service_type || '',
          equipment_type: data.services[0]?.equipment_type || '',
          equipment_power: data.services[0]?.equipment_power || '',
          description: data.services[0]?.description || '',
          status: 'pending',
          location_lat: data.location_lat || null,
          location_lng: data.location_lng || null,
          address: {
            street: address.street || '',
            number: address.number || '',
            complement: address.complement || '',
            neighborhood: address.neighborhood || '',
            city: address.city || '',
            state: address.state || '',
            zipCode: address.zipCode || ''
          },
          customer_phone: data.customer.phone || '',
          materials_amount: materialsTotal,
          services_amount: servicesTotal,
          discount_amount: discount,
          total_amount: total
        }])
        .select()
        .single();

      if (error) throw error;

      // Salva os serviços adicionais
      if (data.services.length > 0) {
        const servicesData = data.services.map(service => ({
          service_order_id: newOrder.id,
          service_type: service.service_type,
          equipment_type: service.equipment_type,
          equipment_power: service.equipment_power,
          description: service.description || '',
          price: service.custom_service_value ? parseFloat(service.custom_service_value.replace(',', '.')) : 0
        }));

        console.log('Dados dos serviços:', servicesData); // Debug

        const { error: servicesError } = await supabase
          .from('order_services')
          .insert(servicesData);

        if (servicesError) {
          console.error('Erro detalhado:', servicesError); // Debug detalhado
          throw servicesError;
        }
      }

      // Salva os materiais selecionados
      if (selectedMaterials.length > 0) {
        const materialsData = selectedMaterials.map(({ material, quantity }) => ({
          service_order_id: newOrder.id,
          material_id: material.id,
          quantity: quantity,
          unit_price: material.default_price
        }));

        const { error: materialsError } = await supabase
          .from('service_order_materials')
          .insert(materialsData);

        if (materialsError) throw materialsError;
      }

      toast.success('Ordem de serviço criada com sucesso!');
      reset();
    } catch (error: any) {
      console.error('Erro ao criar ordem de serviço:', error);
      toast.error(`Erro ao criar ordem de serviço: ${error.message}`);
    }
  };

  const getCompanyInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('company_info')
        .select('*')
        .single();

      if (error) throw error;
      return data || {};
    } catch (error) {
      console.error('Error loading company info:', error);
      return {};
    }
  };

  const generatePDF = async (data: ServiceOrder, isNew = true) => {
    try {
      let orderData;

      if (isNew) {
        // Para nova OS, usa os dados do formulário
        orderData = {
          id: 'NOVA',
          customer: data.customer,
          service_type: data.services?.[0]?.service_type,
          equipment_type: data.services?.[0]?.equipment_type,
          equipment_power: data.services?.[0]?.equipment_power,
          description: data.services?.[0]?.description,
          address: address,
          materials: selectedMaterials.map(({ material, quantity }) => ({
            material,
            quantity,
            unit_price: material.default_price
          }))
        };
      } else {
        // Para OS existente, busca do banco
        const { data: existingOrder, error: orderError } = await supabase
          .from('service_orders')
          .select(`
            *,
            customer:customers(*),
            materials:service_order_materials(
              quantity,
              unit_price,
              material:materials(*)
            )
          `)
          .eq('id', data.id)
          .single();

        if (orderError) throw orderError;
        orderData = existingOrder;
      }

      // Busca informações da empresa
      const companyInfo = await getCompanyInfo();
      const currentDate = new Date().toLocaleDateString('pt-BR');

      console.log('Dados para PDF:', { orderData, companyInfo }); // Debug

      const element = document.createElement('div');
      element.innerHTML = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
          <!-- Cabeçalho com Logo e Informações da Empresa -->
          <div style="display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 20px;">
            ${companyInfo?.logo ? `<img src="${companyInfo.logo}" alt="Logo" style="max-height: 100px;"/>` : ''}
            <div style="text-align: right;">
              <h2 style="margin: 0;">${companyInfo?.name || 'Nome da Empresa'}</h2>
              <p style="margin: 5px 0;">CNPJ: ${companyInfo?.cnpj || '-'}</p>
              <p style="margin: 5px 0;">Tel: ${companyInfo?.phone || '-'}</p>
              <p style="margin: 5px 0;">Email: ${companyInfo?.email || '-'}</p>
            </div>
          </div>

          <!-- Número da OS e Data -->
          <div style="text-align: right; margin-bottom: 20px;">
            <h1 style="margin: 0;">Ordem de Serviço ${isNew ? '(NOVA)' : `#${orderData.id}`}</h1>
            <p>Data: ${currentDate}</p>
          </div>

          <!-- Informações do Cliente -->
          <div style="margin-bottom: 30px;">
            <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px;">Informações do Cliente</h3>
            <p><strong>Nome:</strong> ${orderData.customer?.name || '-'}</p>
            <p><strong>Telefone:</strong> ${orderData.customer?.phone || '-'}</p>
          </div>

          <!-- Endereço -->
          <div style="margin-bottom: 30px;">
            <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px;">Endereço</h3>
            <p>${orderData.address?.street || '-'}, ${orderData.address?.number || '-'}</p>
            ${orderData.address?.complement ? `<p>Complemento: ${orderData.address.complement}</p>` : ''}
            <p>${orderData.address?.neighborhood || '-'}</p>
            <p>${orderData.address?.city || '-'} - ${orderData.address?.state || '-'}</p>
            <p>CEP: ${orderData.address?.zipCode || '-'}</p>
          </div>

          <!-- Serviços -->
          <div style="margin-bottom: 30px;">
            <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px;">Serviços</h3>
            <div style="margin-bottom: 15px;">
              <p><strong>Tipo de Serviço:</strong> ${
                orderData.service_type === 'installation' ? 'Instalação' :
                orderData.service_type === 'maintenance' ? 'Manutenção' :
                orderData.service_type === 'cleaning' ? 'Limpeza' : 
                orderData.service_type === 'gas_recharge' ? 'Recarga de Gás' : '-'
              }</p>
              ${orderData.equipment_type ? `<p><strong>Tipo de Equipamento:</strong> ${orderData.equipment_type}</p>` : ''}
              ${orderData.equipment_power ? `<p><strong>Potência:</strong> ${orderData.equipment_power}</p>` : ''}
              ${orderData.description ? `<p><strong>Descrição:</strong> ${orderData.description}</p>` : ''}
            </div>
          </div>

          <!-- Materiais Utilizados -->
          ${orderData.materials?.length > 0 ? `
            <div style="margin-bottom: 30px;">
              <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px;">Materiais Utilizados</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f3f4f6;">
                    <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Material</th>
                    <th style="padding: 8px; text-align: center; border: 1px solid #ddd;">Quantidade</th>
                    <th style="padding: 8px; text-align: right; border: 1px solid #ddd;">Valor Unit.</th>
                    <th style="padding: 8px; text-align: right; border: 1px solid #ddd;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${orderData.materials.map(({ material, quantity, unit_price }) => `
                    <tr>
                      <td style="padding: 8px; border: 1px solid #ddd;">${material?.name || '-'}</td>
                      <td style="padding: 8px; text-align: center; border: 1px solid #ddd;">${quantity || 0} ${material?.unit || '-'}</td>
                      <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">R$ ${(unit_price || 0).toFixed(2)}</td>
                      <td style="padding: 8px; text-align: right; border: 1px solid #ddd;">R$ ${((unit_price || 0) * (quantity || 0)).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : '<p>Nenhum material utilizado</p>'}

          <!-- Resumo Financeiro -->
          <div style="margin-bottom: 30px; page-break-inside: avoid;">
            <h3 style="border-bottom: 1px solid #ccc; padding-bottom: 5px;">Resumo do Orçamento</h3>
            <table style="width: 100%; margin-top: 10px;">
              <tr>
                <td style="padding: 5px;"><strong>Serviços:</strong></td>
                <td style="text-align: right;">R$ ${calculateServicesTotal().toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 5px;"><strong>Materiais:</strong></td>
                <td style="text-align: right;">R$ ${calculateMaterialsTotal().toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 5px;"><strong>Desconto:</strong></td>
                <td style="text-align: right;">R$ ${discount.toFixed(2)}</td>
              </tr>
              <tr style="font-size: 1.2em;">
                <td style="padding: 5px; border-top: 2px solid #000;"><strong>Total:</strong></td>
                <td style="text-align: right; border-top: 2px solid #000;">R$ ${calculateTotal().toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <!-- Assinaturas -->
          <div style="margin-top: 50px; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; margin-top: 100px;">
              <div style="width: 45%; text-align: center;">
                <div style="border-top: 1px solid #000; padding-top: 5px;">
                  ${companyInfo?.name || 'Nome da Empresa'}<br>
                  CNPJ: ${companyInfo?.cnpj || '-'}
                </div>
              </div>
              <div style="width: 45%; text-align: center;">
                <div style="border-top: 1px solid #000; padding-top: 5px;">
                  ${orderData.customer?.name || 'Nome do Cliente'}<br>
                  Cliente
                </div>
              </div>
            </div>
            <p style="margin-top: 20px; font-size: 0.8em; text-align: center; color: #666;">
              Este documento pode ser assinado digitalmente através do GOV.BR ou fisicamente.<br>
              Data: ${currentDate}
            </p>
          </div>
        </div>
      `;

      const opt = {
        margin: 1,
        filename: `OS_${isNew ? 'nova' : orderData.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'cm', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-6">
        {/* Seção do Cliente */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Informações do Cliente</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome do Cliente</label>
              <input
                type="text"
                {...register('customer.name')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Telefone</label>
              <input
                type="tel"
                {...register('customer.phone')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Seção de Localização */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Localização</h3>
            <button
              type="button"
              onClick={handleLocation}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <MapPin className="h-4 w-4 mr-2" />
              Usar GPS
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Rua</label>
              <input
                type="text"
                {...register('address.street')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Número</label>
                <input
                  type="text"
                  {...register('address.number')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Complemento</label>
                <input
                  type="text"
                  {...register('address.complement')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Bairro</label>
              <input
                type="text"
                {...register('address.neighborhood')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Cidade</label>
              <input
                type="text"
                {...register('address.city')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">CEP</label>
              <input
                type="text"
                {...register('address.zipCode')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Seção de Serviços */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Serviços</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo de Serviço</label>
              <select
                {...register('service_type')}
                onChange={(e) => {
                  register('service_type').onChange(e);
                  setShowCustomValueField(e.target.value === 'custom');
                }}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Selecione o tipo de serviço</option>
                <option value="installation">Instalação</option>
                <option value="maintenance">Manutenção</option>
                <option value="cleaning">Limpeza</option>
                <option value="gas_recharge">Recarga de Gás</option>
                <option value="custom">Outro</option>
              </select>
            </div>
            
            {showCustomValueField && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Valor Personalizado</label>
                <input
                  type="number"
                  {...register('custom_service_value')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo de Equipamento</label>
              <input
                type="text"
                {...register('equipment_type')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Potência</label>
              <input
                type="text"
                {...register('equipment_power')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Descrição</label>
            <textarea
              {...register('description')}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Seção de Materiais */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Materiais</h3>
          <div className="grid grid-cols-1 gap-4">
            <select
              onChange={(e) => addMaterial(e.target.value)}
              value=""
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">Selecione um material</option>
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name} - R$ {(material.price || 0).toFixed(2)}
                </option>
              ))}
            </select>

            <div className="space-y-2">
              {selectedMaterials.map((item, index) => (
                <div key={index} className="flex items-center space-x-4 p-2 bg-gray-50 rounded-md">
                  <div className="flex-grow">
                    <p className="text-sm font-medium text-gray-900">{item.material.name}</p>
                    <p className="text-sm text-gray-500">R$ {(item.material.price || 0).toFixed(2)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => updateMaterialQuantity(index, item.quantity - 1)}
                      className="p-1 rounded-md hover:bg-gray-200"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateMaterialQuantity(index, item.quantity + 1)}
                      className="p-1 rounded-md hover:bg-gray-200"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeMaterial(index)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded-md"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
          <button
            type="button"
            onClick={generatePDF}
            className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Gerar PDF
          </button>
          <button
            type="submit"
            className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar OS
          </button>
        </div>
      </form>
    </div>
  );
}