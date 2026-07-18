import { ImageResponse } from 'next/og';
import { DOMIU_OFFICIAL_LOGO_DATA_URI } from '@/lib/brand-assets';

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
          alignItems: 'flex-start',
          justifyContent: 'center',
          overflow: 'hidden',
          background: 'linear-gradient(145deg, #FFFDF0 0%, #FFE55C 100%)',
          borderRadius: 7,
          padding: 2,
        }}
      >
        <img
          src={DOMIU_OFFICIAL_LOGO_DATA_URI}
          width="32"
          height="32"
          alt="DomiU"
          style={{ width: 32, height: 32, objectFit: 'cover', objectPosition: 'top center' }}
        />
      </div>
    ),
    size,
  );
}
