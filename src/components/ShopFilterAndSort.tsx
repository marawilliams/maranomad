import { useState } from "react";

const ShopFilterAndSort = ({
  sortCriteria,
  setSortCriteria,
  onFilterChange,
}: {
  sortCriteria: string;
  setSortCriteria: (value: string) => void;
  onFilterChange: (filters: { sizes: string[]; types: string[] }) => void;
}) => {
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const sizes = ["XS", "S", "M", "L", "XL", "XXL"];
  const types = ["T-Shirt", "Hoodie", "Sweater", "Jacket", "Pants", "Shorts", "Dress", "Skirt"];

  const toggleSize = (size: string) => {
    const newSizes = selectedSizes.includes(size)
      ? selectedSizes.filter(s => s !== size)
      : [...selectedSizes, size];
    
    setSelectedSizes(newSizes);
    onFilterChange({ sizes: newSizes, types: selectedTypes });
  };

  const toggleType = (type: string) => {
    const newTypes = selectedTypes.includes(type)
      ? selectedTypes.filter(t => t !== type)
      : [...selectedTypes, type];
    
    setSelectedTypes(newTypes);
    onFilterChange({ sizes: selectedSizes, types: newTypes });
  };

  const clearFilters = () => {
    setSelectedSizes([]);
    setSelectedTypes([]);
    onFilterChange({ sizes: [], types: [] });
  };

  return (
    <div className="px-5 mb-6">
      <div className="flex justify-between items-center max-sm:flex-col max-sm:gap-5">
        {/* Filter Toggle Button */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="border border-[rgba(0,0,0,0.40)] px-4 py-2 hover:bg-gray-100 transition-colors"
        >
          Filters {(selectedSizes.length > 0 || selectedTypes.length > 0) && 
            `(${selectedSizes.length + selectedTypes.length})`}
        </button>

        {/* Sort Dropdown */}
        <div className="flex gap-3 items-center ml-auto max-sm:ml-0">
          <p>Sort by:</p>
          <div className="relative">
            <select
              className="border border-[rgba(0,0,0,0.40)] px-2 py-1"
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setSortCriteria(e.target.value)
              }
              value={sortCriteria}
            >
              <option value="default">default</option>
              <option value="price-asc">price: low to high</option>
              <option value="price-desc">price: high to low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expandable Filter Panel */}
      {showFilters && (
        <div className="mt-4 p-4 border border-gray-300 rounded-md bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Filter Products</h3>
            {(selectedSizes.length > 0 || selectedTypes.length > 0) && (
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-black transition-colors underline"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Size Filter */}
          <div className="mb-6">
            <h4 className="font-medium mb-3">Size</h4>
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => toggleSize(size)}
                  className={`px-4 py-2 border rounded-md transition-colors ${
                    selectedSizes.includes(size)
                      ? "bg-[#09140d] text-white border-[#09140d]"
                      : "bg-white text-black border-gray-300 hover:border-[#09140d]"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <h4 className="font-medium mb-3">Type</h4>
            <div className="flex flex-wrap gap-2">
              {types.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`px-4 py-2 border rounded-md transition-colors ${
                    selectedTypes.includes(type)
                      ? "bg-[#09140d] text-white border-[#09140d]"
                      : "bg-white text-black border-gray-300 hover:border-[#09140d]"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopFilterAndSort;