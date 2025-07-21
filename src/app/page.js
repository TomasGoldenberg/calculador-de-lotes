"use client";
import { useState, useEffect } from "react";

export default function Home() {
  // Remove the hardcoded prices array and replace with state
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [lote, setLote] = useState(0);
  const [pagoAdelantado, setPagoAdelantado] = useState(0);
  const [cantidadMeses, setCantidadMeses] = useState(0);
  const [amountPerMonth, setAmountPerMonth] = useState(0);
  const [amountPerMonthWithoutInterest, setAmountPerMonthWithoutInterest] =
    useState(0);

  // Fetch lotes from API
  const fetchLotes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/lotes");
      const data = await response.json();

      if (data.success) {
        setLotes(data.lotes);
        setError(null);
      } else {
        setError("Failed to fetch lotes");
      }
    } catch (err) {
      setError("Error connecting to server");
      console.error("Error fetching lotes:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load lotes on component mount
  useEffect(() => {
    fetchLotes();
  }, []);

  const getInterestRate = (months) => {
    if (months >= 72) return 22;
    if (months >= 60) return 20;
    if (months >= 48) return 18;
    if (months >= 36) return 16;
    if (months >= 24) return 14;
    if (months >= 12) return 12;
    return 0; // No interest for less than 12 months
  };

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

  const calculateTotal = () => {
    if (
      !lote ||
      !cantidadMeses ||
      lote < 1 ||
      lote > lotes.length ||
      lotes.length === 0
    ) {
      setAmountPerMonth(0);
      setAmountPerMonthWithoutInterest(0);
      return;
    }

    // Find the lote by id
    const selectedLote = lotes.find((l) => l.id === parseInt(lote));
    if (!selectedLote) {
      setAmountPerMonth(0);
      setAmountPerMonthWithoutInterest(0);
      return;
    }

    const price = selectedLote.price;
    const principal = price - pagoAdelantado;
    const months = parseInt(cantidadMeses);
    const annualRate = getInterestRate(months);

    if (principal <= 0 || months <= 0) {
      setAmountPerMonth(0);
      setAmountPerMonthWithoutInterest(0);
      return;
    }

    // Calculate without interest
    const monthlyPaymentWithoutInterest = principal / months;
    setAmountPerMonthWithoutInterest(monthlyPaymentWithoutInterest);

    if (annualRate === 0) {
      // No interest for less than 12 months
      setAmountPerMonth(monthlyPaymentWithoutInterest);
    } else {
      // Calculate with interest using loan formula
      const monthlyRate = annualRate / 100 / 12;
      const monthlyPayment =
        (principal * (monthlyRate * Math.pow(1 + monthlyRate, months))) /
        (Math.pow(1 + monthlyRate, months) - 1);
      setAmountPerMonth(monthlyPayment);
    }
  };

  useEffect(() => {
    calculateTotal();
  }, [lote, pagoAdelantado, cantidadMeses, lotes]);

  // Helper function to get price by lote number
  const getLotePrice = (loteNumber) => {
    const selectedLote = lotes.find((l) => l.id === parseInt(loteNumber));
    return selectedLote ? selectedLote.price : 0;
  };

  // Helper function to check if lote is available
  const isLoteAvailable = (loteNumber) => {
    const selectedLote = lotes.find((l) => l.id === parseInt(loteNumber));
    return selectedLote ? selectedLote.available : false;
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
          {loading && (
            <div className="text-center py-4">
              <p className="text-gray-600 dark:text-gray-400">
                Cargando lotes...
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-300">{error}</p>
              <button
                onClick={fetchLotes}
                className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
              >
                Intentar de nuevo
              </button>
            </div>
          )}

          {!loading && !error && (
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
                  max={lotes.length}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-lg transition-colors"
                  placeholder={`1 - ${lotes.length}`}
                />
                {lote && lote >= 1 && lote <= lotes.length ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                      El total del lote {lote} es $
                      {getLotePrice(lote).toLocaleString()}
                    </p>
                    {!isLoteAvailable(lote) && (
                      <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                        ⚠️ Este lote no está disponible
                      </p>
                    )}
                  </div>
                ) : (
                  <></>
                )}
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
                {lote && lote >= 1 && lote <= lotes.length && pagoAdelantado ? (
                  <p className="mt-2 text-sm text-green-600 dark:text-green-400 font-medium">
                    El monto a financiar es $
                    {(getLotePrice(lote) - pagoAdelantado).toLocaleString()}
                  </p>
                ) : (
                  <></>
                )}
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
                {cantidadMeses && cantidadMeses >= 1 ? (
                  <p className="mt-2 text-sm text-purple-600 dark:text-purple-400 font-medium">
                    {getInterestRate(cantidadMeses) === 0
                      ? "Sin interés (menos de 12 meses)"
                      : `Tasa de interés: ${getInterestRate(
                          cantidadMeses
                        )}% anual`}
                  </p>
                ) : (
                  <></>
                )}
              </div>
            </div>
          )}

          {!loading && !error && amountPerMonth > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3">
              <label className="block text-sm font-semibold text-green-800 dark:text-green-300 mb-2">
                Pagos Mensuales
              </label>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Sin interés:
                  </span>
                  <span className="text-xl font-bold text-gray-700 dark:text-gray-300">
                    ${amountPerMonthWithoutInterest.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Con interés:
                  </span>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ${amountPerMonth.toFixed(2)}
                  </span>
                </div>
                {amountPerMonth !== amountPerMonthWithoutInterest && (
                  <div className="pt-2 border-t border-green-200 dark:border-green-700">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Diferencia:
                      </span>
                      <span className="text-sm font-medium text-red-600 dark:text-red-400">
                        +$
                        {(
                          amountPerMonth - amountPerMonthWithoutInterest
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
