"use client"

import { useState, useRef } from 'react';

export default function AudioTestButton() {
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [testResult, setTestResult] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const unlockAudio = async () => {
    setTestResult('🔄 Intentando desbloquear...');
    
    if (!audioRef.current) {
      audioRef.current = new Audio('/ding.mp3');
      audioRef.current.volume = 1.0;
    }

    try {
      await audioRef.current.play();
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setAudioUnlocked(true);
      setTestResult('✅ Audio desbloqueado exitosamente');
    } catch (err) {
      setTestResult(`❌ Error: ${err}`);
    }
  };

  const playSound = async () => {
    if (!audioRef.current) {
      setTestResult('❌ Audio no inicializado');
      return;
    }

    if (!audioUnlocked) {
      setTestResult('⚠️ Audio no desbloqueado. Presiona "Desbloquear" primero');
      return;
    }

    setTestResult('🔊 Reproduciendo...');
    
    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      setTestResult('✅ ¡Sonido reproducido!');
      
      // Vibración también
      if (navigator.vibrate) {
        navigator.vibrate([500, 200, 500]);
      }
    } catch (err) {
      setTestResult(`❌ Error reproduciendo: ${err}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔔</div>
          <h1 className="text-3xl font-black text-gray-900 mb-2">
            Test de Audio
          </h1>
          <p className="text-gray-500 text-sm">
            Prueba si el audio funciona en tu navegador
          </p>
        </div>

        <div className="space-y-4">
          {/* Paso 1: Desbloquear */}
          <div className={`p-4 rounded-2xl border-2 ${
            audioUnlocked 
              ? 'bg-green-50 border-green-300' 
              : 'bg-gray-50 border-gray-300'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-bold text-lg">
                  Paso 1: Desbloquear
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Los navegadores requieren interacción
                </div>
              </div>
              {audioUnlocked ? (
                <div className="text-3xl">✅</div>
              ) : (
                <div className="text-3xl">🔒</div>
              )}
            </div>
            <button
              onClick={unlockAudio}
              disabled={audioUnlocked}
              className="w-full bg-blue-500 text-white font-bold py-3 rounded-xl hover:bg-blue-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {audioUnlocked ? 'Desbloqueado ✓' : 'Desbloquear Audio'}
            </button>
          </div>

          {/* Paso 2: Reproducir */}
          <div className={`p-4 rounded-2xl border-2 ${
            audioUnlocked 
              ? 'bg-orange-50 border-orange-300' 
              : 'bg-gray-100 border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-bold text-lg">
                  Paso 2: Probar Sonido
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  Reproduce el DING manualmente
                </div>
              </div>
              <div className="text-3xl">🔊</div>
            </div>
            <button
              onClick={playSound}
              disabled={!audioUnlocked}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 rounded-xl hover:from-orange-600 hover:to-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reproducir DING!
            </button>
          </div>
        </div>

        {/* Resultado */}
        {testResult && (
          <div className="mt-6 p-4 bg-gray-900 text-white rounded-2xl font-mono text-sm">
            {testResult}
          </div>
        )}

        {/* Información adicional */}
        <div className="mt-6 space-y-2 text-xs text-gray-500">
          <div className="flex items-start gap-2">
            <span>ℹ️</span>
            <span>
              <strong>Navegador:</strong> {navigator.userAgent.includes('Chrome') ? 'Chrome ✓' : navigator.userAgent.includes('Safari') ? 'Safari' : 'Otro'}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span>📱</span>
            <span>
              <strong>Vibración:</strong> {navigator.vibrate ? 'Disponible ✓' : 'No disponible'}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span>🔊</span>
            <span>
              <strong>Audio API:</strong> {typeof Audio !== 'undefined' ? 'Disponible ✓' : 'No disponible'}
            </span>
          </div>
        </div>

        {/* Instrucciones */}
        <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl">
          <div className="font-bold text-blue-900 mb-2 flex items-center gap-2">
            <span>💡</span>
            <span>Si no funciona:</span>
          </div>
          <ul className="text-sm text-blue-800 space-y-1 ml-6 list-disc">
            <li>Verifica que <code className="bg-blue-100 px-1 rounded">/ding.mp3</code> existe</li>
            <li>Prueba en navegador normal (no incógnito)</li>
            <li>Revisa configuración de sonido del navegador</li>
            <li>En iOS: debe estar en modo normal (no silencio)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}