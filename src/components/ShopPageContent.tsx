import {
  ProductGrid,
  ProductGridWrapper,
} from "../components";

import { useState, useEffect } from "react";

const ShopPageContent = ({ category, page } : { category: string; page: number; }) => {
  const [sortCriteria, setSortCriteria] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(page);
  const [activeSection, setActiveSection] = useState<string>("for-sale-section");
  const [filters, setFilters] = useState<{ sizes: string[]; types: string[] }>({
    sizes: [],
    types: []
  });
  const [showFilters, setShowFilters] = useState(false);

  const sizes = ["XS", "S", "M", "L", "XL", "XXL"];
  const types = ["T-Shirt", "Hoodie", "Sweater", "Jacket", "Pants", "Shorts", "Dress", "Skirt"];

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleFilterChange = (newFilters: { sizes: string[]; types: string[] }) => {
    setFilters(newFilters);
  };

  const toggleSize = (size: string) => {
    const newSizes = filters.sizes.includes(size)
      ? filters.sizes.filter(s => s !== size)
      : [...filters.sizes, size];
    
    setFilters({ sizes: newSizes, types: filters.types });
  };

  const toggleType = (type: string) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type];
    
    setFilters({ sizes: filters.sizes, types: newTypes });
  };

  const clearFilters = () => {
    setFilters({ sizes: [], types: [] });
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = ['for-sale-section', 'sold-section', 'not-for-sale-section'];
      
      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 200 && rect.bottom >= 200) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="max-w-screen-2xl mx-auto px-5 max-[400px]:px-3">
      {/* Jump Navigation with Filter and Sort */}
      <div className="sticky top-0 bg-[#d7d7d7] z-10 py-4">
        <div className="flex justify-between items-center border-b border-gray-300 pb-4 max-lg:flex-col max-lg:gap-4">
          
          {/* Filter on Left */}
          <div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="border border-[rgba(0,0,0,0.40)] px-4 py-2 hover:bg-[#9e9f96] transition-colors"
            >
              Filters {(filters.sizes.length > 0 || filters.types.length > 0) && 
                `(${filters.sizes.length + filters.types.length})`}
            </button>
          </div>

          {/* Center Navigation Buttons */}
          <div className="flex gap-4 max-sm:gap-2 max-sm:text-sm">
            <button
              onClick={() => scrollToSection('for-sale-section')}
              className={`pb-2 px-4 font-medium transition-colors ${
                activeSection === 'for-sale-section'
                  ? 'text-black border-b-2 border-black'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              For Sale
            </button>
            <button
              onClick={() => scrollToSection('sold-section')}
              className={`pb-2 px-4 font-medium transition-colors ${
                activeSection === 'sold-section'
                  ? 'text-black border-b-2 border-black'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sold
            </button>
            <button
              onClick={() => scrollToSection('not-for-sale-section')}
              className={`pb-2 px-4 font-medium transition-colors ${
                activeSection === 'not-for-sale-section'
                  ? 'text-black border-b-2 border-black'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Not For Sale
            </button>
          </div>

          {/* Sort on Right */}
<div className="flex gap-3 items-center max-sm:text-sm">
  <p>Sort by:</p>
  <select
    className="border border-[rgba(0,0,0,0.40)] px-2 py-1 bg-[#d7d7d7] hover:bg-[#9e9f96] transition-colors"
    style={{
      backgroundImage: 'none',
    }}
    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
      setSortCriteria(e.target.value)
    }
    value={sortCriteria}
  >
    <option className="bg-[#d7d7d7] text-black" value="default">default</option>
    <option className="bg-[#d7d7d7] text-black" value="price-asc">price: low to high</option>
    <option className="bg-[#d7d7d7] text-black" value="price-desc">price: high to low</option>
  </select>
</div>
        </div>
      </div>

      {/* Expandable Filter Panel */}
      {showFilters && (
        <div className="mt-4 p-4 border border-gray-300 text-[#3a3d1c] rounded-md bg-white/40 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Filter Products</h3>
            {(filters.sizes.length > 0 || filters.types.length > 0) && (
              <button
                onClick={clearFilters}
                className="text-sm text-[#3a3d1c] hover:text-[#3a3d1c] transition-colors underline"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Size Filter */}
          <div className="mb-6 text-[#3a3d1c]">
            <h4 className="font-medium mb-3">Size</h4>
            <div className="flex flex-wrap gap-2">
              {sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => toggleSize(size)}
                  className={`px-4 py-2 border rounded-md transition-colors ${
                    filters.sizes.includes(size)
                      ? "bg-[#3a3d1c] text-white/90 border-[#3a3d1c]"
                      : "bg-white/30 text-[#3a3d1c] border-gray-300 hover:border-[#3a3d1c]"
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <h4 className="font-medium mb-3 text-[#3a3d1c]">Type</h4>
            <div className="flex flex-wrap gap-2">
              {types.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`text-[#3a3d1c] px-4 py-2 border rounded-md transition-colors ${
                    filters.types.includes(type)
                      ? "bg-[#3a3d1c] text-white/90 border-[#3a3d1c]"
                      : "bg-white/30 text-[#3a3d1c] border-gray-300 hover:border-[#3a3d1c]"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* For Sale Section */}
      <section id="for-sale-section" className="mb-16 scroll-mt-24 border-b-2 border-dashed  border-[#9e9f96]">
        <h2 className="text-xl  mb-6 text-center">for sale</h2>
        <ProductGridWrapper 
          sortCriteria={sortCriteria} 
          category={category} 
          page={currentPage}
          status="for-sale"
          filters={filters}
        >
          <ProductGrid emptyMessage="no items right now, check back in later alrighty? >3" />
        </ProductGridWrapper>
      </section>

      {/* Sold Section */}
      <section id="sold-section" className="mb-16 scroll-mt-24 border-b-2 border-dashed  border-[#9e9f96]">
        <h2 className="text-xl mb-6 text-center ">s<svg 
  className="inline-block w-[0.8em] h-[0.8em] mx-1 fill-current align-middle -translate-x-[0.03em] -translate-y-[0.1em]" 
  viewBox="0 0 600 579"
  xmlns="http://www.w3.org/2000/svg"
>
  <path transform="translate(0,579) scale(0.1,-0.1)" d="M2846 5755 c-11 -8 -27 -15 -36 -15 -20 0 -80 -55 -80 -73 0 -8 -12 -36 -26 -61 -15 -26 -24 -50 -21 -53 3 -3 -2 -28 -13 -57 -30 -82 -70 -218 -70 -236 0 -9 -4 -20 -8 -26 -5 -5 -14 -34 -21 -64 -7 -30 -19 -65 -27 -77 -8 -12 -14 -32 -14 -43 0 -11 -4 -28 -10 -38 -5 -9 -16 -48 -26 -87 -9 -38 -20 -75 -25 -81 -5 -6 -10 -30 -12 -52 -1 -23 -6 -44 -10 -48 -4 -4 -7 -15 -7 -25 0 -16 -24 -104 -40 -144 -4 -11 -14 -47 -21 -80 -7 -33 -18 -71 -25 -85 -6 -14 -17 -52 -24 -85 -6 -33 -16 -68 -21 -77 -5 -10 -9 -29 -9 -42 0 -13 -7 -37 -15 -52 -8 -16 -15 -39 -15 -51 0 -12 -6 -37 -14 -55 -8 -18 -27 -76 -41 -128 -14 -52 -31 -100 -37 -108 -21 -25 -89 -53 -141 -58 -29 -3 -63 -10 -77 -14 -14 -5 -43 -12 -65 -15 -22 -3 -56 -10 -75 -15 -87 -22 -337 -47 -565 -56 -71 -3 -148 -9 -170 -15 -22 -6 -112 -19 -200 -29 -88 -10 -180 -23 -205 -29 -93 -20 -207 -43 -257 -51 -28 -4 -57 -11 -63 -15 -6 -4 -60 -7 -119 -6 l-108 1 -51 -48 c-44 -40 -53 -54 -60 -99 -8 -46 -6 -71 14 -180 6 -32 70 -69 131 -78 61 -8 203 -92 289 -170 55 -50 67 -59 124 -93 30 -18 69 -47 85 -63 32 -32 129 -99 143 -99 5 0 21 -11 35 -24 14 -13 71 -47 126 -74 54 -27 114 -61 132 -75 19 -13 54 -35 79 -47 25 -12 74 -43 109 -67 36 -25 75 -49 88 -54 13 -5 23 -13 23 -18 0 -5 25 -22 56 -37 32 -15 69 -37 83 -49 14 -11 43 -29 64 -40 51 -26 117 -83 117 -100 0 -8 12 -26 26 -42 24 -26 25 -32 19 -98 -3 -38 -10 -93 -16 -120 -5 -28 -11 -66 -13 -85 -7 -55 -56 -283 -66 -305 -6 -11 -9 -29 -9 -40 0 -11 -6 -60 -15 -110 -8 -49 -18 -114 -21 -143 -4 -29 -13 -76 -21 -105 -8 -29 -19 -89 -24 -134 -4 -45 -13 -97 -18 -115 -6 -18 -13 -69 -17 -113 -3 -44 -15 -136 -26 -205 -11 -69 -23 -145 -26 -170 -3 -25 -14 -57 -24 -72 -11 -14 -19 -39 -19 -54 0 -42 37 -109 77 -140 30 -23 45 -27 102 -27 86 -1 134 18 191 74 26 26 58 50 71 54 24 8 169 145 169 162 1 4 43 42 94 83 52 41 98 82 102 91 11 19 163 154 220 195 91 64 140 101 190 144 29 25 76 63 105 85 29 22 92 75 140 118 48 42 92 77 97 77 5 0 15 13 22 30 17 41 55 63 94 56 17 -4 43 -6 57 -6 15 0 32 -7 39 -15 7 -8 17 -15 22 -15 5 0 35 -18 65 -40 31 -22 61 -40 67 -40 7 0 26 -13 44 -29 17 -16 40 -32 51 -36 11 -3 25 -12 31 -20 7 -8 22 -15 34 -15 12 0 35 -13 51 -30 16 -16 33 -30 38 -30 5 0 26 -13 46 -28 20 -16 43 -31 52 -35 10 -3 48 -28 86 -55 38 -27 91 -62 118 -77 27 -15 54 -33 60 -40 5 -8 24 -22 42 -32 17 -10 57 -34 89 -53 31 -19 65 -40 75 -46 11 -6 27 -17 36 -25 16 -13 39 -25 83 -43 50 -21 177 -106 186 -125 7 -13 41 -39 75 -59 53 -29 74 -35 124 -35 38 -1 69 5 85 15 14 9 37 18 52 22 48 11 85 61 91 125 3 31 9 72 12 91 5 28 1 43 -19 73 -14 21 -26 45 -26 54 0 9 -7 24 -16 34 -8 9 -22 47 -29 84 -8 37 -18 72 -23 79 -5 6 -12 25 -15 41 -15 77 -39 171 -57 223 -11 31 -22 71 -24 87 -6 41 -53 235 -76 315 -22 75 -43 172 -60 280 -7 41 -17 90 -22 109 -6 18 -11 80 -11 137 0 82 3 108 16 122 10 10 13 23 8 31 -9 13 20 85 39 96 6 4 21 23 34 43 13 21 61 75 107 120 373 371 651 642 658 642 6 0 13 9 16 21 4 11 22 27 41 35 19 8 34 19 34 24 0 6 7 10 15 10 9 0 27 11 40 24 12 13 39 33 59 45 20 12 44 33 55 47 10 13 23 24 27 24 5 1 27 19 49 40 22 22 55 47 75 57 35 19 66 50 104 106 18 26 22 45 20 92 -4 82 -9 102 -41 147 -33 48 -48 57 -124 69 -53 8 -66 7 -122 -15 -34 -14 -80 -25 -102 -25 -22 0 -310 -2 -640 -4 -330 -2 -640 -7 -690 -11 -121 -9 -278 19 -283 51 -2 11 -14 31 -28 44 -13 12 -24 28 -24 35 0 6 -7 18 -16 25 -9 7 -20 22 -25 34 -14 29 -33 61 -48 78 -7 9 -10 21 -7 26 4 6 -2 15 -12 20 -11 6 -22 23 -25 39 -3 16 -21 49 -40 74 -19 25 -40 61 -46 80 -6 20 -21 44 -31 53 -11 10 -20 24 -20 30 0 7 -20 49 -45 94 -25 45 -45 84 -45 87 0 6 -70 156 -102 219 -98 193 -128 253 -128 258 0 3 -18 45 -41 94 -23 48 -55 117 -71 153 -16 36 -47 100 -69 142 -48 96 -73 165 -70 201 1 15 -3 27 -9 27 -5 0 -10 15 -10 34 0 41 -31 83 -68 90 -80 15 -108 15 -126 1z"/>
</svg>ld</h2>
        <ProductGridWrapper 
          sortCriteria={sortCriteria} 
          category={category} 
          page={currentPage}
          status="sold"
          filters={filters}
        >
          <ProductGrid emptyMessage="nothing's been sold :(" />
        </ProductGridWrapper>
      </section>

      {/* Not For Sale Section */}
      <section id="not-for-sale-section" className="mb-16 scroll-mt-24">
        <h2 className="text-xl  mb-6 text-center">gallery</h2>
        <ProductGridWrapper 
          sortCriteria={sortCriteria} 
          category={category} 
          page={currentPage}
          status="not-for-sale"
          filters={filters}
        >
          <ProductGrid emptyMessage="No items in this section match your filters." />
        </ProductGridWrapper>
      </section>
    </div>
  );
};

export default ShopPageContent;