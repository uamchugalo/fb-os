import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, DollarSign, TrendingUp, TrendingDown, Wrench } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import type { ServiceOrder } from '../types';

export function AccountingDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalCosts: 0,
    profit: 0,
    serviceCount: 0,
  });
  const [serviceBreakdown, setServiceBreakdown] = useState<Record<string, number>>({});

  useEffect(() => {
    loadMonthlyData();
  }, [selectedMonth]);

  const loadMonthlyData = async () => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);

    const { data: orders, error } = await supabase
      .from('service_orders')
      .select(`
        *,
        materials:service_order_materials(
          quantity,
          unit_price,
          material:materials(*)
        )
      `)
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString());

    if (error) {
      console.error('Error loading accounting data:', error);
      return;
    }

    const breakdown: Record<string, number> = {};
    let totalRevenue = 0;
    let totalCosts = 0;

    orders?.forEach((order: ServiceOrder) => {
      // Add service base price
      const servicePrice = order.total_amount || 0;
      totalRevenue += servicePrice;

      // Calculate materials cost
      const materialsCost = order.materials?.reduce((acc, mat) => {
        return acc + (mat.quantity * mat.unit_price);
      }, 0) || 0;
      totalCosts += materialsCost;

      // Update service type breakdown
      const serviceType = order.service_type;
      breakdown[serviceType] = (breakdown[serviceType] || 0) + servicePrice;
    });

    setSummary({
      totalRevenue,
      totalCosts,
      profit: totalRevenue - totalCosts,
      serviceCount: orders?.length || 0,
    });

    setServiceBreakdown(breakdown);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Relatório Financeiro</h2>
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <input
              type="month"
              value={format(selectedMonth, 'yyyy-MM')}
              onChange={(e) => setSelectedMonth(new Date(e.target.value))}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Receita Total</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalRevenue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Custos Totais</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalCosts)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Lucro</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.profit)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total de Serviços</p>
                <p className="text-2xl font-bold text-purple-600">{summary.serviceCount}</p>
              </div>
              <Wrench className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Receita por Tipo de Serviço</h3>
        <div className="space-y-4">
          {Object.entries(serviceBreakdown).map(([type, value]) => (
            <div key={type} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="font-medium">
                {type === 'installation' ? 'Instalação' :
                 type === 'maintenance' ? 'Manutenção' :
                 type === 'cleaning' ? 'Limpeza' : 'Recarga de Gás'}
              </span>
              <span className="text-gray-900 font-semibold">{formatCurrency(value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}