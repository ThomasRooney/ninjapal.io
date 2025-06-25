import { StartClient } from '@tanstack/react-start'
import { hydrateRoot } from 'react-dom/client'
import { StrictMode } from 'react';

import { createRouter } from './router.tsx'

const router = createRouter()

hydrateRoot(document, <StrictMode><StartClient router={router} /></StrictMode>)
