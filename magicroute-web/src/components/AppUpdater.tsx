import { useState, useEffect } from 'react';
import { Download, Sparkles, X, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

export const CURRENT_APP_VERSION = '1.0.0';
export const CURRENT_VERSION_CODE = 1;

interface UpdateInfo {
  version: string;
  versionCode?: number;
  title?: string;
  notes?: string;
  apkUrl: string;
}

export default function AppUpdater() {
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [modalDismissed, setModalDismissed] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);

  const checkVersion = async () => {
    try {
      // 1. Tentar buscar no version.json raw do GitHub
      const res = await fetch(
        'https://raw.githubusercontent.com/John89010130/MagicRoute/main/version.json?t=' + Date.now(),
        { cache: 'no-store' }
      );
      if (res.ok) {
        const data: UpdateInfo = await res.json();
        const remoteVersion = data.version || '1.0.0';
        const remoteCode = data.versionCode || 1;

        if (remoteCode > CURRENT_VERSION_CODE || compareVersions(remoteVersion, CURRENT_APP_VERSION) > 0) {
          setUpdateInfo(data);
          setUpdateAvailable(true);
          return;
        }
      }
    } catch (e) {
      console.log('Falha ao verificar version.json, tentando GitHub Releases API...', e);
    }

    try {
      // 2. Fallback: buscar na API de Releases do GitHub
      const resGit = await fetch(
        'https://api.github.com/repos/John89010130/MagicRoute/releases/latest',
        { cache: 'no-store' }
      );
      if (resGit.ok) {
        const release = await resGit.json();
        const tag = (release.tag_name || '').replace(/^v/, '');
        const apkAsset = release.assets?.find((a: any) => a.name.endsWith('.apk'));
        const apkUrl = apkAsset?.browser_download_url || 'https://github.com/John89010130/MagicRoute/releases/latest/download/app-release.apk';

        if (tag && compareVersions(tag, CURRENT_APP_VERSION) > 0) {
          setUpdateInfo({
            version: tag,
            title: release.name || `Versão ${tag} Disponível`,
            notes: release.body || 'Nova atualização do aplicativo disponível com melhorias e correções.',
            apkUrl: apkUrl
          });
          setUpdateAvailable(true);
        }
      }
    } catch (err) {
      console.log('Erro ao verificar atualização no GitHub:', err);
    }
  };

  useEffect(() => {
    // Executa verificação inicial após 2 segundos do app abrir
    const timer = setTimeout(() => {
      checkVersion();
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const compareVersions = (v1: string, v2: string) => {
    const p1 = v1.split('.').map(Number);
    const p2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const val1 = p1[i] || 0;
      const val2 = p2[i] || 0;
      if (val1 > val2) return 1;
      if (val1 < val2) return -1;
    }
    return 0;
  };

  const handleDownload = () => {
    if (!updateInfo?.apkUrl) return;
    setDownloading(true);

    const targetUrl = updateInfo.apkUrl;

    if (Capacitor.isNativePlatform()) {
      // Abrir download no navegador nativo do Android para acionar o instalador APK
      window.open(targetUrl, '_system');
    } else {
      window.location.href = targetUrl;
    }

    setTimeout(() => {
      setDownloading(false);
    }, 4000);
  };

  if (!updateAvailable || modalDismissed || !updateInfo) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(8px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      animation: 'fadeIn 0.25s ease-out'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        maxWidth: '440px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(140, 44, 245, 0.25)',
        border: '1.5px solid #f1f5f9',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Top Header Decorativo */}
        <div style={{
          background: 'linear-gradient(135deg, #8c2cf5 0%, #6366f1 100%)',
          padding: '28px 24px',
          color: '#ffffff',
          position: 'relative'
        }}>
          <button
            onClick={() => setModalDismissed(true)}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
          >
            <X size={18} />
          </button>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700, marginBottom: '12px' }}>
            <Sparkles size={14} /> Atualização do Aplicativo
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
            Nova Versão {updateInfo.version} Disponível! 🎉
          </h2>
          <p style={{ fontSize: '0.85rem', opacity: 0.9, margin: '6px 0 0 0' }}>
            Versão atual instalada: v{CURRENT_APP_VERSION}
          </p>
        </div>

        {/* Corpo do Modal */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {updateInfo.title && (
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>
              {updateInfo.title}
            </h4>
          )}

          {updateInfo.notes && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '14px',
              fontSize: '0.85rem',
              color: '#475569',
              lineHeight: 1.5,
              whiteSpace: 'pre-line'
            }}>
              {updateInfo.notes}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>
            <ShieldCheck size={16} /> APK oficial verificado e seguro
          </div>

          {/* Botões de Ação */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
            <button
              onClick={handleDownload}
              disabled={downloading}
              style={{
                background: 'linear-gradient(135deg, #8c2cf5 0%, #7c3aed 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                padding: '14px 20px',
                fontSize: '0.95rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(140, 44, 245, 0.35)',
                transition: 'all 0.2s ease'
              }}
            >
              {downloading ? (
                <>
                  <RefreshCw size={20} className="spinner" /> Baixando APK...
                </>
              ) : (
                <>
                  <Download size={20} /> Baixar e Instalar Atualização
                </>
              )}
            </button>

            <button
              onClick={() => setModalDismissed(true)}
              style={{
                background: 'transparent',
                color: '#64748b',
                border: 'none',
                borderRadius: '12px',
                padding: '10px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Lembrar Mais Tarde
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
