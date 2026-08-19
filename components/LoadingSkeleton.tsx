'use client';

import React from 'react';
import { GlassLoader } from './ui/GlassLoader';

export const LoadingSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return <GlassLoader count={count} type="feed" />;
};
