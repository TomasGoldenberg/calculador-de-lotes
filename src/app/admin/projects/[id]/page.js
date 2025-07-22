"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function ProjectDetails() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id;

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Unit categories state
  const [unitCategories, setUnitCategories] = useState({
    small: "",
    medium: "",
    big: "",
  });
  const [unitPrices, setUnitPrices] = useState({
    small: "",
    medium: "",
    big: "",
  });
  // Interest rates state
  const [interestRates, setInterestRates] = useState({
    lowRate: "",
    mediumRate: "",
    highRate: "",
  });
  const [ratesSaving, setRatesSaving] = useState(false);
  const [hasExistingUnits, setHasExistingUnits] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Fetch project details
  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/projects");
      const data = await response.json();

      if (data.success) {
        const foundProject = data.projects.find((p) => p._id === projectId);
        if (foundProject) {
          setProject(foundProject);
          // Set interest rates if they exist
          if (foundProject.interestRates) {
            setInterestRates({
              lowRate: foundProject.interestRates.lowRate?.toString() || "",
              mediumRate:
                foundProject.interestRates.mediumRate?.toString() || "",
              highRate: foundProject.interestRates.highRate?.toString() || "",
            });
          }
          setError(null);

          // Fetch existing units to prepopulate the form
          await fetchExistingUnits();
        } else {
          setError("Project not found");
        }
      } else {
        setError("Failed to fetch project");
      }
    } catch (err) {
      setError("Error connecting to server");
      console.error("Error fetching project:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch existing units for this project
  const fetchExistingUnits = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/units`);
      const data = await response.json();

      if (data.success && data.units.length > 0) {
        // Group units by size and extract prices
        const unitsBySize = {
          small: data.units.filter((unit) => unit.size === "small"),
          medium: data.units.filter((unit) => unit.size === "medium"),
          big: data.units.filter((unit) => unit.size === "big"),
        };

        // Prepopulate unit categories (counts)
        setUnitCategories({
          small: unitsBySize.small.length.toString(),
          medium: unitsBySize.medium.length.toString(),
          big: unitsBySize.big.length.toString(),
        });

        // Prepopulate unit prices (take the first unit's price for each category)
        setUnitPrices({
          small:
            unitsBySize.small.length > 0
              ? unitsBySize.small[0].price.toString()
              : "",
          medium:
            unitsBySize.medium.length > 0
              ? unitsBySize.medium[0].price.toString()
              : "",
          big:
            unitsBySize.big.length > 0
              ? unitsBySize.big[0].price.toString()
              : "",
        });

        // Mark that we have existing units
        setHasExistingUnits(true);
      }
    } catch (err) {
      console.log("No existing units found or error fetching units:", err);
      // This is not a critical error, so we don't set the error state
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name.startsWith("price_")) {
      const category = name.replace("price_", "");
      setUnitPrices((prev) => ({
        ...prev,
        [category]: value,
      }));

      // Clear error for this field when user starts typing
      if (formErrors[name]) {
        setFormErrors((prev) => ({
          ...prev,
          [name]: "",
        }));
      }
    } else if (name.startsWith("rate_")) {
      const rateType = name.replace("rate_", "");
      setInterestRates((prev) => ({
        ...prev,
        [rateType]: value,
      }));

      // Clear error for this field when user starts typing
      if (formErrors[name]) {
        setFormErrors((prev) => ({
          ...prev,
          [name]: "",
        }));
      }
    } else {
      setUnitCategories((prev) => ({
        ...prev,
        [name]: value,
      }));

      // Clear error for this field when user starts typing
      if (formErrors[name]) {
        setFormErrors((prev) => ({
          ...prev,
          [name]: "",
        }));
      }
    }
  };

  // Calculate total units from categories
  const getTotalUnitsFromCategories = () => {
    const small = parseInt(unitCategories.small) || 0;
    const medium = parseInt(unitCategories.medium) || 0;
    const big = parseInt(unitCategories.big) || 0;
    return small + medium + big;
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    const small = parseInt(unitCategories.small) || 0;
    const medium = parseInt(unitCategories.medium) || 0;
    const big = parseInt(unitCategories.big) || 0;
    const total = small + medium + big;

    // Check individual unit values
    if (unitCategories.small !== "" && (isNaN(small) || small < 0)) {
      errors.small = "Must be a positive number";
    }
    if (unitCategories.medium !== "" && (isNaN(medium) || medium < 0)) {
      errors.medium = "Must be a positive number";
    }
    if (unitCategories.big !== "" && (isNaN(big) || big < 0)) {
      errors.big = "Must be a positive number";
    }

    // Check price values
    const smallPrice = parseFloat(unitPrices.small) || 0;
    const mediumPrice = parseFloat(unitPrices.medium) || 0;
    const bigPrice = parseFloat(unitPrices.big) || 0;

    if (unitPrices.small !== "" && (isNaN(smallPrice) || smallPrice < 0)) {
      errors.price_small = "Price must be a positive number";
    }
    if (unitPrices.medium !== "" && (isNaN(mediumPrice) || mediumPrice < 0)) {
      errors.price_medium = "Price must be a positive number";
    }
    if (unitPrices.big !== "" && (isNaN(bigPrice) || bigPrice < 0)) {
      errors.price_big = "Price must be a positive number";
    }

    // Check if units are entered without prices
    if (small > 0 && !unitPrices.small) {
      errors.price_small = "Price is required when units are specified";
    }
    if (medium > 0 && !unitPrices.medium) {
      errors.price_medium = "Price is required when units are specified";
    }
    if (big > 0 && !unitPrices.big) {
      errors.price_big = "Price is required when units are specified";
    }

    // Check total against project unit count
    if (total > project?.unitCount) {
      errors.total = `Total units (${total}) cannot exceed project capacity (${project?.unitCount})`;
    }

    // Check if at least one category has a value
    if (total === 0) {
      errors.total = "Please enter at least one unit in any category";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle saving interest rates
  const handleSaveRates = async (e) => {
    e.preventDefault();

    setRatesSaving(true);
    try {
      const response = await fetch("/api/projects", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: projectId,
          interestRates: {
            lowRate: parseFloat(interestRates.lowRate) || 8.0,
            mediumRate: parseFloat(interestRates.mediumRate) || 12.0,
            highRate: parseFloat(interestRates.highRate) || 16.0,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setProject(data.project);
        alert("Interest rates updated successfully!");
      } else {
        setError(data.error || "Failed to update interest rates");
      }
    } catch (err) {
      setError("Error updating interest rates");
      console.error("Error updating interest rates:", err);
    } finally {
      setRatesSaving(false);
    }
  };

  // Handle form submission
  const handleSave = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Create individual Units for each unit
    setSaving(true);
    try {
      const configurationData = {
        unitDistribution: {
          small: {
            count: parseInt(unitCategories.small) || 0,
            price: parseFloat(unitPrices.small) || 0,
          },
          medium: {
            count: parseInt(unitCategories.medium) || 0,
            price: parseFloat(unitPrices.medium) || 0,
          },
          big: {
            count: parseInt(unitCategories.big) || 0,
            price: parseFloat(unitPrices.big) || 0,
          },
        },
      };

      console.log("Creating units for project:", configurationData);

      // Call API to create units
      const response = await fetch(`/api/projects/${projectId}/units`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(configurationData),
      });

      const data = await response.json();

      if (data.success) {
        const action = hasExistingUnits ? "updated" : "created";
        alert(
          `Successfully ${action} ${data.unitsCreated} units!\n\nDistribution:\n- Small: ${data.distribution.small} units\n- Medium: ${data.distribution.medium} units\n- Big: ${data.distribution.big} units`
        );
        router.push("/admin/projects");
      } else {
        setError(data.error || "Failed to create units");
      }
    } catch (err) {
      setError("Error creating units");
      console.error("Error creating units:", err);
    } finally {
      setSaving(false);
    }
  };

  // Load project on component mount
  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 dark:text-gray-400 mt-4">
                Loading project details...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-8 text-center">
            <h1 className="text-2xl font-bold text-red-800 dark:text-red-300 mb-4">
              {error || "Project not found"}
            </h1>
            <button
              onClick={() => router.push("/admin/projects")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Back to Projects
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalUnitsFromCategories = getTotalUnitsFromCategories();
  const remainingUnits = project.unitCount - totalUnitsFromCategories;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/admin/projects")}
            className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-4 transition-colors"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Projects
          </button>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {project.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Configure unit distribution by size category
            </p>
            <div className="flex justify-center items-center space-x-6 text-sm">
              <div className="flex items-center">
                <svg
                  className="w-4 h-4 mr-2 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-gray-600 dark:text-gray-400">
                  {project.location}
                </span>
              </div>
              <div className="flex items-center">
                <svg
                  className="w-4 h-4 mr-2 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V7zm0 0V5a2 2 0 012-2h6l2 2h6a2 2 0 012 2v2M7 13h10l-4-8H7l4 8z"
                  />
                </svg>
                <span className="text-gray-600 dark:text-gray-400">
                  {project.unitCount} total units
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {totalUnitsFromCategories}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Units Assigned
              </div>
            </div>
            <div className="text-center">
              <div
                className={`text-2xl font-bold ${
                  remainingUnits >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {remainingUnits}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Remaining Units
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {project.unitCount}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Capacity
              </div>
            </div>
          </div>
        </div>

        {/* Interest Rates Configuration */}
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Interest Rate Configuration
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Set different interest rates based on payment terms:
            <br />• <strong>Low Rate:</strong> 1-12 months
            <br />• <strong>Medium Rate:</strong> 13-16 months
            <br />• <strong>High Rate:</strong> 17+ months
          </p>

          <form onSubmit={handleSaveRates} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Low Rate */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg mr-3">
                    <svg
                      className="w-6 h-6 text-green-600 dark:text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">
                      Low Rate
                    </h3>
                    <p className="text-green-600 dark:text-green-400 text-sm">
                      1-12 months
                    </p>
                  </div>
                </div>
                <label className="block text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                  Annual Interest Rate (%)
                </label>
                <input
                  type="number"
                  name="rate_lowRate"
                  value={interestRates.lowRate}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., 8.0"
                />
              </div>

              {/* Medium Rate */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg mr-3">
                    <svg
                      className="w-6 h-6 text-yellow-600 dark:text-yellow-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300">
                      Medium Rate
                    </h3>
                    <p className="text-yellow-600 dark:text-yellow-400 text-sm">
                      13-16 months
                    </p>
                  </div>
                </div>
                <label className="block text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">
                  Annual Interest Rate (%)
                </label>
                <input
                  type="number"
                  name="rate_mediumRate"
                  value={interestRates.mediumRate}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="e.g., 12.0"
                />
              </div>

              {/* High Rate */}
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg mr-3">
                    <svg
                      className="w-6 h-6 text-red-600 dark:text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-red-800 dark:text-red-300">
                      High Rate
                    </h3>
                    <p className="text-red-600 dark:text-red-400 text-sm">
                      17+ months
                    </p>
                  </div>
                </div>
                <label className="block text-sm font-medium text-red-800 dark:text-red-300 mb-2">
                  Annual Interest Rate (%)
                </label>
                <input
                  type="number"
                  name="rate_highRate"
                  value={interestRates.highRate}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  step="0.1"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g., 16.0"
                />
              </div>
            </div>

            {/* Save Rates Button */}
            <div className="flex justify-end pt-6">
              <button
                type="submit"
                disabled={ratesSaving}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {ratesSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Saving Rates...
                  </>
                ) : (
                  "Save Interest Rates"
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Unit Categories Form */}
        <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Unit Size Distribution
          </h2>

          {hasExistingUnits && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    Existing Configuration Loaded
                  </h3>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    The form has been prepopulated with your current unit
                    distribution. Make changes as needed and save to update.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* Small Units */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg mr-3">
                  <svg
                    className="w-6 h-6 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V7zm0 0V5a2 2 0 012-2h6l2 2h6a2 2 0 012 2v2"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300">
                    Small Units
                  </h3>
                  <p className="text-blue-600 dark:text-blue-400 text-sm">
                    Compact living spaces
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                    Number of Units
                  </label>
                  <input
                    type="number"
                    name="small"
                    value={unitCategories.small}
                    onChange={handleInputChange}
                    min="0"
                    className={`w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.small ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter number of units"
                  />
                  {formErrors.small && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors.small}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                    Price per Unit ($)
                  </label>
                  <input
                    type="number"
                    name="price_small"
                    value={unitPrices.small}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className={`w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.price_small
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    placeholder="Enter price per unit"
                  />
                  {formErrors.price_small && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors.price_small}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Medium Units */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg mr-3">
                  <svg
                    className="w-6 h-6 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H9m0 0H5m0 0h2"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">
                    Medium Units
                  </h3>
                  <p className="text-green-600 dark:text-green-400 text-sm">
                    Standard family homes
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                    Number of Units
                  </label>
                  <input
                    type="number"
                    name="medium"
                    value={unitCategories.medium}
                    onChange={handleInputChange}
                    min="0"
                    className={`w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      formErrors.medium ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter number of units"
                  />
                  {formErrors.medium && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors.medium}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                    Price per Unit ($)
                  </label>
                  <input
                    type="number"
                    name="price_medium"
                    value={unitPrices.medium}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className={`w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      formErrors.price_medium
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    placeholder="Enter price per unit"
                  />
                  {formErrors.price_medium && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors.price_medium}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Big Units */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg mr-3">
                  <svg
                    className="w-6 h-6 text-purple-600 dark:text-purple-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-300">
                    Big Units
                  </h3>
                  <p className="text-purple-600 dark:text-purple-400 text-sm">
                    Luxury spacious units
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-purple-800 dark:text-purple-300 mb-2">
                    Number of Units
                  </label>
                  <input
                    type="number"
                    name="big"
                    value={unitCategories.big}
                    onChange={handleInputChange}
                    min="0"
                    className={`w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      formErrors.big ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter number of units"
                  />
                  {formErrors.big && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors.big}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-800 dark:text-purple-300 mb-2">
                    Price per Unit ($)
                  </label>
                  <input
                    type="number"
                    name="price_big"
                    value={unitPrices.big}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    className={`w-full px-4 py-3 border rounded-lg dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      formErrors.price_big
                        ? "border-red-500"
                        : "border-gray-300"
                    }`}
                    placeholder="Enter price per unit"
                  />
                  {formErrors.price_big && (
                    <p className="text-red-500 text-sm mt-1">
                      {formErrors.price_big}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Total Error */}
            {formErrors.total && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-red-800 dark:text-red-300">
                  {formErrors.total}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                type="button"
                onClick={() => router.push("/admin/projects")}
                className="flex-1 px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {hasExistingUnits
                      ? "Updating Units..."
                      : "Creating Units..."}
                  </>
                ) : hasExistingUnits ? (
                  "Update Units"
                ) : (
                  "Create Units"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
