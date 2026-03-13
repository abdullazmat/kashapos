"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Barcode from "react-barcode";
import { Scan, RefreshCw, Save, Printer, Wand2 } from "lucide-react";

interface Product {
  _id: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
}

function ean13CheckDigit(value12: string) {
  const digits = value12.split("").map((d) => Number(d));
  const sum = digits.reduce(
    (acc, n, idx) => acc + n * (idx % 2 === 0 ? 1 : 3),
    0,
  );
  return (10 - (sum % 10)) % 10;
}

function generateEan13(seed = "") {
  const cleanSeed = seed.replace(/\D/g, "");
  let base = cleanSeed.slice(0, 12);
  while (base.length < 12) {
    base += Math.floor(Math.random() * 10).toString();
  }
  const check = ean13CheckDigit(base);
  return `${base}${check}`;
}

export default function BarcodeGeneratorPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [barcodeValue, setBarcodeValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const params = new URLSearchParams({ limit: "500" });
      if (search.trim()) params.set("search", search.trim());
      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Failed to load products");
        return;
      }
      setProducts(data.products || []);
    } catch {
      setMsg("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const selectedProduct = useMemo(
    () => products.find((product) => product._id === selectedProductId) || null,
    [products, selectedProductId],
  );

  useEffect(() => {
    if (selectedProduct?.barcode) {
      setBarcodeValue(selectedProduct.barcode);
      return;
    }
    if (selectedProduct) {
      setBarcodeValue(generateEan13(selectedProduct.sku));
    }
  }, [selectedProduct]);

  const generateForSelected = () => {
    if (!selectedProduct) return;
    setBarcodeValue(
      generateEan13(selectedProduct.sku + Date.now().toString().slice(-4)),
    );
  };

  const saveBarcode = async () => {
    if (!selectedProduct || !barcodeValue) return;
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/products/${selectedProduct._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode: barcodeValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Failed to save barcode");
        return;
      }
      setMsg(`Barcode saved for ${selectedProduct.name}`);
      await fetchProducts();
    } catch {
      setMsg("Failed to save barcode");
    } finally {
      setSaving(false);
    }
  };

  const generateMissingBarcodes = async () => {
    const missing = products.filter((product) => !product.barcode);
    if (missing.length === 0) {
      setMsg("All loaded products already have barcodes");
      return;
    }

    setBulkBusy(true);
    setMsg("");
    let success = 0;

    for (const product of missing) {
      const code = generateEan13(product.sku + product._id.slice(-6));
      try {
        const res = await fetch(`/api/products/${product._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ barcode: code }),
        });
        if (res.ok) success += 1;
      } catch {
        // Continue bulk run even if one record fails.
      }
    }

    setMsg(`Generated barcodes for ${success} of ${missing.length} products`);
    setBulkBusy(false);
    await fetchProducts();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
            <Scan className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Barcode Generator
            </h1>
            <p className="text-[13px] text-gray-500">
              Generate and assign product barcodes from the same system
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchProducts}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <span className="inline-flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
            </span>
          </button>
          <button
            onClick={generateMissingBarcodes}
            disabled={bulkBusy || loading}
            className="rounded-xl bg-linear-to-r from-blue-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 disabled:opacity-50"
          >
            <span className="inline-flex items-center gap-2">
              <Wand2 className="h-4 w-4" />{" "}
              {bulkBusy ? "Generating..." : "Generate Missing"}
            </span>
          </button>
        </div>
      </div>

      {msg && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {msg}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 lg:col-span-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Search Product
          </label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, SKU, or barcode"
            className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 text-sm"
          />

          <div className="mt-3 max-h-100 overflow-y-auto rounded-xl border border-gray-100">
            {loading ? (
              <div className="p-4 text-sm text-gray-500">
                Loading products...
              </div>
            ) : products.length === 0 ? (
              <div className="p-4 text-sm text-gray-400">No products found</div>
            ) : (
              products.map((product) => (
                <button
                  key={product._id}
                  onClick={() => setSelectedProductId(product._id)}
                  className={`w-full border-b border-gray-50 px-3 py-2.5 text-left last:border-0 ${selectedProductId === product._id ? "bg-blue-50" : "hover:bg-gray-50"}`}
                >
                  <p className="text-sm font-semibold text-gray-800">
                    {product.name}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {product.sku}{" "}
                    {product.barcode ? `• ${product.barcode}` : "• No barcode"}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-5 lg:col-span-2">
          {!selectedProduct ? (
            <div className="flex h-full min-h-75 items-center justify-center text-sm text-gray-400">
              Select a product to generate barcode
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-bold text-gray-900">
                  {selectedProduct.name}
                </p>
                <p className="text-[12px] text-gray-500">
                  SKU: {selectedProduct.sku}
                </p>
              </div>

              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Barcode Value (EAN-13)
                </label>
                <input
                  value={barcodeValue}
                  onChange={(e) =>
                    setBarcodeValue(
                      e.target.value.replace(/\D/g, "").slice(0, 13),
                    )
                  }
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2.5 font-mono text-sm"
                />
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                {barcodeValue && barcodeValue.length >= 12 ? (
                  <div className="overflow-auto bg-white p-3">
                    <Barcode
                      value={
                        barcodeValue.length === 13
                          ? barcodeValue
                          : generateEan13(barcodeValue)
                      }
                      format="EAN13"
                      height={70}
                      width={1.6}
                      displayValue
                    />
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    Enter at least 12 digits to render barcode
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={generateForSelected}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <Wand2 className="h-4 w-4" /> Generate New
                  </span>
                </button>
                <button
                  onClick={saveBarcode}
                  disabled={saving || !barcodeValue}
                  className="rounded-xl bg-linear-to-r from-blue-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <Save className="h-4 w-4" />{" "}
                    {saving ? "Saving..." : "Save to Product"}
                  </span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <span className="inline-flex items-center gap-2">
                    <Printer className="h-4 w-4" /> Print Label
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
