
import React, { useEffect, useState } from "react";
import api from "../api";
import { HardDrive, TrendingUp, Zap, CheckCircle } from "lucide-react";

export default function Stats() {
  const [global, setGlobal] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGlobal();
    fetchUser();
  }, []);

  const fetchGlobal = async () => {
    try {
      const res = await api.get("/storage/stats");
      setGlobal(res.data);
    } catch (err) {
      console.error("Failed to fetch global stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUser = async () => {
    try {
      const res = await api.get("/stats");
      setUser(res.data);
    } catch (err) {
      console.error("Failed to fetch user stats:", err);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                  <div className="space-y-2">
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top metrics - Only show if data is available */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Storage Used - from global stats */}
        {global?.deduped_bytes !== undefined && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <HardDrive className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatBytes(global.deduped_bytes)}
                </p>
                <p className="text-sm text-gray-500">Storage Used</p>
                <p className="text-xs text-gray-400">After deduplication</p>
              </div>
            </div>
          </div>
        )}

        {/* Space Saved - from global stats */}
        {global?.savings_bytes !== undefined && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-cyan-600" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatBytes(global.savings_bytes)}
                  </p>
                  {global.savings_percent > 0 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      +{global.savings_percent.toFixed(1)}%
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">Space Saved</p>
                <p className="text-xs text-gray-400">Through deduplication</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detailed breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Storage Breakdown - Only show if global data exists */}
        {global && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <HardDrive className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Storage Breakdown</h3>
            </div>

            <div className="space-y-4">
              {/* Progress bar - calculate percentage from data */}
              {global.original_bytes > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Storage Efficiency</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatBytes(global.deduped_bytes)} of {formatBytes(global.original_bytes)} original
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ 
                        width: `${((global.deduped_bytes / global.original_bytes) * 100).toFixed(1)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{((global.deduped_bytes / global.original_bytes) * 100).toFixed(1)}% used</span>
                    <span>{formatBytes(global.savings_bytes)} saved</span>
                  </div>
                </div>
              )}

              {/* Stats list */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex justify-between">
                  <span className="text-gray-600">Original Size</span>
                  <span className="font-medium text-gray-900">{formatBytes(global.original_bytes)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">After Deduplication</span>
                  <span className="font-medium text-gray-900">{formatBytes(global.deduped_bytes)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Space Saved</span>
                  <span className="font-medium text-cyan-600">
                    {formatBytes(global.savings_bytes)} ({global.savings_percent.toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Personal Stats - Only show if user data exists */}
        {user && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center space-x-2 mb-6">
              <Zap className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Your Personal Stats</h3>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">User:</span>
                    <span className="font-medium text-gray-900">{user.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Original Size:</span>
                    <span className="font-medium text-gray-900">{formatBytes(user.original_bytes || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">After Deduplication:</span>
                    <span className="font-medium text-gray-900">{formatBytes(user.deduped_bytes || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Savings:</span>
                    <span className="font-medium text-cyan-600">
                      {formatBytes(user.savings_bytes || 0)} ({user.savings_percent?.toFixed(2) || 0}%)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Deduplication Insights - Only show if there are actual savings */}
      {global?.savings_bytes > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <TrendingUp className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Deduplication Insights</h3>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-green-900 mb-2">Deduplication Active</h4>
                <p className="text-green-800 text-sm">
                  Your duplicate file detection has saved you{" "}
                  <span className="font-semibold">{formatBytes(global.savings_bytes)}</span>{" "}
                  ({global.savings_percent.toFixed(1)}% of original storage). 
                  This efficient storage usage helps optimize your storage space.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Show message if no data available */}
      {!global && !user && !loading && (
        <div className="text-center py-12">
          <HardDrive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No statistics data available</p>
          <p className="text-sm text-gray-400 mt-2">Upload some files to see your storage statistics</p>
        </div>
      )}
    </div>
  );
}