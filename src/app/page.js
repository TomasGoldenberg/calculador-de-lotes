"use client";
import Image from "next/image";
import { useState } from "react";

export default function Home() {
  const prices = [
    10000, 11000, 12000, 13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000,
    21000, 22000, 23000, 24000, 25000, 26000, 27000, 28000, 29000,
  ];

  const [lote, setLote] = useState(0);
  const [pagoAdelantado, setPagoAdelantado] = useState(0);
  const [cantidadMeses, setCantidadMeses] = useState(0);
  const [amountPerMonth, setAmountPerMonth] = useState(0);
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "lote-numero") {
      setLote(value);
    } else if (name === "pago-adelantado") {
      setPagoAdelantado(value);
    } else if (name === "cantidad-meses") {
      setCantidadMeses(value);
    }
  };

  const handleSubmit = () => {
    const price = prices[lote - 1];
    const subTotal = price - pagoAdelantado;
    const amountPerMonth = subTotal / cantidadMeses;

    setAmountPerMonth(amountPerMonth);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Calculadora de Lotes
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Calcule sus pagos mensuales de forma fácil y rápida
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label
                htmlFor="lote-numero"
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
              >
                Lote Número
              </label>
              <input
                type="number"
                id="lote-numero"
                onChange={handleChange}
                name="lote-numero"
                min="1"
                max="20"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-lg transition-colors"
                placeholder="1 - 20"
              />
            </div>

            <div>
              <label
                htmlFor="pago-adelantado"
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
              >
                Pago Adelantado
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-gray-500 dark:text-gray-400 text-lg">
                  $
                </span>
                <input
                  type="number"
                  id="pago-adelantado"
                  onChange={handleChange}
                  name="pago-adelantado"
                  step="0.01"
                  min="0"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-lg transition-colors"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="cantidad-meses"
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
              >
                Cantidad de Meses
              </label>
              <input
                type="number"
                id="cantidad-meses"
                onChange={handleChange}
                name="cantidad-meses"
                min="1"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-lg transition-colors"
                placeholder="Número de meses"
              />
            </div>
          </div>

          {amountPerMonth > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <label className="block text-sm font-semibold text-green-800 dark:text-green-300 mb-2">
                Monto por Mes
              </label>
              <div className="flex items-center">
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${amountPerMonth.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            type="button"
            disabled={!lote || !cantidadMeses}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-lg"
          >
            Calcular Pago Mensual
          </button>
        </div>
      </div>
    </div>
  );
}
