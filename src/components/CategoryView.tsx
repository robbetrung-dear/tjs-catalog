import React, { useState, useMemo } from 'react';
import {
  Layers,
  ArrowRight,
  Search,
  ArrowUpDown,
  X,
  RotateCcw,
  Sparkles,
  Package,
} from 'lucide-react';
import { useCatalog } from '../context/CatalogContext';

type CategorySortOption = 'count-desc' | 'count-asc' | 'name-asc' | 'name-desc';

const FALLBACK_CATEGORY_IMAGE =
  'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=300&auto=format&fit=crop&q=80';

export const CategoryView: React.FC = () => {
  const {
    allCategories,
    categoriesMeta,
    products,
    setSelectedCategory,
    setActiveTab,
  } = useCatalog();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<CategorySortOption>('count-desc');

  const handleSelectCategory = (catName: string) => {
    setSelectedCategory(catName);
    setActiveTab('beranda');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Compute stats and items with null-safety
  const categoriesWithStats = useMemo(() => {
    return allCategories.map((catName) => {
      const safeCatName = String(catName || '').trim();
      const meta = (categoriesMeta || []).find(
        (c) => (c?.nama || '').toLowerCase().trim() === safeCatName.toLowerCase()
      );
      const productCount = (products || []).filter(
        (p) => String(p?.kategori || '').toLowerCase().trim() === safeCatName.toLowerCase()
      ).length;

      const iconUrl = meta?.iconUrl && meta.iconUrl.trim() !== '' ? meta.iconUrl : FALLBACK_CATEGORY_IMAGE;
      const desc =
        meta?.deskripsi && meta.deskripsi.trim() !== ''
          ? meta.deskripsi
          : `Koleksi lengkap produk ${safeCatName} dengan standar industri berkualitas tinggi.`;

      return {
        name: safeCatName,
        meta,
        productCount,
        iconUrl,
        desc,
      };
    });
  }, [allCategories, categoriesMeta, products]);

  // Filter and Sort Categories
  const filteredAndSortedCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const filtered = categoriesWithStats.filter((item) => {
      if (!q) return true;
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.desc.toLowerCase().includes(q);
      return matchName || matchDesc;
    });

    return filtered.sort((a, b) => {
      if (sortOption === 'count-desc') {
        if (b.productCount !== a.productCount) {
          return b.productCount - a.productCount;
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }
      if (sortOption === 'count-asc') {
        if (a.productCount !== b.productCount) {
          return a.productCount - b.productCount;
        }
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }
      if (sortOption === 'name-asc') {
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
      }
      if (sortOption === 'name-desc') {
        return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });
      }
      return 0;
    });
  }, [categoriesWithStats, searchQuery, sortOption]);

  const totalProductsCount = products ? products.length : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-200">
      {/* Header & Meta Summary Banner */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#135A62]/10 text-[#135A62] text-xs font-bold tracking-wide">
          <Layers className="w-4 h-4" />
          <span>Eksplorasi Berdasarkan Kategori</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Kategori Produk & Spesialisasi
        </h1>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Temukan ragam komponen teknik, fabrikasi, baut baja, alat keselamatan kerja, dan perlengkapan industri sesuai kebutuhan spesifikasi proyek Anda.
        </p>

        {/* Real-time Stat Badges */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-slate-200 shadow-xs font-semibold text-slate-700">
            <span className="w-2.5 h-2.5 rounded-full bg-[#135A62] animate-pulse" />
            <span>
              Total <strong className="text-slate-900 font-bold">{allCategories.length}</strong> Kategori Terdaftar
            </span>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-800 shadow-xs font-semibold">
            <Package className="w-4 h-4 text-emerald-600" />
            <span>
              <strong className="font-bold">{totalProductsCount.toLocaleString('id-ID')}+</strong> Total Produk Aktif
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Controls Toolbar (Quick Search & Sort) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Field */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            id="category-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama kategori atau spesifikasi..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#135A62] focus:border-transparent transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              id="clear-category-search-btn"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Hapus pencarian"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort Filter Selector */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 whitespace-nowrap">
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            <span>Urutkan:</span>
          </div>
          <select
            id="category-sort-select"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as CategorySortOption)}
            aria-label="Urutkan Kategori"
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#135A62] cursor-pointer"
          >
            <option value="count-desc">Produk Terbanyak</option>
            <option value="count-asc">Produk Paling Sedikit</option>
            <option value="name-asc">Nama (A - Z)</option>
            <option value="name-desc">Nama (Z - A)</option>
          </select>
        </div>
      </div>

      {/* Categories Grid or Empty State */}
      {filteredAndSortedCategories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedCategories.map((item) => (
            <div
              key={item.name}
              id={`cat-card-${item.name.replace(/\s+/g, '-').toLowerCase()}`}
              onClick={() => handleSelectCategory(item.name)}
              className="group bg-white rounded-2xl border border-slate-200 hover:border-[#135A62]/60 p-5 shadow-xs hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Category Icon / Image with Null-Safety & Fallback */}
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-xs group-hover:scale-105 transition-transform">
                  <img
                    src={item.iconUrl}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = FALLBACK_CATEGORY_IMAGE;
                    }}
                  />
                </div>

                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900 text-base group-hover:text-[#135A62] transition-colors leading-snug">
                      {item.name}
                    </h3>
                    <span className="shrink-0 text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full">
                      {item.productCount.toLocaleString('id-ID')} Produk
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2.5 leading-relaxed line-clamp-3">
                    {item.desc}
                  </p>
                </div>
              </div>

              <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#135A62] group-hover:translate-x-1 transition-transform">
                <span>Lihat Semua Produk</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty Search Results */
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-5 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
            <Search className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-bold text-slate-800 text-lg">Kategori Tidak Ditemukan</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tidak ada kategori yang cocok dengan kata kunci &ldquo;
              <strong className="text-slate-700 font-semibold">{searchQuery}</strong>&rdquo;.
            </p>
          </div>
          <button
            type="button"
            id="reset-category-filter-btn"
            onClick={() => setSearchQuery('')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Pencarian Kategori</span>
          </button>
        </div>
      )}
    </div>
  );
};
