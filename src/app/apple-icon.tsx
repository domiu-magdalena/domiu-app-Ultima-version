import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1A1D21',
          borderRadius: 38,
        }}
      >
        <svg width="154" height="154" viewBox="0 0 72 72">
          <path d="M35.8 4.5C19.7 4.5 7 16.6 7 32.2c0 20.3 22.6 34 27.5 36.8a2.7 2.7 0 0 0 2.7 0C42.1 66.2 65 52.5 65 32.2 65 16.6 52 4.5 35.8 4.5Z" fill="#FFC400" />
          <path d="M35.8 11.2c12.5 0 22.2 9.1 22.2 21 0 12-11.3 22-22.2 29-10.7-7-21.8-17-21.8-29 0-11.9 9.5-21 21.8-21Z" fill="#1A1D21" />
          <path d="M7.5 25.3H23M3.8 32.2h15.8M8.8 39.1h12.7" stroke="#FFC400" strokeWidth="3.6" strokeLinecap="round" />
          <circle cx="31.2" cy="42.3" r="6.2" fill="none" stroke="#FFFFFF" strokeWidth="3.2" />
          <circle cx="49.8" cy="42.3" r="6.2" fill="none" stroke="#FFFFFF" strokeWidth="3.2" />
          <path d="M31.2 42.3 37 31.8h8.2l4.6 10.5M36.8 32l-3.7-5.2h7.1l5 5.1M37 31.8l7.1 10.5H31.2M42.4 25.2a4.1 4.1 0 1 0 0-8.2 4.1 4.1 0 0 0 0 8.2Z" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M47.2 29.6h7" stroke="#FFC400" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
    ),
    size,
  );
}
