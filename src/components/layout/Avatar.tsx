import React from 'react';
import { Genero } from '../../types';

interface AvatarProps {
  genero: Genero;
  name: string;
  className?: string;
}

export default function Avatar({ genero, name, className = 'w-10 h-10' }: AvatarProps) {
  const label = `Foto de perfil de ${name}`;

  if (genero === 'masculino') {
    return (
      <svg viewBox="0 0 40 40" role="img" aria-label={label} className={`${className} rounded-full shrink-0`}>
        <circle cx="20" cy="20" r="20" fill="#CDEBF6" />
        <g fill="#1B7797">
          <path d="M20 24c-6.5 0-11 3.4-11 9v3h22v-3c0-5.6-4.5-9-11-9z" />
          <circle cx="20" cy="15" r="7" />
          <path d="M13.2 12.5a6.8 6.8 0 0 1 13.6 0c0 .6-.1 1.1-.2 1.6-1-2.6-3.6-4.4-6.6-4.4s-5.6 1.8-6.6 4.4c-.1-.5-.2-1-.2-1.6z" />
        </g>
      </svg>
    );
  }

  if (genero === 'feminino') {
    return (
      <svg viewBox="0 0 40 40" role="img" aria-label={label} className={`${className} rounded-full shrink-0`}>
        <circle cx="20" cy="20" r="20" fill="#FFDFC7" />
        <g fill="#B8560F">
          <path d="M20 24c-6.5 0-11 3.4-11 9v3h22v-3c0-5.6-4.5-9-11-9z" />
          <path d="M11.5 17c0-5 3.8-9 8.5-9s8.5 4 8.5 9c0 2.6-.6 5-2 6.8-.3-1-.5-2.2-.5-3.3 0-.9-.7-1.6-1.6-1.6-1 0-1.7-.6-1.9-1.5a12 12 0 0 1-.3-2c0-.5-.4-.9-.9-.9-2.2 0-6.4.6-8.3 3.1a10 10 0 0 1-1.5-.5c-.1-.6-.1-1.2 0-1.1z" />
          <circle cx="20" cy="16" r="6.6" />
          <path d="M12 15.5c1.4-3.6 4.4-4.5 8-4.5s6.6.9 8 4.5c-1-.3-2-.5-2-.5-1.6-2.2-3.9-3-6-3s-4.4.8-6 3c0 0-1 .2-2 .5z" />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 40 40" role="img" aria-label={label} className={`${className} rounded-full shrink-0`}>
      <circle cx="20" cy="20" r="20" fill="#E6E8EA" />
      <g fill="#737780">
        <path d="M20 24c-6.5 0-11 3.4-11 9v3h22v-3c0-5.6-4.5-9-11-9z" />
        <circle cx="20" cy="15" r="7" />
      </g>
    </svg>
  );
}
