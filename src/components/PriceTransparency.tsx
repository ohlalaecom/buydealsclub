import { TrendingDown, ShoppingBag, Tag } from 'lucide-react';

interface PriceTransparencyProps {
  msrpPrice?: number;
  marketPrice?: number;
  dealPrice: number;
  discountPercentage: number;
}

export function PriceTransparency({
  msrpPrice,
  marketPrice,
  dealPrice,
  discountPercentage,
}: PriceTransparencyProps) {
  const savings = (msrpPrice || marketPrice || dealPrice) - dealPrice;

  return (
    <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6 border-2 border-green-200">
      <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <TrendingDown className="w-6 h-6 text-green-600" />
        Price Breakdown
      </h3>

      <div className="space-y-3">
        {msrpPrice && (
          <div className="flex items-center justify-between p-3 bg-white rounded-lg">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-gray-400" />
              <span className="text-gray-600">Manufacturer's Price (MSRP)</span>
            </div>
            <span className="font-semibold text-gray-500 line-through">€{msrpPrice.toFixed(2)}</span>
          </div>
        )}

        {marketPrice && (
          <div className="flex items-center justify-between p-3 bg-white rounded-lg">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-gray-400" />
              <span className="text-gray-600">Average Market Price</span>
            </div>
            <span className="font-semibold text-gray-500 line-through">€{marketPrice.toFixed(2)}</span>
          </div>
        )}

        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            <span className="font-bold">Your Kokaa Price</span>
          </div>
          <span className="text-2xl font-black">€{dealPrice.toFixed(2)}</span>
        </div>

        <div className="pt-3 border-t-2 border-green-200">
          <div className="flex items-center justify-between text-lg">
            <span className="font-bold text-green-700">You Save</span>
            <div className="text-right">
              <span className="text-2xl font-black text-green-700">€{savings.toFixed(2)}</span>
              <span className="ml-2 px-3 py-1 bg-red-500 text-white rounded-full font-bold text-sm">
                {discountPercentage}% OFF
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 p-3 bg-blue-100 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-900 font-semibold flex items-center gap-2">
          <span className="text-xl">✓</span>
          <span>Real prices, real savings. No fake discounts!</span>
        </p>
      </div>
    </div>
  );
}
