import React, { ReactElement, useCallback, useEffect, useState } from "react";
import customFetch from "../axios/custom";
import { useAppDispatch, useAppSelector } from "../hooks";
import {
  setShowingProducts,
  setTotalProducts,
} from "../features/shop/shopSlice";

const STATUS_ORDER: Record<string, number> = {
  "for-sale": 1,
  "sold": 2,
  "not-for-sale": 3,
};

const ProductGridWrapper = ({
  searchQuery,
  sortCriteria,
  category,
  page,
  status,
  filters,
  limit,
  children,
}: {
  searchQuery?: string;
  sortCriteria?: string;
  category?: string;
  page?: number;
  status?: string;
  filters?: { sizes: string[]; types: string[] };
  limit?: number;
  children:
    | ReactElement<{ products: Product[] }>
    | ReactElement<{ products: Product[] }>[];
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const { totalProducts } = useAppSelector((state) => state.shop);
  const dispatch = useAppDispatch();

  const getSearchedProducts = useCallback(
    async (query: string, sort: string, page: number, statusFilter?: string, productFilters?: { sizes: string[]; types: string[] }) => {
      const response = await customFetch.get("/products");
      let searchedProducts: Product[] = response.data;

      // 🔍 Search
      if (query) {
        searchedProducts = searchedProducts.filter((product) =>
          product.title.toLowerCase().includes(query.toLowerCase())
        );
      }

      // 🗂 Category filter
      if (category) {
        searchedProducts = searchedProducts.filter(
          (product) => product.category === category
        );
      }

      // 🏷️ Status filter
      if (statusFilter) {
        searchedProducts = searchedProducts.filter(
          (product) => product.status === statusFilter
        );
      }

// 📏 Size filter (case-insensitive)
if (productFilters?.sizes && productFilters.sizes.length > 0) {
  searchedProducts = searchedProducts.filter((product) =>
    productFilters.sizes.some(size => 
      size.toLowerCase() === product.size?.toLowerCase()
    )
  );
}

// 👕 Type filter (case-insensitive)
if (productFilters?.types && productFilters.types.length > 0) {
  searchedProducts = searchedProducts.filter((product) =>
    productFilters.types.some(type => 
      type.toLowerCase() === product.category?.toLowerCase()
    )
  );
}

      // 📊 Total count
      if (totalProducts !== searchedProducts.length) {
        dispatch(setTotalProducts(searchedProducts.length));
      }

      // ⭐ STATUS PRIORITY SORT (only if no status filter)
      if (!statusFilter) {
        searchedProducts.sort(
          (a, b) =>
            STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
        );
      }

      // 💲 Price sorting (optional, AFTER status)
      if (sort === "price-asc") {
        searchedProducts.sort((a, b) => a.price - b.price);
      }

      if (sort === "price-desc") {
        searchedProducts.sort((a, b) => b.price - a.price);
      }

      // 📄 Pagination / limits
      let visibleProducts = searchedProducts;

      if (limit) {
        visibleProducts = searchedProducts.slice(0, limit);
      } else if (page) {
        visibleProducts = searchedProducts.slice(0, page * 9);
      }

      setProducts(visibleProducts);
      dispatch(setShowingProducts(visibleProducts.length));
    },
    [category, dispatch, limit]
  );

  useEffect(() => {
    getSearchedProducts(searchQuery || "", sortCriteria || "", page || 1, status, filters);
  }, [searchQuery, sortCriteria, page, status, filters, getSearchedProducts]);

  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { products });
    }
    return null;
  });

  return childrenWithProps;
};

export default ProductGridWrapper;