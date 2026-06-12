import { createRouter as createTanstackRouter } from '@tanstack/react-router'

// Import the generated route tree
import { routeTree } from './routeTree.gen.ts'

// import './styles.css'

// Router factory — the Start plugin expects this exact export name; the
// Register interface is generated into routeTree.gen.ts now.
export const getRouter = () => {
	const router = createTanstackRouter({
		routeTree,
		context: {
			z: undefined,
			session: null,
		},
		scrollRestoration: true,
	})
	return router
}
