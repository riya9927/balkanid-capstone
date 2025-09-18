import React, { useState, useEffect } from "react";
import axios from "axios";

interface UserStats {
  username: string;
  original_bytes: number;
  deduped_bytes: number;
  savings_bytes: number;
  savings_percent: number;
}

interface GlobalStats {
  original_bytes: number;
  deduped_bytes: number;
  savings_bytes: number;
  savings_percent: number;
}

export default function Statistics() {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);

  const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
    headers: { "X-User": localStorage.getItem("username") || "" },
  });

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      const [userRes, globalRes] = await Promise.all([
        api.get("/stats"),
        api.get("/storage/stats")
      ]);
      setUserStats(userRes.data);
      setGlobalStats(globalRes.data);
    } catch (error) {
      console.error("Failed to fetch statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatPercentage = (percent: number) => {
    return percent.toFixed(2) + "%";
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading statistics...</p>
      </div>
    );
  }

  return (
    <div className="statistics-container">
      <div className="statistics-header">
        <h1 className="statistics-title">Storage Statistics</h1>
        <p className="statistics-subtitle">
          View your storage usage and system-wide deduplication savings
        </p>
      </div>

      {/* User Statistics */}
      {userStats && (
        <div className="card mb-8">
          <div className="card-header">
            <h2 className="text-xl font-semibold">Your Storage Usage</h2>
            <div className="user-badge">
              👤 {userStats.username}
            </div>
          </div>
          <div className="card-body">
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-icon">💾</div>
                <div className="stat-content">
                  <div className="stat-value">{formatFileSize(userStats.original_bytes)}</div>
                  <div className="stat-label">Original Storage</div>
                  <div className="stat-description">
                    Total size of all your uploaded files
                  </div>
                </div>
              </div>

              <div className="stat-item">
                <div className="stat-icon">🗜️</div>
                <div className="stat-content">
                  <div className="stat-value">{formatFileSize(userStats.deduped_bytes)}</div>
                  <div className="stat-label">Actual Storage</div>
                  <div className="stat-description">
                    Storage used after deduplication
                  </div>
                </div>
              </div>

              <div className="stat-item">
                <div className="stat-icon">💰</div>
                <div className="stat-content">
                  <div className="stat-value">{formatFileSize(userStats.savings_bytes)}</div>
                  <div className="stat-label">Space Saved</div>
                  <div className="stat-description">
                    Storage saved through deduplication
                  </div>
                </div>
              </div>

              <div className="stat-item">
                <div className="stat-icon">📊</div>
                <div className="stat-content">
                  <div className="stat-value">{formatPercentage(userStats.savings_percent)}</div>
                  <div className="stat-label">Savings Rate</div>
                  <div className="stat-description">
                    Percentage of storage saved
                  </div>
                </div>
              </div>
            </div>

            {/* Savings Visualization */}
            <div className="savings-chart">
              <h3 className="chart-title">Storage Breakdown</h3>
              <div className="chart-container">
                <div className="chart-bar">
                  <div 
                    className="chart-segment original"
                    style={{ 
                      width: userStats.original_bytes > 0 ? '100%' : '0%'
                    }}
                  >
                    <span className="chart-label">Original: {formatFileSize(userStats.original_bytes)}</span>
                  </div>
                </div>
                <div className="chart-bar">
                  <div 
                    className="chart-segment actual"
                    style={{ 
                      width: userStats.original_bytes > 0 
                        ? `${(userStats.deduped_bytes / userStats.original_bytes) * 100}%` 
                        : '0%'
                    }}
                  >
                    <span className="chart-label">Actual: {formatFileSize(userStats.deduped_bytes)}</span>
                  </div>
                  <div 
                    className="chart-segment saved"
                    style={{ 
                      width: userStats.original_bytes > 0 
                        ? `${(userStats.savings_bytes / userStats.original_bytes) * 100}%` 
                        : '0%'
                    }}
                  >
                    <span className="chart-label">Saved: {formatFileSize(userStats.savings_bytes)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Statistics */}
      {globalStats && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold">System-Wide Statistics</h2>
            <div className="global-badge">
              🌐 Global
            </div>
          </div>
          <div className="card-body">
            <div className="stats-grid">
              <div className="stat-item global">
                <div className="stat-icon">🗄️</div>
                <div className="stat-content">
                  <div className="stat-value">{formatFileSize(globalStats.original_bytes)}</div>
                  <div className="stat-label">Total Original</div>
                  <div className="stat-description">
                    Combined size of all uploaded files
                  </div>
                </div>
              </div>

              <div className="stat-item global">
                <div className="stat-icon">💽</div>
                <div className="stat-content">
                  <div className="stat-value">{formatFileSize(globalStats.deduped_bytes)}</div>
                  <div className="stat-label">Actual Storage</div>
                  <div className="stat-description">
                    Physical storage used on disk
                  </div>
                </div>
              </div>

              <div className="stat-item global">
                <div className="stat-icon">🎯</div>
                <div className="stat-content">
                  <div className="stat-value">{formatFileSize(globalStats.savings_bytes)}</div>
                  <div className="stat-label">Total Savings</div>
                  <div className="stat-description">
                    Storage saved across all users
                  </div>
                </div>
              </div>

              <div className="stat-item global">
                <div className="stat-icon">⚡</div>
                <div className="stat-content">
                  <div className="stat-value">{formatPercentage(globalStats.savings_percent)}</div>
                  <div className="stat-label">Efficiency</div>
                  <div className="stat-description">
                    System deduplication efficiency
                  </div>
                </div>
              </div>
            </div>

            {/* Global Efficiency Indicator */}
            <div className="efficiency-indicator">
              <h3 className="indicator-title">Deduplication Efficiency</h3>
              <div className="efficiency-bar">
                <div 
                  className="efficiency-fill"
                  style={{ width: `${Math.min(globalStats.savings_percent, 100)}%` }}
                ></div>
              </div>
              <div className="efficiency-labels">
                <span>0%</span>
                <span className="efficiency-current">{formatPercentage(globalStats.savings_percent)}</span>
                <span>100%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .statistics-container {
          max-width: 1200px;
          margin: 0 auto;
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: var(--space-4);
        }

        .statistics-header {
          margin-bottom: var(--space-8);
          text-align: center;
        }

        .statistics-title {
          font-size: 2rem;
          font-weight: 700;
          color: var(--secondary-800);
          margin-bottom: var(--space-2);
        }

        .statistics-subtitle {
          color: var(--secondary-600);
          font-size: 1rem;
        }

        .user-badge,
        .global-badge {
          font-size: 0.875rem;
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-md);
          font-weight: 500;
        }

        .user-badge {
          background: var(--primary-100);
          color: var(--primary-700);
        }

        .global-badge {
          background: var(--success-100);
          color: var(--success-700);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: var(--space-6);
          margin-bottom: var(--space-8);
        }

        .stat-item {
          display: flex;
          align-items: flex-start;
          gap: var(--space-4);
          padding: var(--space-6);
          background: var(--secondary-50);
          border-radius: var(--radius-lg);
          border: 1px solid var(--secondary-200);
          transition: all var(--transition-normal);
        }

        .stat-item:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
        }

        .stat-item.global {
          background: var(--success-50);
          border-color: var(--success-200);
        }

        .stat-icon {
          font-size: 2rem;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
        }

        .stat-content {
          flex: 1;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--secondary-800);
          margin-bottom: var(--space-1);
        }

        .stat-label {
          font-weight: 600;
          color: var(--secondary-700);
          margin-bottom: var(--space-2);
        }

        .stat-description {
          font-size: 0.875rem;
          color: var(--secondary-600);
          line-height: 1.4;
        }

        .savings-chart {
          background: white;
          padding: var(--space-6);
          border-radius: var(--radius-lg);
          border: 1px solid var(--secondary-200);
        }

        .chart-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--secondary-800);
          margin-bottom: var(--space-4);
        }

        .chart-container {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .chart-bar {
          display: flex;
          height: 40px;
          border-radius: var(--radius-md);
          overflow: hidden;
          background: var(--secondary-100);
        }

        .chart-segment {
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 500;
          font-size: 0.875rem;
          transition: all var(--transition-normal);
        }

        .chart-segment.original {
          background: var(--secondary-400);
        }

        .chart-segment.actual {
          background: var(--primary-500);
        }

        .chart-segment.saved {
          background: var(--success-500);
        }

        .chart-label {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding: 0 var(--space-2);
        }

        .efficiency-indicator {
          background: white;
          padding: var(--space-6);
          border-radius: var(--radius-lg);
          border: 1px solid var(--secondary-200);
        }

        .indicator-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--secondary-800);
          margin-bottom: var(--space-4);
          text-align: center;
        }

        .efficiency-bar {
          height: 20px;
          background: var(--secondary-200);
          border-radius: var(--radius-lg);
          overflow: hidden;
          margin-bottom: var(--space-3);
        }

        .efficiency-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--success-400), var(--success-600));
          transition: width var(--transition-slow);
        }

        .efficiency-labels {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
          color: var(--secondary-600);
        }

        .efficiency-current {
          font-weight: 600;
          color: var(--success-600);
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: 1fr;
            gap: var(--space-4);
          }

          .stat-item {
            padding: var(--space-4);
          }

          .stat-icon {
            width: 50px;
            height: 50px;
            font-size: 1.5rem;
          }

          .stat-value {
            font-size: 1.25rem;
          }

          .chart-segment {
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}