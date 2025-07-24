"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function CalculatePage() {
  const params = useParams();
  const projectId = params.projectId;

  const [project, setProject] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ total: 0, available: 0, sold: 0 });
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [pagoAdelantado, setPagoAdelantado] = useState("");
  const [cantidadMeses, setCantidadMeses] = useState("");
  const [calculatedInterestRate, setCalculatedInterestRate] = useState(null);
  const [results, setResults] = useState(null);
  const [validationError, setValidationError] = useState(null);

  // Modal and reservation state
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [reservationData, setReservationData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [submittingReservation, setSubmittingReservation] = useState(false);

  // Fetch units from project-specific API
  const fetchUnits = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/projects/${projectId}/units`);
      const data = await response.json();

      if (data.success) {
        setProject(data.project);
        setUnits(data.units);
        setStats(data.stats);
        setError(null);
      } else {
        setError(data.error || "Failed to fetch units");
      }
    } catch (err) {
      setError("Error connecting to server");
      console.error("Error fetching units:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load units on component mount
  useEffect(() => {
    fetchUnits();
  }, [projectId]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "unit-selection") {
      setSelectedUnitId(value);
    } else if (name === "pago-adelantado") {
      setPagoAdelantado(value);
    } else if (name === "cantidad-meses") {
      setCantidadMeses(value);
      // Calculate interest rate based on payment months
      if (value && project?.interestRates) {
        const months = parseInt(value);
        let rate;
        if (months <= 12) {
          rate = project.interestRates.lowRate;
        } else if (months > 12 && months <= 16) {
          rate = project.interestRates.mediumRate;
        } else if (months > 16 && months <= 20) {
          rate = project.interestRates.highRate;
        } else {
          rate = project.interestRates.highRate;
        }
        setCalculatedInterestRate(rate);
      } else {
        setCalculatedInterestRate(null);
      }
    }
  };

  // Check if form is valid
  const isFormValid = () => {
    return (
      loading ||
      !selectedUnitId ||
      !pagoAdelantado ||
      !cantidadMeses ||
      units.length === 0
    );
  };

  // Calculate payments when form values change
  useEffect(() => {
    if (
      selectedUnitId &&
      pagoAdelantado &&
      cantidadMeses &&
      calculatedInterestRate !== null &&
      !isFormValid()
    ) {
      // Find the selected unit
      const selectedUnit = units.find((u) => u._id === selectedUnitId);
      if (!selectedUnit) {
        setResults(null);
        return;
      }

      const price = selectedUnit.price;
      const downPayment = parseFloat(pagoAdelantado);
      const months = parseInt(cantidadMeses);
      const annualInterest = parseFloat(calculatedInterestRate) / 100;
      const monthlyInterest = annualInterest / 12;

      // Validation: ensure down payment is valid
      if (downPayment < 0) {
        setResults(null);
        setValidationError("El pago inicial no puede ser negativo.");
        return;
      }

      if (downPayment >= price) {
        setResults(null);
        setValidationError(
          "El pago inicial no puede ser mayor o igual al precio de la unidad."
        );
        return;
      }

      const principal = price - downPayment;

      // Ensure principal is positive
      if (principal <= 0) {
        setResults(null);
        setValidationError(
          "El pago inicial debe ser menor al precio de la unidad."
        );
        return;
      }

      // Clear validation error if we get this far
      setValidationError(null);

      let monthlyPayment = 0;
      if (monthlyInterest > 0) {
        // Standard amortization formula: PMT = P * r / (1 - (1 + r)^(-n))
        // where P = principal, r = monthly interest rate, n = number of payments
        monthlyPayment =
          (principal * monthlyInterest) /
          (1 - Math.pow(1 + monthlyInterest, -months));
      } else {
        // If no interest, divide principal equally across all months
        monthlyPayment = principal / months;
      }

      const totalInterest = monthlyPayment * months - principal;
      const totalAmount = downPayment + monthlyPayment * months;

      setResults({
        principal,
        monthlyPayment,
        totalInterest,
        totalAmount,
        unitPrice: price,
        selectedUnit,
        appliedInterestRate: calculatedInterestRate,
      });
    } else {
      setResults(null);
      setValidationError(null);
    }
  }, [
    selectedUnitId,
    pagoAdelantado,
    cantidadMeses,
    calculatedInterestRate,
    units,
  ]);

  // Helper function to get selected unit
  const getSelectedUnit = () => {
    return units.find((u) => u._id === selectedUnitId);
  };

  // Handle reservation form input changes
  const handleReservationInputChange = (e) => {
    const { name, value } = e.target;
    setReservationData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle reservation form submission
  const handleReservationSubmit = async (e) => {
    e.preventDefault();

    if (
      !reservationData.name ||
      !reservationData.email ||
      !reservationData.phone
    ) {
      alert("Por favor, completa todos los campos.");
      return;
    }

    if (!results || !selectedUnitId) {
      alert(
        "Error: No se encontraron los datos de cálculo. Por favor, recalcula antes de reservar."
      );
      return;
    }

    setSubmittingReservation(true);

    try {
      // Prepare reservation data according to the Reservation model
      const reservationPayload = {
        name: reservationData.name,
        email: reservationData.email,
        phone: reservationData.phone,
        unitId: selectedUnitId,
        initialPayment: parseFloat(pagoAdelantado),
        monthsAmount: parseInt(cantidadMeses),
        monthlyPayment: results.monthlyPayment,
        totalPayment: results.totalAmount,
      };

      console.log("Sending reservation data:", reservationPayload);

      // Send reservation to the project-specific API endpoint
      const response = await fetch(`/api/projects/${projectId}/reservations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reservationPayload),
      });

      const data = await response.json();

      if (data.success) {
        alert(
          "¡Consulta creada exitosamente! Un agente comercial se pondrá en contacto contigo pronto. ID: " +
            data.reservation._id
        );
        setShowReserveModal(false);
        setReservationData({ name: "", email: "", phone: "" });
        // Refresh units to reflect any status changes
        fetchUnits();
      } else {
        throw new Error(data.error || "Error al crear la reserva");
      }
    } catch (error) {
      console.error("Error submitting reservation:", error);
      alert(
        "Error al enviar la reserva: " +
          (error.message || "Por favor, inténtalo de nuevo.")
      );
    } finally {
      setSubmittingReservation(false);
    }
  };

  // Close modal
  const closeModal = () => {
    setShowReserveModal(false);
    setReservationData({ name: "", email: "", phone: "" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Calculadora de Pagos de Unidades
          </h1>
          {project && (
            <div className="text-lg text-gray-600 mb-2">
              Proyecto: <span className="font-semibold">{project.name}</span>
              {project.location && (
                <span className="text-gray-500"> - {project.location}</span>
              )}
            </div>
          )}
          <p className="text-gray-600">
            Calcula tus pagos mensuales y costos totales
          </p>
        </div>

        {loading && (
          <div className="text-center text-gray-600 mb-8">
            Cargando unidades del proyecto...
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-800">{error}</p>
            <button
              onClick={fetchUnits}
              className="mt-2 text-sm text-red-600 hover:underline"
            >
              Intentar de nuevo
            </button>
          </div>
        )}

        {!loading && units.length === 0 && !error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
            <p className="text-yellow-800">
              No hay unidades disponibles para este proyecto.
            </p>
          </div>
        )}

        {!loading && stats.total > 0 && (
          <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Estadísticas del Proyecto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.total}
                </div>
                <div className="text-sm text-gray-600">Unidades Totales</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.available}
                </div>
                <div className="text-sm text-gray-600">Disponibles</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {stats.sold}
                </div>
                <div className="text-sm text-gray-600">Vendidas</div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white shadow-xl rounded-2xl p-8 mb-8">
          <form className="space-y-6">
            {/* Unit Selection */}
            <div>
              <label
                htmlFor="unit-selection"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Seleccionar Unidad
              </label>
              <select
                id="unit-selection"
                name="unit-selection"
                value={selectedUnitId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value="">Selecciona una unidad...</option>
                {units
                  .filter((unit) => unit.available)
                  .map((unit, index) => (
                    <option key={unit._id} value={unit._id}>
                      Unidad #{index + 1} - {unit.size} - $
                      {unit.price.toLocaleString()}
                      {unit.location && ` - ${unit.location}`}
                    </option>
                  ))}
              </select>
              {selectedUnitId && getSelectedUnit() && (
                <div className="mt-2 text-sm text-gray-600">
                  💰 Precio de la unidad seleccionada: $
                  {getSelectedUnit().price.toLocaleString()}
                  <div className="text-gray-500">
                    {getSelectedUnit().description}
                  </div>
                </div>
              )}
            </div>

            {/* Down Payment */}
            <div>
              <label
                htmlFor="pago-adelantado"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Pago Inicial ($)
              </label>
              <input
                type="number"
                id="pago-adelantado"
                name="pago-adelantado"
                min="0"
                value={pagoAdelantado}
                onChange={handleInputChange}
                placeholder="Ingresa el monto del pago inicial"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
              {selectedUnitId && getSelectedUnit() && pagoAdelantado ? (
                <div className="mt-2 text-sm text-gray-600">
                  💳 Saldo restante: $
                  {(getSelectedUnit().price - pagoAdelantado).toLocaleString()}
                </div>
              ) : null}
            </div>

            {/* Number of Months */}
            <div>
              <label
                htmlFor="cantidad-meses"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Número de Meses
              </label>
              <input
                type="number"
                id="cantidad-meses"
                name="cantidad-meses"
                min="1"
                value={cantidadMeses}
                onChange={handleInputChange}
                placeholder="Ingresa el número de meses a pagar"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
              {cantidadMeses && calculatedInterestRate !== null && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-blue-800">
                    📊 <strong>Tasa de interés automática:</strong>{" "}
                    {calculatedInterestRate}% anual
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    {parseInt(cantidadMeses) <= 12 && "Tasa baja (1-12 meses)"}
                    {parseInt(cantidadMeses) > 12 &&
                      parseInt(cantidadMeses) <= 16 &&
                      "Tasa media (13-16 meses)"}
                    {parseInt(cantidadMeses) > 16 && "Tasa alta (17+ meses)"}
                  </div>
                </div>
              )}
              {cantidadMeses &&
                calculatedInterestRate === null &&
                project &&
                !project.interestRates && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="text-sm text-yellow-800">
                      ⚠️ <strong>Tasas de interés no configuradas</strong>
                    </div>
                    <div className="text-xs text-yellow-600 mt-1">
                      El administrador debe configurar las tasas de interés para
                      este proyecto.
                    </div>
                  </div>
                )}
            </div>
          </form>
        </div>

        {/* Validation Errors */}
        {validationError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error en los datos ingresados
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {validationError}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="bg-white shadow-xl rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Resumen de Pagos
            </h2>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Unidad Seleccionada
              </h3>
              <p className="text-gray-600">
                Unidad {results.selectedUnit.size} -{" "}
                {results.selectedUnit.description}
              </p>
            </div>
            <div className="mb-4 p-4 bg-indigo-50 rounded-lg">
              <h3 className="text-lg font-semibold text-indigo-800 mb-2">
                Tasa de Interés Aplicada
              </h3>
              <p className="text-xl font-bold text-indigo-900">
                {results.appliedInterestRate}% anual
              </p>
              <p className="text-sm text-indigo-600">
                Calculada automáticamente según {cantidadMeses} meses de pago
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">
                  Precio de la Unidad
                </h3>
                <p className="text-2xl font-bold text-blue-900">
                  ${results.unitPrice.toLocaleString()}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  Pago Mensual
                </h3>
                <p className="text-2xl font-bold text-green-900">
                  $
                  {results.monthlyPayment.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                  Interés Total
                </h3>
                <p className="text-2xl font-bold text-yellow-900">
                  $
                  {results.totalInterest.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-purple-800 mb-2">
                  Monto Total
                </h3>
                <p className="text-2xl font-bold text-purple-900">
                  $
                  {results.totalAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Reserve Button */}
        {results && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowReserveModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors duration-200 shadow-lg"
            >
              🏠 Consultar Esta Unidad
            </button>
            <p className="mt-2 text-sm text-gray-600">
              Completa tus datos para consultar esta unidad
            </p>
          </div>
        )}
      </div>

      {/* Reservation Modal */}
      {showReserveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Consultar Unidad
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* Selected Unit Info */}
              {results && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    Unidad Seleccionada
                  </h3>
                  <p className="text-blue-800">
                    {results.selectedUnit.size} -{" "}
                    {results.selectedUnit.description}
                  </p>
                  <p className="text-blue-800 font-bold">
                    Precio: ${results.unitPrice.toLocaleString()}
                  </p>
                  <p className="text-blue-800">
                    Pago mensual: $
                    {results.monthlyPayment.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              )}

              {/* Reservation Form */}
              <form onSubmit={handleReservationSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={reservationData.name}
                    onChange={handleReservationInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                    placeholder="Tu nombre completo"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Correo Electrónico *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={reservationData.email}
                    onChange={handleReservationInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                    placeholder="tu@email.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={reservationData.phone}
                    onChange={handleReservationInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                    placeholder="Tu número de teléfono"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReservation}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingReservation ? "Enviando..." : "Enviar Reserva"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
