// ═══════════════════════════════════════════════
// Triwara POS — Stress Test & Performance Benchmark Modal
// ═══════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { stressTestService } from '../../services/stress-test.service';
import type { IStressProgress, IBenchmarkResult } from '../../services/stress-test.service';

interface StressTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StressTestModal: React.FC<StressTestModalProps> = ({ isOpen, onClose }) => {
  const [selectedCount, setSelectedCount] = useState<number>(10000);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [progress, setProgress] = useState<IStressProgress | null>(null);
  const [benchmark, setBenchmark] = useState<IBenchmarkResult | null>(null);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      loadBenchmarks();
    }
  }, [isOpen]);

  const loadBenchmarks = async () => {
    try {
      const res = await stressTestService.runBenchmarks();
      setBenchmark(res);
    } catch (err) {
      console.error('Failed to run benchmarks:', err);
    }
  };

  const handleStartGeneration = async () => {
    setIsRunning(true);
    setFeedback('');
    setProgress({
      current: 0,
      total: selectedCount,
      percent: 0,
      speedTrxPerSec: 0,
      elapsedSeconds: 0,
    });

    const preventUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', preventUnload);

    try {
      const { durationMs, totalCreated } = await stressTestService.generateDummyOrders(
        selectedCount,
        (p) => setProgress(p)
      );

      setFeedback(
        `Berhasil membuat ${totalCreated.toLocaleString('id-ID')} transaksi dalam ${(durationMs / 1000).toFixed(1)} detik!`
      );
      await loadBenchmarks();
    } catch (err) {
      setFeedback('Gagal membuat data dummy: ' + (err as Error).message);
    } finally {
      window.removeEventListener('beforeunload', preventUnload);
      setIsRunning(false);
      setProgress(null);
    }
  };

  const handleCleanDummy = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus seluruh data transaksi dummy?')) return;
    setIsCleaning(true);
    setFeedback('');

    try {
      const deleted = await stressTestService.cleanDummyOrders();
      setFeedback(`Berhasil menghapus ${deleted.toLocaleString('id-ID')} data transaksi dummy.`);
      await loadBenchmarks();
    } catch (err) {
      setFeedback('Gagal menghapus data dummy: ' + (err as Error).message);
    } finally {
      setIsCleaning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay">
      <div className="settings-modal-card" style={{ maxWidth: '640px', width: '92%' }}>
        <div className="settings-modal-header">
          <div>
            <h3 className="settings-modal-title">⚡ Stress Test &amp; Benchmark</h3>
            <p style={{ color: '#a1a1aa', fontSize: '12px', margin: '4px 0 0 0' }}>
              Uji ketahanan sistem pada 10.000 hingga 1.000.000 transaksi langsung di perangkat ini.
            </p>
          </div>
          <button
            type="button"
            className="settings-modal-close"
            onClick={onClose}
            disabled={isRunning || isCleaning}
          >
            ✕
          </button>
        </div>

        <div className="settings-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Live Benchmark Metrics Dashboard */}
          {benchmark && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '10px',
                backgroundColor: '#18181b',
                padding: '14px',
                borderRadius: '8px',
                border: '1px solid #27272a',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: '#a1a1aa', display: 'block' }}>Total Transaksi</span>
                <strong style={{ fontSize: '16px', color: '#f4f4f5' }}>
                  {benchmark.totalOrders.toLocaleString('id-ID')}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#a1a1aa', display: 'block' }}>Storage HP</span>
                <strong style={{ fontSize: '16px', color: '#38bdf8' }}>
                  {benchmark.storageEstimateMb > 0 ? `${benchmark.storageEstimateMb} MB` : 'N/A'}
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#a1a1aa', display: 'block' }}>Paginasi Riwayat</span>
                <strong style={{ fontSize: '16px', color: '#4ade80' }}>
                  {benchmark.paginationLatencyMs} ms
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: '#a1a1aa', display: 'block' }}>Laporan 1 Tahun</span>
                <strong style={{ fontSize: '16px', color: '#facc15' }}>
                  {benchmark.reportLatencyMs} ms
                </strong>
              </div>
            </div>
          )}

          {feedback && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: feedback.includes('Gagal') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                color: feedback.includes('Gagal') ? '#fca5a5' : '#86efac',
                borderRadius: '6px',
                fontSize: '13px',
              }}
            >
              {feedback}
            </div>
          )}

          {/* Progress Bar Display */}
          {isRunning && progress && (
            <div
              style={{
                padding: '14px',
                backgroundColor: '#18181b',
                borderRadius: '8px',
                border: '1px solid #3b82f6',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#93c5fd', fontWeight: 600 }}>
                  Memproses {progress.current.toLocaleString('id-ID')} / {progress.total.toLocaleString('id-ID')} ({progress.percent}%)
                </span>
                <span style={{ color: '#a1a1aa' }}>
                  {progress.speedTrxPerSec.toLocaleString('id-ID')} trx/detik
                </span>
              </div>
              <div style={{ width: '100%', height: '10px', backgroundColor: '#27272a', borderRadius: '5px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${progress.percent}%`,
                    height: '100%',
                    backgroundColor: '#3b82f6',
                    transition: 'width 0.2s linear',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: '#71717a' }}>
                <span>Menjaga layar tetap aktif (WakeLock)...</span>
                <span>Waktu: {progress.elapsedSeconds}s</span>
              </div>
            </div>
          )}

          {/* Preset Buttons */}
          <div>
            <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
              Pilih Jumlah Data Transaksi Dummy:
            </label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[1000, 5000, 10000, 50000, 100000].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setSelectedCount(count)}
                  disabled={isRunning || isCleaning}
                  style={{
                    flex: '1 1 80px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: selectedCount === count ? '2px solid #3b82f6' : '1px solid #3f3f46',
                    backgroundColor: selectedCount === count ? '#1e3a8a' : '#27272a',
                    color: '#f4f4f5',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {`${count / 1000} Ribu`}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              className="settings-btn-primary"
              style={{ flex: 2 }}
              onClick={handleStartGeneration}
              disabled={isRunning || isCleaning}
            >
              {isRunning ? '⏳ Sedang Memproses...' : `🚀 Buat ${selectedCount.toLocaleString('id-ID')} Data Dummy`}
            </button>
            <button
              type="button"
              className="settings-btn-secondary"
              style={{ flex: 1 }}
              onClick={loadBenchmarks}
              disabled={isRunning || isCleaning}
            >
              🔄 Uji Stopwatch
            </button>
          </div>

          {/* Clean Dummy Section */}
          <div style={{ marginTop: '10px', paddingTop: '14px', borderTop: '1px solid #27272a' }}>
            <button
              type="button"
              onClick={handleCleanDummy}
              disabled={isRunning || isCleaning}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #7f1d1d',
                backgroundColor: 'rgba(127, 29, 29, 0.25)',
                color: '#f87171',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {isCleaning ? '⏳ Sedang Menghapus...' : '🗑️ Bersihkan Seluruh Data Dummy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
