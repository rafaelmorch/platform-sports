'use client';

import { useRouter } from 'next/navigation';

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      type='button'
      onClick={() => router.back()}
      style={{
        border: 'none',
        background: 'transparent',
        color: '#e5e7eb',
        fontSize: '14px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginBottom: '12px',
      }}
    >
      ← Voltar
    </button>
  );
}