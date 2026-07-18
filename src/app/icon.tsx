import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(145deg, #FFF000 0%, #FFD900 55%, #FF9D00 100%)',
          borderRadius: 7,
          color: '#111317',
          fontSize: 15,
          fontWeight: 900,
          fontStyle: 'italic',
          letterSpacing: -1,
        }}
      >
        DU
      </div>
    ),
    size,
  );
}
