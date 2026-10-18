import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(cleanup);
window.scrollTo = vi.fn();
URL.createObjectURL = vi.fn(() => 'blob:test-recording');
URL.revokeObjectURL = vi.fn();
